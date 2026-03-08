import * as vscode from 'vscode';
import { EncryptionService } from './encryption';
import * as CryptoJS from 'crypto-js';

// Mock VS Code
jest.mock('vscode');

describe('EncryptionService', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        jest.clearAllMocks();
        originalEnv = process.env;
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should initialize with key from config', () => {
        const configKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(configKey),
        });

        const service = new EncryptionService();
        // Since key is private, we can verify by encrypting something and decrypting it
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should initialize with key from env', () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
        });
        const envKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        process.env.ENCRYPTION_KEY = envKey;

        const service = new EncryptionService();
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should initialize with SHA256 hashed key if key is not hex', () => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue('my-secret-passphrase'),
        });

        const service = new EncryptionService();
        const encrypted = service.encrypt('test');
        expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should encrypt and decrypt data correctly', () => {
        const configKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(configKey),
        });

        const service = new EncryptionService();
        const originalText = 'Hello World! This is a test.';
        const encrypted = service.encrypt(originalText);

        expect(encrypted).not.toBe(originalText);

        // Ensure it's valid Base64
        expect(() => atob(encrypted)).not.toThrow();

        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(originalText);
    });

    it('should handle decryption failures gracefully', () => {
        const configKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(configKey),
        });

        const service = new EncryptionService();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = service.decrypt('invalid-base64-content');

        expect(result).toBe('');
        // expect(consoleSpy).toHaveBeenCalled(); // The implementation logs errors

        consoleSpy.mockRestore();
    });

    it('should verify IV usage (different output for same input)', () => {
        const configKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue(configKey),
        });

        const service = new EncryptionService();
        const input = 'test data';

        const enc1 = service.encrypt(input);
        const enc2 = service.encrypt(input);

        expect(enc1).not.toBe(enc2);
        expect(service.decrypt(enc1)).toBe(input);
        expect(service.decrypt(enc2)).toBe(input);
    });
});
