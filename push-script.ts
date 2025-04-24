import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "./shared/schema";
import ws from "ws";

// Set WebSocket constructor for Neon to use
neonConfig.webSocketConstructor = ws;

// This is a simple script to push the schema directly
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // Create tables directly for each schema entity
  try {
    console.log("Creating tables...");
    
    // Create storage nodes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_nodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        node_id TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        port INTEGER,
        storage_total INTEGER NOT NULL,
        storage_available INTEGER NOT NULL,
        last_seen TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'offline',
        version TEXT,
        geolocation TEXT,
        reputation INTEGER DEFAULT 50,
        uptime_percentage INTEGER DEFAULT 100,
        performance_metrics JSONB
      );
    `);
    console.log("✓ Created storage_nodes table");
    
    // Create file chunks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_chunks (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_type TEXT NOT NULL,
        chunk_hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        encryption_iv TEXT,
        auth_tag TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✓ Created file_chunks table");
    
    // Create chunk placements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chunk_placements (
        chunk_id INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        last_verified TIMESTAMP,
        storage_url TEXT,
        redundancy_level INTEGER DEFAULT 1,
        PRIMARY KEY(chunk_id, node_id)
      );
    `);
    console.log("✓ Created chunk_placements table");
    
    // Create peer connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS peer_connections (
        id SERIAL PRIMARY KEY,
        source_node_id INTEGER NOT NULL,
        target_node_id INTEGER NOT NULL,
        connection_type TEXT NOT NULL,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        bytes_sent INTEGER DEFAULT 0,
        bytes_received INTEGER DEFAULT 0,
        status TEXT,
        latency INTEGER,
        error_details TEXT
      );
    `);
    console.log("✓ Created peer_connections table");
    
    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
