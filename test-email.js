import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testEmail() {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: 'shefchristiantus@gmail.com',  // Send to yourself for testing
            subject: 'FLIP Test Email',
            text: 'If you receive this, email is working!',
            html: '<h2>FLIP Test</h2><p>Email configuration is working!</p>'
        });
        console.log('✅ Email sent! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email failed:', error.message);
    }
}

testEmail();
