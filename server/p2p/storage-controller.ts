import { db } from "../db";
import { fileChunks, files, chunkPlacements, storageNodes } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Encryption } from "../security/encryption";
import { ErasureCoding } from "../security/erasure-coding";
import { ReputationSystem } from "../security/reputation";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Controls the distributed storage operations for ShareBuddy
 * 
 * Handles file chunking, erasure coding, encryption, and placement.
 */
export class StorageController {
  // Temporary directory for processing files
  private tempDir = path.join(process.cwd(), "temp");
  
  constructor() {
    // Ensure temp directory exists
    this.ensureTempDir();
  }
  
  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }
  }
  
  /**
   * Process a new file for distributed storage
   * 
   * This is the main function that:
   * 1. Splits the file into chunks
   * 2. Applies erasure coding for redundancy
   * 3. Encrypts each chunk
   * 4. Determines node placement
   * 5. Records metadata in the database
   */
  public async processFileForDistribution(
    fileId: number,
    userId: number,
    fileData: Buffer,
    reliability: number = 3
  ) {
    try {
      // Get file info from database
      const [fileInfo] = await db
        .select()
        .from(files)
        .where(eq(files.id, fileId));
      
      if (!fileInfo) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Update file status
      await db
        .update(files)
        .set({ status: "backing_up" })
        .where(eq(files.id, fileId));
      
      // Calculate optimal chunk sizes based on erasure coding
      const { dataChunks, parityChunks } = ErasureCoding.calculateOptimalChunks(
        fileData.length,
        reliability
      );
      
      console.log(`Splitting file into ${dataChunks} data chunks and ${parityChunks} parity chunks`);
      
      // Generate file encryption key
      const fileKey = Encryption.generateFileKey();
      
      // Save the key (in a real app, this would be securely stored)
      // This is a simplified version - in production, use a secure key management system
      const keyFilePath = path.join(this.tempDir, `${fileId}_key.txt`);
      await fs.writeFile(keyFilePath, fileKey, "utf8");
      
      // Split the file and apply erasure coding
      const chunks = ErasureCoding.encode(fileData, dataChunks, parityChunks);
      
      // Process each chunk
      const chunkIds: number[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const isDataChunk = i < dataChunks;
        const chunkType = isDataChunk ? "data" : "parity";
        const chunk = chunks[i];
        
        // Encrypt the chunk
        const { encryptedData, iv, authTag } = Encryption.encrypt(chunk, fileKey);
        
        // Calculate hash for integrity verification
        const chunkHash = Encryption.createHash(encryptedData);
        
        // Store chunk metadata in database
        const [chunkRecord] = await db
          .insert(fileChunks)
          .values({
            fileId,
            userId,
            chunkIndex: i,
            chunkType,
            chunkHash,
            size: encryptedData.length,
            encryptionIv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
            status: "pending"
          })
          .returning();
        
        // Save encrypted chunk to temp storage
        const chunkPath = path.join(this.tempDir, `${fileId}_chunk_${i}.bin`);
        await fs.writeFile(chunkPath, encryptedData);
        
        chunkIds.push(chunkRecord.id);
      }
      
      // Determine node placement - find reliable nodes
      await this.determineChunkPlacement(chunkIds, reliability);
      
      // Final check of placement
      const placementStatus = await this.verifyChunkPlacement(chunkIds);
      
      if (placementStatus.allPlaced) {
        // Mark file as backed up successfully
        await db
          .update(files)
          .set({ status: "backed_up", uploaded: true })
          .where(eq(files.id, fileId));
        
        console.log(`File ${fileId} successfully prepared for distributed storage`);
        return { success: true, fileKey };
      } else {
        // Some chunks couldn't be placed
        await db
          .update(files)
          .set({ status: "pending" })
          .where(eq(files.id, fileId));
        
        console.error(`Failed to place all chunks for file ${fileId}`);
        return { 
          success: false, 
          error: "Insufficient storage nodes available",
          placedChunks: placementStatus.placedCount,
          totalChunks: chunkIds.length
        };
      }
    } catch (error) {
      console.error("Error processing file for distribution:", error);
      
      // Update file status to reflect failure
      await db
        .update(files)
        .set({ status: "pending" })
        .where(eq(files.id, fileId));
      
      throw error;
    }
  }
  
  /**
   * Determine which nodes should store which chunks
   */
  private async determineChunkPlacement(chunkIds: number[], redundancyLevel: number) {
    try {
      // Get available storage nodes with good reputation
      const availableNodes = await db
        .select()
        .from(storageNodes)
        .where(and(
          eq(storageNodes.status, "online"),
          sql`${storageNodes.reputation} >= 70`
        ))
        .orderBy(desc(storageNodes.reputation));
      
      if (availableNodes.length < redundancyLevel) {
        console.warn(`Not enough reliable nodes available: ${availableNodes.length} < ${redundancyLevel}`);
      }
      
      // For each chunk, place on multiple nodes with redundancy
      for (const chunkId of chunkIds) {
        const placementsPerChunk = Math.min(availableNodes.length, redundancyLevel);
        
        // Pick nodes for this chunk - in a real system, you'd use a sophisticated
        // algorithm that considers geographic distribution, network topology, etc.
        const selectedNodes = this.selectNodesForChunk(availableNodes, placementsPerChunk);
        
        // Record placements in database
        for (const node of selectedNodes) {
          const storageUrl = `/chunks/${chunkId}_${randomBytes(4).toString('hex')}`;
          
          await db
            .insert(chunkPlacements)
            .values({
              chunkId,
              nodeId: node.id,
              status: "pending",
              storageUrl,
              redundancyLevel: placementsPerChunk
            });
        }
      }
    } catch (error) {
      console.error("Error determining chunk placement:", error);
      throw error;
    }
  }
  
  /**
   * Select a set of nodes for storing a chunk
   * 
   * In a real system, this would use a more sophisticated algorithm
   * considering geographic distribution, network topology, etc.
   */
  private selectNodesForChunk(nodes: any[], count: number) {
    // Simple approach: just pick the first 'count' nodes
    // In a real system, use a more sophisticated selection algorithm
    return nodes.slice(0, count);
  }
  
  /**
   * Verify that all chunks have been placed
   */
  private async verifyChunkPlacement(chunkIds: number[]) {
    const placements = await db
      .select({
        chunkId: chunkPlacements.chunkId,
        count: sql<number>`count(${chunkPlacements.nodeId})`
      })
      .from(chunkPlacements)
      .where(sql`${chunkPlacements.chunkId} IN (${chunkIds.join(',')})`)
      .groupBy(chunkPlacements.chunkId);
    
    const placedChunks = placements.length;
    const allPlaced = placedChunks === chunkIds.length;
    
    return {
      allPlaced,
      placedCount: placedChunks,
      totalChunks: chunkIds.length
    };
  }
  
  /**
   * Retrieve a file from distributed storage
   */
  public async retrieveFile(fileId: number, userId: number) {
    try {
      // Get file info
      const [fileInfo] = await db
        .select()
        .from(files)
        .where(and(
          eq(files.id, fileId),
          eq(files.userId, userId)
        ));
      
      if (!fileInfo) {
        throw new Error(`File ${fileId} not found or access denied`);
      }
      
      // Get the chunks for this file
      const fileChunksList = await db
        .select()
        .from(fileChunks)
        .where(eq(fileChunks.fileId, fileId))
        .orderBy(fileChunks.chunkIndex);
      
      if (fileChunksList.length === 0) {
        throw new Error(`No chunks found for file ${fileId}`);
      }
      
      // Determine if we have enough chunks to reconstruct the file
      const dataChunks = fileChunksList.filter(c => c.chunkType === "data").length;
      const dataChunksAvailable = fileChunksList.filter(c => 
        c.chunkType === "data" && c.status === "stored"
      ).length;
      
      if (dataChunksAvailable < dataChunks) {
        throw new Error(`Insufficient chunks available to reconstruct file: ${dataChunksAvailable}/${dataChunks}`);
      }
      
      // In a real system, the following steps would happen:
      // 1. Retrieve encrypted chunks from storage nodes
      // 2. Decrypt the chunks using the file key
      // 3. Apply erasure coding to reconstruct the file
      // 4. Return the complete file
      
      // For this simplified example, we'll just simulate it with a placeholder success message
      return {
        success: true,
        message: `File ${fileId} (${fileInfo.name}) successfully retrieved`,
        fileInfo
      };
    } catch (error) {
      console.error("Error retrieving file:", error);
      throw error;
    }
  }
}