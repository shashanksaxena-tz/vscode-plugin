import CryptoJS from 'crypto-js';

export class EncryptionService {
  private secretKey: string;

  constructor(secretKey?: string) {
    // In a real app, this should be a secure key, potentially rotated or user-specific
    this.secretKey = secretKey || process.env.ENCRYPTION_KEY || 'default-dev-key';
  }

  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.secretKey).toString();
  }

  decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
