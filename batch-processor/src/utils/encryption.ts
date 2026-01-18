import * as CryptoJS from 'crypto-js';

export class EncryptionService {
    private secretKey: string;

    constructor() {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            console.warn('ENCRYPTION_KEY not found in environment, using insecure default for dev only.');
        }
        this.secretKey = key || 'default-dev-key-do-not-use-in-prod';
    }

    encrypt(data: string): string {
        return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    }

    decrypt(encryptedData: string): string {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Failed to decrypt data:', error);
            return '[Decryption Failed]';
        }
    }
}
