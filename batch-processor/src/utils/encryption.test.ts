import { EncryptionService } from './encryption';
import * as CryptoJS from 'crypto-js';

describe('EncryptionService', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should initialize with key from environment variable', () => {
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const service = new EncryptionService();
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should initialize with SHA256 hashed key if key is not hex', () => {
        process.env.ENCRYPTION_KEY = 'my-secret-passphrase';
        const service = new EncryptionService();
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should use default key if env is missing', () => {
        delete process.env.ENCRYPTION_KEY;
        const service = new EncryptionService();
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should encrypt and decrypt data correctly', () => {
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const service = new EncryptionService();
        const originalText = 'Hello World! This is a test.';
        const encrypted = service.encrypt(originalText);

        expect(encrypted).not.toBe(originalText);

        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(originalText);
    });

    it('should handle decryption failures gracefully', () => {
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const service = new EncryptionService();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Malformed input that might cause issues, or at least return empty string
        const result = service.decrypt('invalid-base64-content');

        expect(result).toBe('');

        // If it throws, it logs. If it handles internally, it returns empty.
        // We accept both behaviors as "graceful".

        consoleSpy.mockRestore();
    });

    it('should verify IV usage (different output for same input)', () => {
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const service = new EncryptionService();
        const input = 'test data';

        const enc1 = service.encrypt(input);
        const enc2 = service.encrypt(input);

        expect(enc1).not.toBe(enc2);
        expect(service.decrypt(enc1)).toBe(input);
        expect(service.decrypt(enc2)).toBe(input);
    });
});
