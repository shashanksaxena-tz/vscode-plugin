import * as CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

export class EncryptionService {
    private key: CryptoJS.lib.WordArray;

    constructor() {
        const keyStr = process.env.ENCRYPTION_KEY || 'default-dev-key-do-not-use-in-prod';

        // Ensure we have a 32-byte key.
        // If it's a 64-char hex string, parse it.
        // Otherwise, hash it with SHA256 to consistently get 32 bytes from any passphrase.
        if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
            this.key = CryptoJS.enc.Hex.parse(keyStr);
        } else {
             console.warn('ENCRYPTION_KEY is not a 64-char hex string. Using SHA256 hash of the key string.');
             this.key = CryptoJS.SHA256(keyStr);
        }
    }

    encrypt(data: string): string {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(data, this.key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // Combine IV and Ciphertext: IV (16 bytes) + Ciphertext
        const combined = iv.clone().concat(encrypted.ciphertext);
        return combined.toString(CryptoJS.enc.Base64);
    }

    decrypt(encryptedData: string): string {
        try {
            // Decode Base64
            const combined = CryptoJS.enc.Base64.parse(encryptedData);

            // Extract IV (first 16 bytes = 4 words)
            // CryptoJS words are 32-bit (4 bytes)
            const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);

            // Extract Ciphertext (remaining bytes)
            const ciphertextWords = combined.words.slice(4);
            const ciphertextSize = combined.sigBytes - 16;

            const ciphertext = CryptoJS.lib.WordArray.create(
                ciphertextWords,
                ciphertextSize
            );

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertext } as any, // Cast because type defs can be finicky
                this.key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            console.error('Decryption failed', e);
            return '';
        }
    }
}
