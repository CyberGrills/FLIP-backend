import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import { sendOTPCode, sendSolicitorMessage } from './emailService.js';

const app = express();
const PORT = 8000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.options('*', cors());

const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const DATA_FILE = './users.json';

let users = [];
try { if (fs.existsSync(DATA_FILE)) users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
const saveUsers = () => fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

if (users.length === 0) {
    users.push({ id: 1, name: 'Victim User', email: 'victim@example.com', password: '1234', verified: true });
    saveUsers();
}

const otpStore = new Map();

app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1', (req, res) => res.json({ success: true }));

// Register
app.post('/api/v1/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    console.log(`📝 Registration: ${email}`);
    
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ success: false, error: 'User exists' });
    }
    
    users.push({ id: users.length + 1, name, email, password, verified: false });
    saveUsers();
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 5 * 60000 });
    
    // SEND EMAIL
    const emailSent = await sendOTPCode(email, code, 'registration', name);
    
    if (emailSent) {
        console.log(`✅ Email sent to ${email}`);
        res.json({ success: true, message: 'Verification code sent to your email' });
    } else {
        console.log(`⚠️ Email failed, code: ${code}`);
        res.json({ success: true, message: 'Account created. Check console for code.', code: code });
    }
});

// Send OTP - THIS IS WHAT YOU NEED - NOW SENDS EMAIL
app.post('/api/v1/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    
    console.log(`📧 Send OTP request for: ${email}`);
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });
    
    // SEND EMAIL HERE - THIS IS THE FIX
    const emailSent = await sendOTPCode(email, otpCode, 'verification');
    
    if (emailSent) {
        console.log(`✅ OTP email sent to ${email}: ${otpCode}`);
        res.json({ success: true, message: 'Verification code sent to your email' });
    } else {
        console.log(`⚠️ Email failed, but code is: ${otpCode}`);
        res.json({ success: true, message: 'OTP sent (check console for code)' });
    }
});

// Verify OTP
app.post('/api/v1/auth/verify-otp', (req, res) => {
    const { code, email } = req.body;
    
    console.log(`🔐 Verify OTP for: ${email}, Code: ${code}`);
    
    const stored = otpStore.get(email);
    
    if (!stored) {
        return res.status(401).json({ success: false, error: 'No OTP found' });
    }
    
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return res.status(401).json({ success: false, error: 'OTP expired' });
    }
    
    if (stored.code !== code) {
        return res.status(401).json({ success: false, error: 'Invalid code' });
    }
    
    otpStore.delete(email);
    
    const user = users.find(u => u.email === email);
    if (user) user.verified = true;
    saveUsers();
    
    const token = jwt.sign({ email, name: user?.name }, JWT_SECRET, { expiresIn: '24h' });
    
    console.log(`✅ OTP verified for: ${email}`);
    res.json({ success: true, token });
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
    const { vin, pin } = req.body;
    console.log(`🔐 Login attempt: ${vin}`);
    
    const user = users.find(u => u.email === vin);
    
    if (!user || user.password !== pin) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(vin, { code, expiresAt: Date.now() + 5 * 60000 });
    
    // SEND EMAIL FOR LOGIN
    await sendOTPCode(vin, code, 'login', user.name);
    
    console.log(`🔐 Login OTP for ${vin}: ${code}`);
    res.json({ success: true, message: 'Verification code sent to your email' });
});

app.get('/api/v1/cases', (req, res) => res.json({ success: true, cases: [] }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`✅ FLIP Backend Running`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📧 Email sending: ENABLED`);
    console.log(`========================================`);
});

// Send message to solicitor endpoint
app.post('/api/v1/messages/send-to-solicitor', async (req, res) => {
    const { userEmail, userName, caseNumber, message, solicitorEmail } = req.body;
    
    console.log(`📧 Sending message to solicitor: ${solicitorEmail}`);
    
    if (!solicitorEmail || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Solicitor email and message are required' 
        });
    }
    
    try {
        const emailSent = await sendSolicitorMessage(
            solicitorEmail, 
            userName, 
            caseNumber, 
            message, 
            userEmail
        );
        
        if (emailSent) {
            console.log(`✅ Message sent to solicitor: ${solicitorEmail}`);
            res.json({ 
                success: true, 
                message: 'Message sent to solicitor successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send message' 
            });
        }
    } catch (error) {
        console.error('Send to solicitor error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message' 
        });
    }
});
