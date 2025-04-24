import WebSocket, { WebSocketServer } from "ws";
import { Server } from "http";
import { Encryption } from "../security/encryption";
import { randomBytes } from "crypto";
import { db } from "../db";
import { storageNodes, peerConnections, FileChunk, StorageNode } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * P2P Tunnel Server for ShareBuddy
 * 
 * This module handles WebSocket connections between peers
 * for secure file transfer and communication
 */
export class P2PTunnel {
  private wss: WebSocketServer;
  private connectedPeers: Map<string, WebSocket> = new Map();
  private peerMetadata: Map<string, {
    userId: number;
    nodeId: string;
    ip: string;
    lastActive: Date;
  }> = new Map();
  
  constructor(server: Server) {
    // Create WebSocket server on a distinct path to avoid conflicts with Vite HMR
    this.wss = new WebSocketServer({ server, path: '/ws/p2p' });
    this.setupConnectionHandlers();
    
    // Set up periodic peer health checks
    setInterval(() => this.performHealthChecks(), 30000);
    
    console.log("P2P tunnel server initialized");
  }
  
  private setupConnectionHandlers() {
    this.wss.on('connection', (ws, req) => {
      // Generate unique peer ID for this connection
      const peerId = randomBytes(16).toString('hex');
      const ip = req.socket.remoteAddress || "";
      
      console.log(`New peer connected: ${peerId} from ${ip}`);
      this.connectedPeers.set(peerId, ws);
      
      // Handle authentication
      ws.once('message', async (message: string) => {
        try {
          const auth = JSON.parse(message.toString());
          
          if (auth.type === 'auth' && auth.userId && auth.nodeId) {
            // Authenticate the peer
            this.peerMetadata.set(peerId, {
              userId: auth.userId,
              nodeId: auth.nodeId,
              ip,
              lastActive: new Date()
            });
            
            // Update node status in database
            await this.updateNodeStatus(auth.nodeId, 'online', ip);
            
            // Send acknowledgment
            ws.send(JSON.stringify({
              type: 'auth_success',
              peerId,
              timestamp: new Date().toISOString()
            }));
            
            // Set up message handling
            this.setupMessageHandling(ws, peerId);
          } else {
            // Invalid authentication
            ws.send(JSON.stringify({
              type: 'auth_error',
              error: 'Invalid authentication'
            }));
            ws.close();
            this.connectedPeers.delete(peerId);
          }
        } catch (error) {
          console.error('Authentication error:', error);
          ws.close();
          this.connectedPeers.delete(peerId);
        }
      });
      
      // Handle disconnection
      ws.on('close', async () => {
        const metadata = this.peerMetadata.get(peerId);
        if (metadata) {
          // Update node status in database
          await this.updateNodeStatus(metadata.nodeId, 'offline');
          this.peerMetadata.delete(peerId);
        }
        this.connectedPeers.delete(peerId);
        console.log(`Peer disconnected: ${peerId}`);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error for peer ${peerId}:`, error);
      });
    });
  }
  
  private setupMessageHandling(ws: WebSocket, peerId: string) {
    ws.on('message', async (message: Buffer) => {
      try {
        const metadata = this.peerMetadata.get(peerId);
        if (!metadata) return;
        
        // Update last active timestamp
        metadata.lastActive = new Date();
        
        const msg = JSON.parse(message.toString());
        
        // Handle different message types
        switch (msg.type) {
          case 'peer_discovery':
            // Send list of available peers for a specific region or query
            await this.handlePeerDiscovery(ws, metadata.userId, msg.query);
            break;
            
          case 'chunk_request':
            // Forward chunk request to the target peer
            await this.forwardToTargetPeer(msg, metadata);
            break;
            
          case 'chunk_response':
            // Forward chunk data to the requesting peer
            await this.forwardToTargetPeer(msg, metadata);
            break;
            
          case 'heartbeat':
            // Respond to heartbeat to keep connection alive
            ws.send(JSON.stringify({
              type: 'heartbeat_ack',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'status_update':
            // Update node status (storage, availability, etc.)
            await this.updateNodeMetrics(metadata.nodeId, msg.metrics);
            break;
            
          default:
            console.warn(`Unknown message type: ${msg.type}`);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
  }
  
  /**
   * Handle peer discovery requests
   */
  private async handlePeerDiscovery(ws: WebSocket, userId: number, query: any) {
    try {
      // Query the database for available storage nodes
      // Filter by region, reputation, etc. based on the query
      const availableNodes = await db.select().from(storageNodes)
        .where(and(
          eq(storageNodes.status, 'online'),
          // Exclude the requesting user's own nodes
          // eq(storageNodes.userId, 'not', userId)
        ))
        .limit(10);
      
      // Send the list back to the requesting peer
      ws.send(JSON.stringify({
        type: 'peer_discovery_result',
        peers: availableNodes.map(node => ({
          nodeId: node.nodeId,
          reputation: node.reputation,
          storageAvailable: node.storageAvailable,
          geolocation: node.geolocation,
          uptimePercentage: node.uptimePercentage
        })),
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error in peer discovery:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to discover peers',
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  /**
   * Forward a message to the target peer
   */
  private async forwardToTargetPeer(msg: any, senderMetadata: any) {
    try {
      // Find target peer by nodeId
      const targetNodeId = msg.targetNodeId;
      
      // Find the WebSocket connection for this node
      let targetPeerId: string | undefined;
      let targetMetadata: any | undefined;
      
      for (const [id, metadata] of this.peerMetadata.entries()) {
        if (metadata.nodeId === targetNodeId) {
          targetPeerId = id;
          targetMetadata = metadata;
          break;
        }
      }
      
      if (!targetPeerId || !targetMetadata) {
        console.warn(`Target peer not found: ${targetNodeId}`);
        return;
      }
      
      const targetWs = this.connectedPeers.get(targetPeerId);
      if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
        console.warn(`Target peer connection not open: ${targetNodeId}`);
        return;
      }
      
      // Record the connection in the database
      await db.insert(peerConnections).values({
        sourceNodeId: parseInt(senderMetadata.nodeId),
        targetNodeId: parseInt(targetNodeId),
        connectionType: msg.type === 'chunk_request' ? 'download' : 'upload',
        bytesSent: msg.data ? msg.data.length : 0,
        status: 'success'
      });
      
      // Forward the message
      targetWs.send(JSON.stringify({
        ...msg,
        forwardedBy: 'server',
        sourceNodeId: senderMetadata.nodeId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  }
  
  /**
   * Update storage node status in database
   */
  private async updateNodeStatus(nodeId: string, status: string, ip?: string) {
    try {
      // Find the node in the database
      const [node] = await db
        .select()
        .from(storageNodes)
        .where(eq(storageNodes.nodeId, nodeId));
      
      if (node) {
        // Update existing node
        await db.update(storageNodes)
          .set({
            status,
            lastSeen: new Date(),
            ...(ip ? { ipAddress: ip } : {})
          })
          .where(eq(storageNodes.nodeId, nodeId));
      } else {
        // Node doesn't exist yet (should not happen as nodes are registered separately)
        console.warn(`Attempted to update unknown node: ${nodeId}`);
      }
    } catch (error) {
      console.error('Error updating node status:', error);
    }
  }
  
  /**
   * Update node metrics (storage availability, performance, etc.)
   */
  private async updateNodeMetrics(nodeId: string, metrics: any) {
    try {
      await db.update(storageNodes)
        .set({
          storageAvailable: metrics.storageAvailable || 0,
          uptimePercentage: metrics.uptimePercentage || 100,
          performanceMetrics: metrics.performance || null
        })
        .where(eq(storageNodes.nodeId, nodeId));
    } catch (error) {
      console.error('Error updating node metrics:', error);
    }
  }
  
  /**
   * Perform health checks on connected peers
   */
  private performHealthChecks() {
    const now = new Date();
    
    for (const [peerId, metadata] of this.peerMetadata.entries()) {
      // Check if the peer has been inactive for too long (5 minutes)
      const inactiveTime = now.getTime() - metadata.lastActive.getTime();
      if (inactiveTime > 5 * 60 * 1000) {
        console.log(`Peer ${peerId} inactive for too long, disconnecting`);
        
        // Close connection
        const ws = this.connectedPeers.get(peerId);
        if (ws) {
          ws.close();
        }
        
        // Clean up
        this.connectedPeers.delete(peerId);
        this.peerMetadata.delete(peerId);
        
        // Update node status
        this.updateNodeStatus(metadata.nodeId, 'offline');
      } else {
        // Send heartbeat to check if connection is still alive
        const ws = this.connectedPeers.get(peerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: now.toISOString()
          }));
        }
      }
    }
  }
  
  /**
   * Register a new storage node in the system
   */
  public async registerNode(userId: number, storageTotal: number, geolocation?: string) {
    try {
      // Generate a unique node ID
      const nodeId = randomBytes(12).toString('hex');
      
      // Create the node in the database
      await db.insert(storageNodes).values({
        userId,
        nodeId,
        storageTotal,
        storageAvailable: storageTotal,
        status: 'offline',
        geolocation: geolocation || 'unknown',
        version: '1.0.0'
      });
      
      return { nodeId };
    } catch (error) {
      console.error('Error registering node:', error);
      throw error;
    }
  }
}