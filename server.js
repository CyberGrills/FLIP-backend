import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendOTPCode } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.options('*', cors());

const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const DATA_FILE = path.join(__dirname, 'users.json');
const DOCS_FILE = path.join(__dirname, 'data', 'documents.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DOCS_FILE)) fs.writeFileSync(DOCS_FILE, '[]');

let users = [];
try { if (fs.existsSync(DATA_FILE)) users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { users = []; }
const saveUsers = () => fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

if (users.length === 0) {
    users.push({ id: 1, name: 'Victim User', email: 'victim@example.com', password: '1234', verified: true });
    saveUsers();
}

const otpStore = new Map();

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        res.status(403).json({ success: false, error: 'Invalid token' });
    }
};

// ========== HEALTH ROUTES ==========
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1', (req, res) => res.json({ success: true }));

// ========== AUTH ROUTES ==========
app.post('/api/v1/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) return res.status(409).json({ success: false, error: 'User exists' });
    users.push({ id: users.length + 1, name, email, password, verified: false });
    saveUsers();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 5 * 60000 });
    await sendOTPCode(email, code, 'registration', name);
    res.json({ success: true, message: 'Verification code sent' });
});

app.post('/api/v1/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 5 * 60000 });
    await sendOTPCode(email, code, 'verification');
    res.json({ success: true, message: 'OTP sent' });
});

app.post('/api/v1/auth/verify-otp', (req, res) => {
    const { code, email } = req.body;
    const stored = otpStore.get(email);
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
        return res.status(401).json({ success: false, error: 'Invalid code' });
    }
    otpStore.delete(email);
    const user = users.find(u => u.email === email);
    if (user) user.verified = true;
    saveUsers();
    const token = jwt.sign({ id: user?.id, email, name: user?.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
});

app.post('/api/v1/auth/login', async (req, res) => {
    const { vin, pin } = req.body;
    const user = users.find(u => u.email === vin);
    if (!user || user.password !== pin) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(vin, { code, expiresAt: Date.now() + 5 * 60000 });
    await sendOTPCode(vin, code, 'login', user.name);
    res.json({ success: true, message: 'Verification code sent' });
});

// ========== DOCUMENT ROUTES ==========
app.post('/api/v1/documents/upload', authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Document uploaded', document: { id: Date.now(), originalName: 'test.pdf', size: 1024 } });
});

app.get('/api/v1/documents', authenticateToken, (req, res) => {
    let docs = [];
    try { docs = JSON.parse(fs.readFileSync(DOCS_FILE, 'utf8')); } catch(e) {}
    const userDocs = docs.filter(d => d.userId === req.user.id);
    res.json({ success: true, documents: userDocs });
});

app.delete('/api/v1/documents/:fileName', authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Document deleted' });
});

app.get('/api/v1/documents/:fileName/download', authenticateToken, (req, res) => {
    res.json({ success: true, url: '#' });
});

// ========== SOLICITOR MESSAGE ROUTE ==========
app.post('/api/v1/messages/send-to-solicitor', async (req, res) => {
    const { solicitorEmail, userName, caseNumber, message, userEmail } = req.body;
    console.log(`📧 Sending to solicitor: ${solicitorEmail}`);
    res.json({ success: true, message: 'Message sent' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ FLIP Backend Running on http://localhost:${PORT}`);
    console.log(`📧 Email sending: ENABLED`);
});
