import { pgTable, text, serial, integer, boolean, timestamp, json, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: text("role").default("renter"), // "renter", "provider", or "both"
  storageReserved: integer("storage_reserved").default(0), // in MB
  storageUsed: integer("storage_used").default(0), // in MB
  storageShared: integer("storage_shared").default(0), // in MB for providers
  earnings: integer("earnings").default(0), // in paisa (1/100 of rupee)
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(), // in bytes
  type: text("type").notNull(), // mimetype
  category: text("category"), // "photos", "videos", "documents", "apps"
  path: text("path"), // virtual path
  status: text("status").default("pending"), // "pending", "backing_up", "backed_up"
  uploaded: boolean("uploaded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  size: true,
  type: true,
  category: true,
  path: true,
});

// Storage node table for P2P peers
export const storageNodes = pgTable("storage_nodes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Owner of this storage node
  nodeId: text("node_id").notNull().unique(), // Unique identifier for the node
  ipAddress: text("ip_address"), // Last known IP (may change for dynamic IPs)
  port: integer("port"), // Port for P2P connections
  storageTotal: integer("storage_total").notNull(), // Total storage in MB
  storageAvailable: integer("storage_available").notNull(), // Available storage in MB
  lastSeen: timestamp("last_seen").defaultNow(), // Last time the node was online
  status: text("status").default("offline"), // "online", "offline", "maintenance"
  version: text("version"), // Client software version
  geolocation: text("geolocation"), // Geographic location (city, country)
  reputation: integer("reputation").default(50), // 0-100 reputation score
  uptimePercentage: integer("uptime_percentage").default(100), // Uptime percentage
  performanceMetrics: json("performance_metrics").$type<{
    avgResponseTime: number;
    successfulTransfers: number;
    failedTransfers: number;
    avgBandwidth: number;
  }>(),
});

// File chunks for distributed storage with erasure coding
export const fileChunks = pgTable("file_chunks", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(), // Reference to the original file
  userId: integer("user_id").notNull(), // Owner of the file
  chunkIndex: integer("chunk_index").notNull(), // Position in the file (0-based)
  chunkType: text("chunk_type").notNull(), // "data" or "parity"
  chunkHash: text("chunk_hash").notNull(), // SHA-256 hash of the chunk
  size: integer("size").notNull(), // Size in bytes
  encryptionIv: text("encryption_iv"), // Initialization vector for encryption
  authTag: text("auth_tag"), // Authentication tag for encryption
  status: text("status").default("pending"), // "pending", "stored", "verified"
  createdAt: timestamp("created_at").defaultNow(),
});

// Chunk placement - which nodes store which chunks
export const chunkPlacements = pgTable("chunk_placements", {
  chunkId: integer("chunk_id").notNull(),
  nodeId: integer("node_id").notNull(), // Reference to storage_nodes.id
  status: text("status").default("pending"), // "pending", "stored", "verified", "failed"
  lastVerified: timestamp("last_verified"),
  storageUrl: text("storage_url"), // URL or path where the chunk is stored on the node
  redundancyLevel: integer("redundancy_level").default(1), // How many copies of this chunk
  // Composite primary key
}, (table) => {
  return {
    pk: primaryKey(table.chunkId, table.nodeId),
  };
});

// P2P connection history for analytics and debugging
export const peerConnections = pgTable("peer_connections", {
  id: serial("id").primaryKey(),
  sourceNodeId: integer("source_node_id").notNull(),
  targetNodeId: integer("target_node_id").notNull(),
  connectionType: text("connection_type").notNull(), // "upload", "download", "sync", "heartbeat"
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  bytesSent: integer("bytes_sent").default(0),
  bytesReceived: integer("bytes_received").default(0),
  status: text("status"), // "success", "failed", "timeout"
  latency: integer("latency"), // Connection latency in milliseconds
  errorDetails: text("error_details"), // Details if connection failed
});

// Insert schemas for new tables
export const insertStorageNodeSchema = createInsertSchema(storageNodes).pick({
  userId: true,
  nodeId: true,
  ipAddress: true,
  port: true,
  storageTotal: true,
  storageAvailable: true,
  geolocation: true,
  version: true,
});

export const insertFileChunkSchema = createInsertSchema(fileChunks).pick({
  fileId: true,
  userId: true,
  chunkIndex: true,
  chunkType: true,
  chunkHash: true,
  size: true,
  encryptionIv: true,
  authTag: true,
});

export const insertChunkPlacementSchema = createInsertSchema(chunkPlacements).pick({
  chunkId: true,
  nodeId: true,
  storageUrl: true,
  redundancyLevel: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type StorageNode = typeof storageNodes.$inferSelect;
export type InsertStorageNode = z.infer<typeof insertStorageNodeSchema>;
export type FileChunk = typeof fileChunks.$inferSelect;
export type InsertFileChunk = z.infer<typeof insertFileChunkSchema>;
export type ChunkPlacement = typeof chunkPlacements.$inferSelect;
export type InsertChunkPlacement = z.infer<typeof insertChunkPlacementSchema>;
export type PeerConnection = typeof peerConnections.$inferSelect;
