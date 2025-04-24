import crypto from 'crypto';

/**
 * Encryption utility for ShareBuddy
 * Provides end-to-end encryption for files using AES-256-GCM
 */
export class Encryption {
  /**
   * Generates a random encryption key for a file
   * Each file gets its own unique key for better security
   */
  static generateFileKey(): string {
    // Generate a random 256-bit (32 byte) key and convert to base64
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Encrypts data using AES-256-GCM
   * Returns the encrypted data, iv and auth tag
   */
  static encrypt(data: Buffer, key: string): { 
    encryptedData: Buffer, 
    iv: Buffer, 
    authTag: Buffer 
  } {
    // Convert base64 key back to buffer
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    // Encrypt the data
    const encryptedData = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    return { encryptedData, iv, authTag };
  }

  /**
   * Decrypts data using AES-256-GCM
   * Returns the original data if authentication passes
   */
  static decrypt(
    encryptedData: Buffer, 
    key: string, 
    iv: Buffer, 
    authTag: Buffer
  ): Buffer {
    // Convert base64 key back to buffer
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    
    // Set auth tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    return decryptedData;
  }

  /**
   * Creates a secure hash of data (for integrity verification)
   */
  static createHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifies if a hash matches the data
   */
  static verifyHash(data: Buffer, hash: string): boolean {
    const calculatedHash = this.createHash(data);
    return calculatedHash === hash;
  }
}