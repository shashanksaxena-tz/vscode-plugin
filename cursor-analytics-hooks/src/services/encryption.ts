import CryptoJS from 'crypto-js';

export class EncryptionService {
  private secretKey: string;

  constructor() {
    // In a real app, this should be securely managed or passed in
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-dev-key-do-not-use-in-prod';
  }

  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.secretKey).toString();
  }

  decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
