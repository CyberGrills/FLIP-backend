import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';

// Store users in memory
const users = [{ id: 1, name: 'Victim User', email: 'victim@example.com', password: '1234', verified: true }];
const otpStore = new Map();

// Email setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'federalpolicy24@gmail.com', pass: 'lqhmzeugehouilbx' }
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1', (req, res) => res.json({ success: true }));

app.post('/api/v1/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ success: false, error: 'User exists' });
    }
    users.push({ id: users.length + 1, name, email, password, verified: false });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 });
    
    await transporter.sendMail({
        from: 'federalpolicy24@gmail.com',
        to: email,
        subject: 'FLIP Verification Code',
        text: `Your code is: ${code}`
    });
    
    res.json({ success: true, message: 'Verification code sent' });
});

app.post('/api/v1/auth/login', async (req, res) => {
    const { vin, pin } = req.body;
    const user = users.find(u => u.email === vin);
    if (!user || user.password !== pin) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(vin, { code, expiresAt: Date.now() + 300000 });
    
    await transporter.sendMail({
        from: 'federalpolicy24@gmail.com',
        to: vin,
        subject: 'FLIP Login Code',
        text: `Your login code is: ${code}`
    });
    
    res.json({ success: true, message: 'Verification code sent' });
});

app.post('/api/v1/auth/verify-otp', (req, res) => {
    const { code, email } = req.body;
    const stored = otpStore.get(email);
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
        return res.status(401).json({ success: false, error: 'Invalid code' });
    }
    otpStore.delete(email);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
});

app.post('/api/v1/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 });
    
    await transporter.sendMail({
        from: 'federalpolicy24@gmail.com',
        to: email,
        subject: 'FLIP OTP Code',
        text: `Your OTP code is: ${code}`
    });
    
    res.json({ success: true, message: 'OTP sent' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
