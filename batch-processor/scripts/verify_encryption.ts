import * as CryptoJS from 'crypto-js';
import { EncryptionService as ServerEncryptionService } from '../src/utils/encryption';
import dotenv from 'dotenv';

dotenv.config();

// Simulated Client Encryption Service (mimicking VS Code extension)
class ClientEncryptionService {
    private key: CryptoJS.lib.WordArray;

    constructor(keyStr: string) {
        // Ensure we have a 32-byte key.
        if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
            this.key = CryptoJS.enc.Hex.parse(keyStr);
        } else {
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
}

async function verifyEncryption() {
    console.log("Starting End-to-End Encryption Verification...");

    // 1. Setup Keys
    // Use a 64-char hex key for best practice test
    const hexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.ENCRYPTION_KEY = hexKey; // For ServerEncryptionService

    const client = new ClientEncryptionService(hexKey);
    const server = new ServerEncryptionService();

    // 2. Encrypt with Client
    const originalText = "This is a secret prompt containing sensitive info.";
    console.log(`Original Text: "${originalText}"`);

    const encryptedData = client.encrypt(originalText);
    console.log(`Encrypted Data (Base64): ${encryptedData}`);

    // 3. Decrypt with Server
    const decryptedText = server.decrypt(encryptedData);
    console.log(`Decrypted Text: "${decryptedText}"`);

    // 4. Verify
    if (originalText === decryptedText) {
        console.log("SUCCESS: Decrypted text matches original text.");

        // Test Legacy/Passphrase Fallback
        console.log("\nTesting Legacy Passphrase Fallback...");
        const passphrase = "my-secret-passphrase";
        process.env.ENCRYPTION_KEY = passphrase;
        const clientLegacy = new ClientEncryptionService(passphrase);
        const serverLegacy = new ServerEncryptionService();

        const encryptedLegacy = clientLegacy.encrypt(originalText);
        const decryptedLegacy = serverLegacy.decrypt(encryptedLegacy);

        if (originalText === decryptedLegacy) {
             console.log("SUCCESS: Legacy passphrase decryption matches.");
             process.exit(0);
        } else {
             console.error("FAILURE: Legacy passphrase decryption mismatch.");
             console.error(`Expected: "${originalText}"`);
             console.error(`Got: "${decryptedLegacy}"`);
             process.exit(1);
        }

    } else {
        console.error("FAILURE: Decrypted text does not match original text.");
        console.error(`Expected: "${originalText}"`);
        console.error(`Got: "${decryptedText}"`);
        process.exit(1);
    }
}

verifyEncryption();
