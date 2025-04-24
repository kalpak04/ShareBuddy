/**
 * P2P Client for ShareBuddy
 * 
 * This module handles WebSocket connections to the P2P tunnel server
 * for peer discovery and file transfers
 */

interface P2PClientOptions {
  userId: number;
  nodeId?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export class P2PClient {
  private socket: WebSocket | null = null;
  private peerId: string | null = null;
  private options: P2PClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  constructor(options: P2PClientOptions) {
    this.options = options;
  }
  
  /**
   * Connect to the P2P tunnel server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.socket) {
          this.socket.close();
          this.socket = null;
          this.peerId = null;
        }
        
        // Create WebSocket connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/p2p`;
        
        try {
          this.socket = new WebSocket(wsUrl);
          console.log("P2P: Connecting to", wsUrl);
        } catch (err) {
          console.error("P2P: Failed to create WebSocket connection", err);
          reject(err);
          return;
        }
        
        // Setup event handlers
        this.socket.onopen = () => {
          console.log("P2P: Connected to tunnel server");
          
          // Send authentication message
          this.socket.send(JSON.stringify({
            type: "auth",
            userId: this.options.userId,
            nodeId: this.options.nodeId || "browser-client", // Browser clients may not have a nodeId
            timestamp: new Date().toISOString()
          }));
          
          // Reset reconnect attempts
          this.reconnectAttempts = 0;
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle authentication response
            if (message.type === "auth_success") {
              this.peerId = message.peerId;
              console.log(`P2P: Authentication successful, assigned peerId: ${this.peerId}`);
              
              if (this.options.onConnected) {
                this.options.onConnected();
              }
              
              resolve();
            } else if (message.type === "auth_error") {
              console.error("P2P: Authentication failed:", message.error);
              reject(new Error(message.error));
            } else if (message.type === "heartbeat") {
              // Respond to heartbeat
              this.socket?.send(JSON.stringify({
                type: "heartbeat_ack",
                timestamp: new Date().toISOString()
              }));
            } else {
              // Pass other messages to the client
              if (this.options.onMessage) {
                this.options.onMessage(message);
              }
            }
          } catch (error) {
            console.error("P2P: Error parsing message:", error);
          }
        };
        
        this.socket.onclose = () => {
          console.log("P2P: Connection closed");
          this.socket = null;
          
          if (this.options.onDisconnected) {
            this.options.onDisconnected();
          }
          
          // Attempt to reconnect
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error("P2P: WebSocket error:", error);
          
          if (this.options.onError) {
            this.options.onError(error);
          }
        };
      } catch (error) {
        console.error("P2P: Connection error:", error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the P2P tunnel server
   */
  disconnect() {
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close the socket if it exists
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.peerId = null;
    }
  }
  
  /**
   * Send a message to the P2P tunnel server
   */
  sendMessage(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("P2P: Cannot send message, socket not connected");
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error("P2P: Error sending message:", error);
      return false;
    }
  }
  
  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("P2P: Maximum reconnect attempts reached");
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`P2P: Attempting to reconnect in ${delay}ms...`);
    
    this.reconnectAttempts++;
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error("P2P: Reconnection failed:", error);
      });
    }, delay);
  }
  
  /**
   * Discover available storage peers
   */
  discoverPeers(query: any = {}): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("P2P: Not connected to tunnel server"));
        return;
      }
      
      // Set up one-time message handler for the response
      const messageHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "peer_discovery_result") {
            // Remove the event listener
            this.socket?.removeEventListener("message", messageHandler);
            
            // Return the list of peers
            resolve(message.peers || []);
          }
        } catch (error) {
          console.error("P2P: Error parsing peer discovery response:", error);
        }
      };
      
      // Add the event listener
      this.socket.addEventListener("message", messageHandler);
      
      // Send the peer discovery request
      this.sendMessage({
        type: "peer_discovery",
        query
      });
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        this.socket?.removeEventListener("message", messageHandler);
        reject(new Error("P2P: Peer discovery timed out"));
      }, 10000);
    });
  }
  
  /**
   * Request a file chunk from a peer
   */
  requestChunk(targetNodeId: string, chunkId: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("P2P: Not connected to tunnel server"));
        return;
      }
      
      // Set up one-time message handler for the response
      const messageHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "chunk_response" && message.chunkId === chunkId) {
            // Remove the event listener
            this.socket?.removeEventListener("message", messageHandler);
            
            // Check for error
            if (message.error) {
              reject(new Error(`P2P: Chunk response error: ${message.error}`));
              return;
            }
            
            // Convert base64 data to ArrayBuffer
            const binaryData = atob(message.data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i);
            }
            
            // Return the chunk data
            resolve(bytes.buffer);
          }
        } catch (error) {
          console.error("P2P: Error parsing chunk response:", error);
        }
      };
      
      // Add the event listener
      this.socket.addEventListener("message", messageHandler);
      
      // Send the chunk request
      this.sendMessage({
        type: "chunk_request",
        targetNodeId,
        chunkId,
        peerId: this.peerId
      });
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        this.socket?.removeEventListener("message", messageHandler);
        reject(new Error("P2P: Chunk request timed out"));
      }, 30000);
    });
  }
}