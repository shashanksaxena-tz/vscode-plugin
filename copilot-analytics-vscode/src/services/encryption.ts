import * as CryptoJS from 'crypto-js';
import * as vscode from 'vscode';

export class EncryptionService {
    private secretKey: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('copilotAnalytics');
        const configKey = config.get('encryptionKey') as string;
        const envKey = process.env.ENCRYPTION_KEY;

        // Priority: Config > Env > Default
        this.secretKey = configKey || envKey || 'default-dev-key-do-not-use-in-prod';

        if (!configKey && !envKey) {
            console.warn('Encryption key not configured. Using default insecure key.');
        }
    }

    encrypt(data: string): string {
        return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    }

    decrypt(encryptedData: string): string {
        const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}
