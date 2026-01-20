import * as CryptoJS from 'crypto-js';
import * as vscode from 'vscode';

export class EncryptionService {
    private key: CryptoJS.lib.WordArray;

    constructor() {
        const config = vscode.workspace.getConfiguration('copilotAnalytics');
        const configKey = config.get('encryptionKey') as string;
        const envKey = process.env.ENCRYPTION_KEY;

        // Priority: Config > Env > Default
        const keyStr = configKey || envKey || 'default-dev-key-do-not-use-in-prod';

        if (!configKey && !envKey) {
            console.warn('Encryption key not configured. Using default insecure key.');
        }

        // Ensure we have a 32-byte key.
        // If it's a 64-char hex string, parse it.
        // Otherwise, hash it with SHA256.
        if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
            this.key = CryptoJS.enc.Hex.parse(keyStr);
        } else {
             // Fallback for dev/legacy: Hash the string to get 32 bytes
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

        // Combine IV and Ciphertext
        const combined = iv.clone().concat(encrypted.ciphertext);
        return combined.toString(CryptoJS.enc.Base64);
    }

    decrypt(encryptedData: string): string {
        try {
            const combined = CryptoJS.enc.Base64.parse(encryptedData);

            // Extract IV (first 16 bytes)
            const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);

            // Extract Ciphertext
            const ciphertext = CryptoJS.lib.WordArray.create(
                combined.words.slice(4),
                combined.sigBytes - 16
            );

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertext } as any,
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
