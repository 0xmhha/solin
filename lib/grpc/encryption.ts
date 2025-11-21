/**
 * Encryption Service
 *
 * Provides encryption/decryption for protecting sensitive code and data
 */

import * as crypto from 'crypto';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
}

/**
 * Encryption Service
 */
export class EncryptionService {
  private algorithm: string;
  private keyLength: number;
  private ivLength: number;
  private keys: Map<string, Buffer>;

  constructor(config: EncryptionConfig = {}) {
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.keyLength = config.keyLength || 32; // 256 bits
    this.ivLength = config.ivLength || 16; // 128 bits
    this.keys = new Map();
  }

  /**
   * Generate a new encryption key
   */
  generateKey(keyId: string): string {
    const key = crypto.randomBytes(this.keyLength);
    this.keys.set(keyId, key);
    return key.toString('base64');
  }

  /**
   * Set an encryption key
   */
  setKey(keyId: string, keyBase64: string): void {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== this.keyLength) {
      throw new Error(`Invalid key length. Expected ${this.keyLength} bytes`);
    }
    this.keys.set(keyId, key);
  }

  /**
   * Get encryption key
   */
  private getKey(keyId: string): Buffer {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }
    return key;
  }

  /**
   * Encrypt data
   */
  encrypt(data: string, keyId: string): string {
    try {
      const key = this.getKey(keyId);
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag for GCM mode
      const authTag = (cipher as any).getAuthTag();

      // Combine: iv + authTag + encrypted data
      const result = {
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        data: encrypted,
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string, keyId: string): string {
    try {
      const key = this.getKey(keyId);

      // Parse encrypted package
      const packageJson = Buffer.from(encryptedData, 'base64').toString('utf8');
      const { iv, authTag, data } = JSON.parse(packageJson);

      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
      (decipher as any).setAuthTag(authTagBuffer);

      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC for data integrity
   */
  hmac(data: string, keyId: string): string {
    const key = this.getKey(keyId);
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data: string, hmac: string, keyId: string): boolean {
    const computed = this.hmac(data, keyId);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  }

  /**
   * Encrypt file path (for privacy)
   */
  encryptPath(path: string, keyId: string): string {
    return this.hash(path + this.getKey(keyId).toString('base64'));
  }
}

/**
 * Default encryption service instance
 */
export const defaultEncryption = new EncryptionService();
