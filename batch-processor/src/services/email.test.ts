import { EmailService } from './email';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
    let emailService: EmailService;
    let mockSendMail: jest.Mock;

    beforeEach(() => {
        // Clear environment variables
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;

        mockSendMail = jest.fn();
        (nodemailer.createTransport as jest.Mock).mockReturnValue({
            sendMail: mockSendMail,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should mock sending email when SMTP_HOST is not set', async () => {
        emailService = new EmailService();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
        });

        expect(mockSendMail).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mocking email send'), expect.anything());
        consoleSpy.mockRestore();
    });

    it('should send email when SMTP_HOST is set', async () => {
        process.env.SMTP_HOST = 'smtp.test.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';

        mockSendMail.mockResolvedValue({ messageId: '123' });

        // Re-initialize to pick up env vars
        emailService = new EmailService();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
        });

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com',
            subject: 'Test',
        }));
        expect(consoleSpy).toHaveBeenCalledWith('Email sent: 123');
        consoleSpy.mockRestore();
    });

    it('should throw error when sending fails', async () => {
        process.env.SMTP_HOST = 'smtp.test.com';
        mockSendMail.mockRejectedValue(new Error('SMTP Error'));

        emailService = new EmailService();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
        })).rejects.toThrow('SMTP Error');

        expect(consoleSpy).toHaveBeenCalledWith('Error sending email:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});
