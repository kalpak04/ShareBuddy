import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PClient } from '@/lib/p2pClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

/**
 * React hook for using P2P functionality in components
 */
export function useP2P() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peers, setPeers] = useState<any[]>([]);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const clientRef = useRef<P2PClient | null>(null);
  
  // Initialize the P2P client when the user is authenticated
  useEffect(() => {
    if (user && !clientRef.current) {
      clientRef.current = new P2PClient({
        userId: user.id,
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
          toast({
            title: "Connected to P2P network",
            description: "You are now connected to the ShareBuddy P2P network",
          });
        },
        onDisconnected: () => {
          setIsConnected(false);
          toast({
            title: "Disconnected from P2P network",
            description: "Connection to the P2P network was lost",
            variant: "destructive",
          });
        },
        onError: (error) => {
          console.error("P2P error:", error);
          toast({
            title: "P2P connection error",
            description: "There was a problem with the P2P connection",
            variant: "destructive",
          });
        },
      });
    }
    
    // Clean up on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [user, toast]);
  
  // Connect to the P2P network
  const connect = useCallback(async () => {
    if (!clientRef.current) {
      toast({
        title: "Cannot connect",
        description: "You must be logged in to connect to the P2P network",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsConnecting(true);
      await clientRef.current.connect();
    } catch (error) {
      console.error("Failed to connect to P2P network:", error);
      setIsConnecting(false);
      toast({
        title: "Connection failed",
        description: "Failed to connect to the P2P network",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // Disconnect from the P2P network
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);
  
  // Register a new storage node
  const registerNode = useCallback(async (storageAmount: number, geolocation?: string) => {
    try {
      const response = await fetch('/api/p2p/node/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storageTotal: storageAmount,
          geolocation,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to register node: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update the node ID
      setNodeId(data.nodeId);
      
      // Reconnect with the new node ID
      if (clientRef.current) {
        clientRef.current.disconnect();
        
        // Create a new client with the node ID
        clientRef.current = new P2PClient({
          userId: user!.id,
          nodeId: data.nodeId,
          onConnected: () => {
            setIsConnected(true);
            setIsConnecting(false);
            toast({
              title: "Storage node registered",
              description: `Your device is now registered as a storage provider with ID: ${data.nodeId.substring(0, 8)}...`,
            });
          },
          onDisconnected: () => {
            setIsConnected(false);
            toast({
              title: "Disconnected from P2P network",
              description: "Connection to the P2P network was lost",
              variant: "destructive",
            });
          },
          onError: (error) => {
            console.error("P2P error:", error);
            toast({
              title: "P2P connection error",
              description: "There was a problem with the P2P connection",
              variant: "destructive",
            });
          },
        });
        
        clientRef.current.connect();
      }
      
      return data;
    } catch (error) {
      console.error("Error registering storage node:", error);
      toast({
        title: "Registration failed",
        description: "Failed to register as a storage provider",
        variant: "destructive",
      });
      throw error;
    }
  }, [user, toast]);
  
  // Discover available storage peers
  const discoverPeers = useCallback(async (query?: any) => {
    if (!clientRef.current || !isConnected) {
      toast({
        title: "Cannot discover peers",
        description: "You must be connected to the P2P network",
        variant: "destructive",
      });
      return [];
    }
    
    try {
      const discoveredPeers = await clientRef.current.discoverPeers(query);
      setPeers(discoveredPeers);
      return discoveredPeers;
    } catch (error) {
      console.error("Error discovering peers:", error);
      toast({
        title: "Discovery failed",
        description: "Failed to discover available storage peers",
        variant: "destructive",
      });
      return [];
    }
  }, [isConnected, toast]);
  
  // Process a file for distributed storage
  const distributeFile = useCallback(async (fileId: number, reliability?: number) => {
    try {
      const response = await fetch(`/api/p2p/file/distribute/${fileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reliability,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to distribute file: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "File distributed",
          description: "Your file has been successfully processed for distributed storage",
        });
      } else {
        toast({
          title: "Distribution incomplete",
          description: data.error || "File could not be fully distributed",
          variant: "destructive",
        });
      }
      
      return data;
    } catch (error) {
      console.error("Error distributing file:", error);
      toast({
        title: "Distribution failed",
        description: "Failed to process file for distributed storage",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);
  
  // Retrieve a file from distributed storage
  const retrieveFile = useCallback(async (fileId: number) => {
    try {
      const response = await fetch(`/api/p2p/file/retrieve/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve file: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "File retrieved",
          description: "Your file has been successfully retrieved from distributed storage",
        });
      } else {
        toast({
          title: "Retrieval failed",
          description: data.error || "File could not be retrieved",
          variant: "destructive",
        });
      }
      
      return data;
    } catch (error) {
      console.error("Error retrieving file:", error);
      toast({
        title: "Retrieval failed",
        description: "Failed to retrieve file from distributed storage",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);
  
  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    registerNode,
    nodeId,
    peers,
    discoverPeers,
    distributeFile,
    retrieveFile,
  };
}