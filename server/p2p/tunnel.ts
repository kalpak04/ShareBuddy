import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'crypto';
import { db } from '../db';
import { storageNodes, peerConnections } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
    // Initialize WebSocket server on the /ws/p2p path
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/p2p',
    });
    
    console.log('P2P tunnel server initialized');
    
    // Set up connection handlers
    this.setupConnectionHandlers();
    
    // Start health checks every 30 seconds
    setInterval(() => this.performHealthChecks(), 30000);
  }
  
  private setupConnectionHandlers() {
    this.wss.on('connection', (ws, req) => {
      // Generate temporary peer ID for the connection
      const tempPeerId = `peer_${randomBytes(8).toString('hex')}`;
      
      console.log(`P2P: New connection from ${req.socket.remoteAddress}, assigned tempId: ${tempPeerId}`);
      
      // Store connection temporarily until authenticated
      this.connectedPeers.set(tempPeerId, ws);
      
      // Handle first message as authentication
      const authHandler = async (message: Buffer) => {
        try {
          const authMsg = JSON.parse(message.toString());
          
          if (authMsg.type === 'auth') {
            // Remove auth handler after first message
            ws.removeListener('message', authHandler);
            
            const { userId, nodeId, timestamp } = authMsg;
            
            if (!userId) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                error: 'Missing userId in authentication message'
              }));
              ws.close();
              return;
            }
            
            // Generate permanent peer ID
            const peerId = nodeId || `peer_${randomBytes(16).toString('hex')}`;
            
            // Remove temporary peer
            this.connectedPeers.delete(tempPeerId);
            
            // Update storage node if this is a provider node
            if (nodeId) {
              await this.updateNodeStatus(nodeId, 'online', req.socket.remoteAddress);
            }
            
            // Store connection with permanent ID
            this.connectedPeers.set(peerId, ws);
            this.peerMetadata.set(peerId, {
              userId,
              nodeId: nodeId || 'browser-client',
              ip: req.socket.remoteAddress || 'unknown',
              lastActive: new Date()
            });
            
            // Send authentication success
            ws.send(JSON.stringify({
              type: 'auth_success',
              peerId,
              timestamp: new Date().toISOString()
            }));
            
            // Setup message handling for this peer
            this.setupMessageHandling(ws, peerId);
            
            console.log(`P2P: Peer ${peerId} authenticated as user ${userId}`);
          } else {
            ws.send(JSON.stringify({
              type: 'auth_error',
              error: 'First message must be authentication'
            }));
            ws.close();
          }
        } catch (error) {
          console.error('P2P: Authentication error:', error);
          ws.send(JSON.stringify({
            type: 'auth_error',
            error: 'Invalid authentication message'
          }));
          ws.close();
        }
      };
      
      // Listen for auth message
      ws.on('message', authHandler);
      
      // Handle disconnection
      ws.on('close', () => {
        if (this.connectedPeers.has(tempPeerId)) {
          this.connectedPeers.delete(tempPeerId);
          console.log(`P2P: Unauthenticated peer ${tempPeerId} disconnected`);
        }
      });
      
      // Set connection timeout for authentication
      setTimeout(() => {
        if (this.connectedPeers.has(tempPeerId)) {
          console.log(`P2P: Authentication timeout for ${tempPeerId}`);
          ws.close();
          this.connectedPeers.delete(tempPeerId);
        }
      }, 10000);
    });
  }
  
  private setupMessageHandling(ws: WebSocket, peerId: string) {
    ws.on('message', async (message: Buffer) => {
      try {
        const metadata = this.peerMetadata.get(peerId);
        if (!metadata) {
          console.error(`P2P: Received message from unknown peer ${peerId}`);
          return;
        }
        
        // Update last active timestamp
        metadata.lastActive = new Date();
        this.peerMetadata.set(peerId, metadata);
        
        // Parse message
        const msg = JSON.parse(message.toString());
        
        // Handle different message types
        switch (msg.type) {
          case 'heartbeat_ack':
            // Just update the lastActive timestamp
            break;
            
          case 'peer_discovery':
            await this.handlePeerDiscovery(ws, metadata.userId, msg.query || {});
            break;
            
          case 'chunk_request':
            // Forward the request to target peer
            await this.forwardToTargetPeer(msg, metadata);
            break;
            
          case 'chunk_response':
            // Forward the response back to the requester
            if (msg.targetPeerId && this.connectedPeers.has(msg.targetPeerId)) {
              const targetWs = this.connectedPeers.get(msg.targetPeerId);
              targetWs?.send(JSON.stringify(msg));
            }
            break;
            
          case 'node_metrics':
            if (metadata.nodeId) {
              await this.updateNodeMetrics(metadata.nodeId, msg.metrics || {});
            }
            break;
            
          default:
            console.log(`P2P: Received unknown message type: ${msg.type}`);
        }
      } catch (error) {
        console.error(`P2P: Error handling message from ${peerId}:`, error);
      }
    });
    
    ws.on('close', async () => {
      const metadata = this.peerMetadata.get(peerId);
      this.connectedPeers.delete(peerId);
      this.peerMetadata.delete(peerId);
      
      console.log(`P2P: Peer ${peerId} disconnected`);
      
      // Update node status if it was a storage node
      if (metadata?.nodeId && metadata.nodeId !== 'browser-client') {
        await this.updateNodeStatus(metadata.nodeId, 'offline');
      }
    });
    
    // Send periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 15000);
  }
  
  /**
   * Handle peer discovery requests
   */
  private async handlePeerDiscovery(ws: WebSocket, userId: number, query: any) {
    try {
      // Query for available storage nodes
      const availableNodes = await db
        .select()
        .from(storageNodes)
        .where(and(
          eq(storageNodes.status, 'online'),
          sql`${storageNodes.storageAvailable} > 0`,
          sql`${storageNodes.reputation} >= 70`
        ))
        .orderBy(desc(storageNodes.reputation));
      
      // Map to response format with only necessary information
      const peers = availableNodes.map(node => ({
        nodeId: node.nodeId,
        storageAvailable: node.storageAvailable,
        reputation: node.reputation,
        geolocation: node.geolocation,
        // Don't include sensitive information like IP addresses
      }));
      
      // Send response
      ws.send(JSON.stringify({
        type: 'peer_discovery_result',
        peers,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('P2P: Error handling peer discovery:', error);
      ws.send(JSON.stringify({
        type: 'peer_discovery_result',
        error: 'Failed to discover peers',
        peers: [],
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  /**
   * Forward a message to the target peer
   */
  private async forwardToTargetPeer(msg: any, senderMetadata: any) {
    const { targetNodeId } = msg;
    
    // Find a peer with this node ID
    let targetPeerId: string | null = null;
    
    for (const [peerId, metadata] of this.peerMetadata.entries()) {
      if (metadata.nodeId === targetNodeId) {
        targetPeerId = peerId;
        break;
      }
    }
    
    if (!targetPeerId || !this.connectedPeers.has(targetPeerId)) {
      // Target peer not connected, send error response back
      const senderPeer = this.connectedPeers.get(msg.peerId);
      if (senderPeer && senderPeer.readyState === WebSocket.OPEN) {
        senderPeer.send(JSON.stringify({
          type: 'chunk_response',
          chunkId: msg.chunkId,
          error: 'Target node is not connected',
          timestamp: new Date().toISOString()
        }));
      }
      return;
    }
    
    // Record the connection in the database for analytics
    try {
      await db
        .insert(peerConnections)
        .values({
          sourceUserId: senderMetadata.userId,
          targetNodeId,
          connectionType: 'chunk_request',
          timestamp: new Date()
        });
    } catch (error) {
      console.error('P2P: Error recording peer connection:', error);
    }
    
    // Forward the request with sender info
    const targetPeer = this.connectedPeers.get(targetPeerId);
    if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
      // Add the sender's peer ID so the target can respond directly
      const forwardedMsg = {
        ...msg,
        targetPeerId: msg.peerId,
        timestamp: new Date().toISOString()
      };
      
      targetPeer.send(JSON.stringify(forwardedMsg));
    }
  }
  
  /**
   * Update storage node status in database
   */
  private async updateNodeStatus(nodeId: string, status: string, ip?: string) {
    try {
      const updateData: any = {
        status,
        lastSeen: new Date()
      };
      
      if (ip) {
        updateData.ip = ip;
      }
      
      await db
        .update(storageNodes)
        .set(updateData)
        .where(eq(storageNodes.nodeId, nodeId));
    } catch (error) {
      console.error(`P2P: Error updating node status for ${nodeId}:`, error);
    }
  }
  
  /**
   * Update node metrics (storage availability, performance, etc.)
   */
  private async updateNodeMetrics(nodeId: string, metrics: any) {
    try {
      const updateData: any = {
        lastSeen: new Date()
      };
      
      if (metrics.storageAvailable !== undefined) {
        updateData.storageAvailable = metrics.storageAvailable;
      }
      
      if (metrics.storageUsed !== undefined) {
        updateData.storageUsed = metrics.storageUsed;
      }
      
      if (metrics.chunkCount !== undefined) {
        updateData.chunkCount = metrics.chunkCount;
      }
      
      await db
        .update(storageNodes)
        .set(updateData)
        .where(eq(storageNodes.nodeId, nodeId));
    } catch (error) {
      console.error(`P2P: Error updating node metrics for ${nodeId}:`, error);
    }
  }
  
  /**
   * Perform health checks on connected peers
   */
  private performHealthChecks() {
    const now = new Date();
    const timeoutThreshold = 60000; // 60 seconds
    
    for (const [peerId, metadata] of this.peerMetadata.entries()) {
      const timeSinceLastActive = now.getTime() - metadata.lastActive.getTime();
      
      if (timeSinceLastActive > timeoutThreshold) {
        console.log(`P2P: Peer ${peerId} timed out (inactive for ${timeSinceLastActive}ms)`);
        
        // Close the connection
        const ws = this.connectedPeers.get(peerId);
        if (ws) {
          ws.close();
        }
        
        // Clean up
        this.connectedPeers.delete(peerId);
        this.peerMetadata.delete(peerId);
        
        // Update node status if it was a storage node
        if (metadata.nodeId && metadata.nodeId !== 'browser-client') {
          this.updateNodeStatus(metadata.nodeId, 'offline');
        }
      }
    }
  }
}