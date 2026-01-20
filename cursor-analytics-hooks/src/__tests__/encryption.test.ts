import { EncryptionService } from '../services/encryption';
import CryptoJS from 'crypto-js';

describe('EncryptionService', () => {
    let service: EncryptionService;
    const testKey = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'; // 32 bytes hex

    beforeEach(() => {
        process.env.ENCRYPTION_KEY = testKey;
        service = new EncryptionService();
    });

    afterEach(() => {
        delete process.env.ENCRYPTION_KEY;
    });

    test('should encrypt and decrypt correctly', () => {
        const originalText = 'Hello World';
        const encrypted = service.encrypt(originalText);
        const decrypted = service.decrypt(encrypted);

        expect(decrypted).toBe(originalText);
    });

    test('should produce different ciphertexts for same input (random IV)', () => {
        const text = 'Secret';
        const enc1 = service.encrypt(text);
        const enc2 = service.encrypt(text);

        expect(enc1).not.toBe(enc2);
        expect(service.decrypt(enc1)).toBe(text);
        expect(service.decrypt(enc2)).toBe(text);
    });

    test('should handle legacy/non-hex keys by hashing', () => {
        process.env.ENCRYPTION_KEY = 'simple-passphrase';
        const service2 = new EncryptionService();

        const text = 'Legacy';
        const encrypted = service2.encrypt(text);
        const decrypted = service2.decrypt(encrypted);

        expect(decrypted).toBe(text);
    });

    test('should return empty string on decryption failure', () => {
        const invalidBase64 = 'not-valid-base64';
        const result = service.decrypt(invalidBase64);
        expect(result).toBe('');
    });
});
