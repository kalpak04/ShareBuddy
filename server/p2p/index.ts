import { P2PTunnel } from './tunnel';
import { StorageController } from './storage-controller';
import { Server } from 'http';

/**
 * Initialize the P2P functionality for ShareBuddy
 * @param server HTTP server instance to attach WebSocket server to
 * @returns Object containing P2P components
 */
export function initializeP2P(server: Server) {
  const p2pTunnel = new P2PTunnel(server);
  const storageController = new StorageController();
  
  return {
    p2pTunnel,
    storageController
  };
}

export { P2PTunnel } from './tunnel';
export { StorageController } from './storage-controller';