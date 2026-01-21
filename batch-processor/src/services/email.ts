import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Use environment variables for SMTP configuration
        // Example: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            if (!process.env.SMTP_HOST) {
                console.log('Mocking email send:', options);
                return;
            }

            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Copilot Analytics" <no-reply@example.com>',
                to: options.to,
                subject: options.subject,
                html: options.html,
            });

            console.log(`Email sent: ${info.messageId}`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}
