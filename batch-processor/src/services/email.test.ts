
import { EmailService } from './email';

describe('EmailService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('should log email details when SMTP_HOST is missing (mock mode)', async () => {
        delete process.env.SMTP_HOST;

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const service = new EmailService();

        await service.sendEmail({
            to: 'test@example.com',
            subject: 'Test Subject',
            html: '<p>Body</p>'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Mocking email send:', expect.objectContaining({
            to: 'test@example.com',
            subject: 'Test Subject'
        }));

        consoleSpy.mockRestore();
    });

    test('should attempt to send email when SMTP_HOST is present', async () => {
        process.env.SMTP_HOST = 'smtp.test.com';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';

        // Mock nodemailer createTransport
        const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
        const nodemailer = require('nodemailer');
        jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
            sendMail: sendMailMock
        });

        // Re-import to get fresh class with mocked nodemailer if needed,
        // but here we are mocking the module method which is called in constructor
        const { EmailService: FreshEmailService } = require('./email');
        const service = new FreshEmailService();

        await service.sendEmail({
            to: 'real@example.com',
            subject: 'Real Subject',
            html: '<p>Real Body</p>'
        });

        expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
            to: 'real@example.com',
            subject: 'Real Subject'
        }));
    });
});
