import "dotenv/config";
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 8000;


app.post('/api/v1/auth/verify-otp', async (req, res) => {
    const { code, email } = req.body;
    const stored = otpStore.get(email);
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) return res.status(401).json({ success: false, error: 'Invalid code' });
    otpStore.delete(email);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    
    // Find user and send welcome notification
    const user = users.find(u => u.email === email);
    if (user && !user.verified) {
        user.verified = true;
        await transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: email,
            subject: '🎉 Welcome to FLIP Portal!',
            html: `<h2>Welcome ${user.name || 'User'}!</h2><p>Your account has been verified successfully.</p><p>You can now access all features of the FLIP portal including:</p><ul><li>📁 Upload case documents</li><li>📧 Send messages to your solicitor</li><li>📋 Track your cases</li></ul><p>If you have any questions, reply to this email.</p>`,
            text: `Welcome ${user.name || 'User'}! Your FLIP account has been verified. You can now access document uploads, messaging, and case tracking.`
        });
        console.log('📧 Welcome email sent to:', email);
    }
    
    res.json({ success: true, token });
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'] }));
app.options("*", cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';
const users = [{ id: 1, name: 'Victim User', email: 'victim@example.com', password: '1234', verified: true }];
const otpStore = new Map();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'federalpolicy24@gmail.com', pass: 'lqhmzeugehouilbx' }
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1', (req, res) => res.json({ success: true }));

app.post('/api/v1/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) return res.status(409).json({ success: false, error: 'User exists' });
    users.push({ id: users.length + 1, name, email, password, verified: false });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 });
    await transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: email, subject: 'FLIP Verification Code', text: `Your code is: ${code}` });
    res.json({ success: true, message: 'Verification code sent' });
});

app.post('/api/v1/auth/login', async (req, res) => {
    const { vin, pin } = req.body;
    const user = users.find(u => u.email === vin);
    if (!user || user.password !== pin) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(vin, { code, expiresAt: Date.now() + 300000 });
    await transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: vin, subject: 'FLIP Login Code', text: `Your login code is: ${code}` });
    res.json({ success: true, message: 'Verification code sent' });
});

app.post('/api/v1/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 });
    await transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: email, subject: 'FLIP OTP Code', text: `Your OTP code is: ${code}` });
    res.json({ success: true, message: 'OTP sent' });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) cb(null, true);
        else cb(new Error('Invalid file type'), false);
    }
});

app.post('/api/v1/documents/upload', upload.single('document'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
        const fileInfo = { filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, path: req.file.path, uploadedAt: new Date().toISOString() };
        console.log('📄 File uploaded:', fileInfo.originalName);
        res.json({ success: true, message: 'Document uploaded successfully', data: fileInfo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/messages/send', async (req, res) => {
    try {
        const { userName, userEmail, subject, message, caseNumber } = req.body;
        if (!userName || !userEmail || !message) return res.status(400).json({ success: false, error: 'Missing required fields' });
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@flip-system.com';
        await transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: adminEmail,
            subject: `FLIP: Message from ${userName} - ${subject || 'No Subject'}`,
            html: `<h3>New Message from ${userName}</h3><p><strong>From:</strong> ${userName} (${userEmail})</p>${caseNumber ? `<p><strong>Case Number:</strong> ${caseNumber}</p>` : ''}<p><strong>Message:</strong></p><p>${message}</p>`,
            text: `Message from ${userName} (${userEmail})\nCase: ${caseNumber || 'N/A'}\nSubject: ${subject || 'No Subject'}\n\n${message}`
        });
        console.log('📧 Message sent to admin from:', userName);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

app.get('/api/v1/documents', (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) return res.json({ success: true, documents: [] });
        const files = fs.readdirSync(uploadDir).map(filename => {
            const stats = fs.statSync(path.join(uploadDir, filename));
            return { filename, size: stats.size, uploadedAt: stats.birthtime };
        });
        res.json({ success: true, documents: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

 
 

 
app.listen(PORT, '0.0.0.0', () => {

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', 'FLIP', 'dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        // Only serve frontend for non-API routes
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
    console.log('🌐 Serving frontend from:', frontendPath);
}

app.delete('/api/v1/documents/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filename);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/v1/documents/:filename/download', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
    console.log(`✅ Backend running on port ${PORT}`);
    console.log(`📁 POST /api/v1/documents/upload`);
    console.log(`📧 POST /api/v1/messages/send`);
    console.log(`📁 GET /api/v1/documents`);
});

// Delete document endpoint
app.delete('/api/v1/documents/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filename);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download document endpoint
app.get('/api/v1/documents/:filename/download', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default app;
