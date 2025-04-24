/**
 * Implements Reed-Solomon erasure coding for ShareBuddy
 * 
 * This provides data redundancy by splitting files into chunks and creating
 * additional parity chunks. Files can be reconstructed even if some chunks are lost.
 * 
 * This is a simplified implementation for demonstration. In a production environment,
 * you would use a more robust library for Reed-Solomon coding.
 */
export class ErasureCoding {
  /**
   * Splits data into chunks and adds parity information
   * @param data The original file data buffer
   * @param dataChunks Number of data chunks to split into
   * @param parityChunks Number of parity chunks to generate
   * @returns Array of all chunks (data chunks + parity chunks)
   */
  static encode(data: Buffer, dataChunks: number, parityChunks: number): Buffer[] {
    // Validate parameters
    if (dataChunks <= 0 || parityChunks <= 0) {
      throw new Error('Data chunks and parity chunks must be positive numbers');
    }
    
    // Calculate chunk size (padding the last chunk if necessary)
    const chunkSize = Math.ceil(data.length / dataChunks);
    
    // Split the data into chunks
    const chunks: Buffer[] = [];
    for (let i = 0; i < dataChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.length);
      
      // Create a chunk of exactly chunkSize by padding with zeroes if needed
      const chunk = Buffer.alloc(chunkSize);
      data.copy(chunk, 0, start, end);
      chunks.push(chunk);
    }
    
    // Generate parity chunks using XOR for simplicity
    // Note: This is a simplified version of erasure coding
    // In production, use a proper Reed-Solomon implementation
    for (let i = 0; i < parityChunks; i++) {
      const parityChunk = Buffer.alloc(chunkSize);
      
      // Calculate parity based on a rotating pattern of chunks
      for (let j = 0; j < dataChunks; j++) {
        // Skip different chunks for each parity chunk
        if ((j + i) % parityChunks !== 0) {
          for (let k = 0; k < chunkSize; k++) {
            parityChunk[k] ^= chunks[j][k];
          }
        }
      }
      
      chunks.push(parityChunk);
    }
    
    return chunks;
  }
  
  /**
   * Reconstructs the original data from available chunks
   * @param chunks Available chunks (some may be missing)
   * @param chunkMap Boolean array indicating which chunks are available (true) or missing (false)
   * @param dataChunks Number of original data chunks
   * @param parityChunks Number of parity chunks
   * @param originalSize Size of the original data in bytes
   * @returns The reconstructed original data
   */
  static decode(
    chunks: Buffer[], 
    chunkMap: boolean[], 
    dataChunks: number, 
    parityChunks: number,
    originalSize: number
  ): Buffer {
    // Count available chunks
    const availableChunks = chunkMap.filter(Boolean).length;
    
    // Check if we have enough chunks to reconstruct the data
    if (availableChunks < dataChunks) {
      throw new Error(`Cannot reconstruct data: need at least ${dataChunks} chunks, but only ${availableChunks} are available`);
    }
    
    // If all data chunks are available, reconstruct directly
    const chunkSize = chunks[0].length;
    let reconstructed: Buffer;
    
    // Check if all data chunks are available
    const allDataChunksAvailable = chunkMap.slice(0, dataChunks).every(Boolean);
    if (allDataChunksAvailable) {
      // Simply concatenate the data chunks
      reconstructed = Buffer.concat(chunks.slice(0, dataChunks));
    } else {
      // Some data chunks are missing, need to use parity chunks
      // Note: This is a placeholder for the actual reconstruction logic
      // In production, use a proper Reed-Solomon implementation
      throw new Error('Advanced erasure code reconstruction not implemented in this demo');
    }
    
    // Trim to original size (remove padding)
    return reconstructed.slice(0, originalSize);
  }
  
  /**
   * Calculates optimal number of data and parity chunks based on file size
   * @param fileSize Size of the file in bytes
   * @param reliability Desired reliability level (1-5, where 5 is highest)
   * @returns Object with recommended dataChunks and parityChunks
   */
  static calculateOptimalChunks(fileSize: number, reliability: number): { 
    dataChunks: number, 
    parityChunks: number 
  } {
    // Normalize reliability to 1-5 range
    const normalizedReliability = Math.max(1, Math.min(5, reliability));
    
    // Determine base chunk size based on file size
    let baseChunkSize: number;
    if (fileSize < 1024 * 1024) { // Less than 1MB
      baseChunkSize = 64 * 1024; // 64KB chunks
    } else if (fileSize < 10 * 1024 * 1024) { // Less than 10MB
      baseChunkSize = 256 * 1024; // 256KB chunks
    } else if (fileSize < 100 * 1024 * 1024) { // Less than 100MB
      baseChunkSize = 1024 * 1024; // 1MB chunks
    } else {
      baseChunkSize = 4 * 1024 * 1024; // 4MB chunks for larger files
    }
    
    // Calculate number of data chunks
    const dataChunks = Math.max(3, Math.ceil(fileSize / baseChunkSize));
    
    // Calculate number of parity chunks based on reliability
    // Higher reliability means more parity chunks
    const parityChunks = Math.max(1, Math.ceil(dataChunks * (normalizedReliability / 5)));
    
    return { dataChunks, parityChunks };
  }
}