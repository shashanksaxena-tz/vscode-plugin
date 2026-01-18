import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Create transporter only if SMTP config is present, otherwise mock it
let transporter: nodemailer.Transporter | null = null;

if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} else {
    console.warn('SMTP configuration missing. Emails will be logged to console only.');
}

let lastCheckTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Start checking from 1 hour ago

async function checkAndSendEmails() {
    console.log('Checking for new quality scores since', lastCheckTime);
    try {
        // Fetch new scores
        const { data: scores, error } = await supabase
            .from('quality_scores')
            .select('*')
            .gt('created_at', lastCheckTime);

        if (error) {
            console.error('Error fetching scores:', error);
            return;
        }

        if (scores && scores.length > 0) {
            console.log(`Found ${scores.length} new scores.`);

            for (const score of scores) {
                // Assuming user_id is the email as per architecture decision
                const email = score.user_id;

                if (email && email.includes('@')) {
                    await sendEmail(email, score);
                } else {
                    console.warn(`Skipping score for ${score.user_id}: Invalid email.`);
                }
            }
        } else {
            console.log('No new scores found.');
        }

        lastCheckTime = new Date().toISOString();

    } catch (e) {
        console.error('Unexpected error in checkAndSendEmails:', e);
    }
}

async function sendEmail(to: string, score: any) {
    if (!transporter) {
        console.log(`[MOCK EMAIL] To: ${to}, Subject: Score ${score.overall_score}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: '"Copilot Analytics" <no-reply@copilot-analytics.com>',
            to: to,
            subject: `Your Weekly Copilot Analytics Score: ${score.overall_score}/100`,
            text: `Your overall score for this week is ${score.overall_score}. Check your dashboard for details.`,
            html: `<p>Your overall score for this week is <strong>${score.overall_score}</strong>.</p><p><a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}">View Dashboard</a></p>`
        });
        console.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (e) {
        console.error(`Failed to send email to ${to}:`, e);
    }
}

// Run immediately on startup
checkAndSendEmails();

// Schedule cron to run every hour
cron.schedule('0 * * * *', checkAndSendEmails);

console.log('Email service started.');
