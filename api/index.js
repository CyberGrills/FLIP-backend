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
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) return res.status(401).json({ success: false, error: 'Invalid code' }).catch(e => console.error('Welcome email failed:', e.message));
    otpStore.delete(email);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30d' }).catch(e => console.error('Welcome email failed:', e.message));
    
    // Find user and send welcome notification
    const user = users.find(u => u.email === email);
    if (user && !user.verified) {
        user.verified = true;
        transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: email,
            subject: '🎉 Welcome to FLIP Portal!',
            html: `<h2>Welcome ${user.name || 'User'}!</h2><p>Your account has been verified successfully.</p><p>You can now access all features of the FLIP portal including:</p><ul><li>📁 Upload case documents</li><li>📧 Send messages to your solicitor</li><li>📋 Track your cases</li></ul><p>If you have any questions, reply to this email.</p>`,
            text: `Welcome ${user.name || 'User'}! Your FLIP account has been verified. You can now access document uploads, messaging, and case tracking.`
        }).catch(e => console.error('Welcome email failed:', e.message));
        console.log('📧 Welcome email sent to:', email);
    }
    
    res.json({ success: true, token }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

app.use(cors({ origin: ['https://flip-jade.vercel.app', 'https://eleven-varmint-boogeyman.ngrok-free.dev', 'http://localhost:5173'], methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'] }));
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
}).catch(e => console.error('Welcome email failed:', e.message));

app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1', (req, res) => res.json({ success: true }));

app.post('/api/v1/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) return res.status(409).json({ success: false, error: 'User exists' }).catch(e => console.error('Welcome email failed:', e.message));
    users.push({ id: users.length + 1, name, email, password, verified: false }).catch(e => console.error('Welcome email failed:', e.message));
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 }).catch(e => console.error('Welcome email failed:', e.message));
    transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: email, subject: 'FLIP Verification Code', text: `Your code is: ${code}` }).catch(e => console.error('Welcome email failed:', e.message));
    res.json({ success: true, message: 'Verification code sent' }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

app.post('/api/v1/auth/login', async (req, res) => {
    const { vin, pin } = req.body;
    const user = users.find(u => u.email === vin);
    if (!user || user.password !== pin) return res.status(401).json({ success: false, error: 'Invalid credentials' }).catch(e => console.error('Welcome email failed:', e.message));
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(vin, { code, expiresAt: Date.now() + 300000 }).catch(e => console.error('Welcome email failed:', e.message));
    transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: vin, subject: 'FLIP Login Code', text: `Your login code is: ${code}` }).catch(e => console.error('Welcome email failed:', e.message));
    res.json({ success: true, message: 'Verification code sent' }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

app.post('/api/v1/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expiresAt: Date.now() + 300000 }).catch(e => console.error('Welcome email failed:', e.message));
    transporter.sendMail({ from: 'federalpolicy24@gmail.com', to: email, subject: 'FLIP OTP Code', text: `Your OTP code is: ${code}` }).catch(e => console.error('Welcome email failed:', e.message));
    res.json({ success: true, message: 'OTP sent' }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }).catch(e => console.error('Welcome email failed:', e.message));
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
}).catch(e => console.error('Welcome email failed:', e.message));

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) cb(null, true);
        else cb(new Error('Invalid file type'), false);
    }
}).catch(e => console.error('Welcome email failed:', e.message));

app.post('/api/v1/documents/upload', upload.single('document'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' }).catch(e => console.error('Welcome email failed:', e.message));
        const fileInfo = { filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, path: req.file.path, uploadedAt: new Date().toISOString() };
        console.log('📄 File uploaded:', fileInfo.originalName);
        res.json({ success: true, message: 'Document uploaded successfully', data: fileInfo }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

app.post('/api/v1/messages/send', async (req, res) => {
    try {
        const { userName, userEmail, subject, message, caseNumber } = req.body;
        if (!userName || !userEmail || !message) return res.status(400).json({ success: false, error: 'Missing required fields' }).catch(e => console.error('Welcome email failed:', e.message));
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@flip-system.com';
        transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: adminEmail,
            subject: `FLIP: Message from ${userName} - ${subject || 'No Subject'}`,
            html: `<h3>New Message from ${userName}</h3><p><strong>From:</strong> ${userName} (${userEmail})</p>${caseNumber ? `<p><strong>Case Number:</strong> ${caseNumber}</p>` : ''}<p><strong>Message:</strong></p><p>${message}</p>`,
            text: `Message from ${userName} (${userEmail})\nCase: ${caseNumber || 'N/A'}\nSubject: ${subject || 'No Subject'}\n\n${message}`
        }).catch(e => console.error('Welcome email failed:', e.message));
        console.log('📧 Message sent to admin from:', userName);
        res.json({ success: true, message: 'Message sent successfully' }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send message' }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

app.get('/api/v1/documents', (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) return res.json({ success: true, documents: [] }).catch(e => console.error('Welcome email failed:', e.message));
        const files = fs.readdirSync(uploadDir).map(filename => {
            const stats = fs.statSync(path.join(uploadDir, filename));
            return { filename, size: stats.size, uploadedAt: stats.birthtime };
        }).catch(e => console.error('Welcome email failed:', e.message));
        res.json({ success: true, documents: files }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

 
 

 

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', 'FLIP', 'dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        // Only serve frontend for non-API routes
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    }).catch(e => console.error('Welcome email failed:', e.message));
    console.log('🌐 Serving frontend from:', frontendPath);
}

app.delete('/api/v1/documents/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' }).catch(e => console.error('Welcome email failed:', e.message));
        }
        
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filename);
        res.json({ success: true, message: 'Document deleted' }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

app.get('/api/v1/documents/:filename/download', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' }).catch(e => console.error('Welcome email failed:', e.message));
        }
        
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

// Delete document endpoint
app.delete('/api/v1/documents/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' }).catch(e => console.error('Welcome email failed:', e.message));
        }
        
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filename);
        res.json({ success: true, message: 'Document deleted' }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

// Download document endpoint
app.get('/api/v1/documents/:filename/download', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' }).catch(e => console.error('Welcome email failed:', e.message));
        }
        
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

 
export default app;

// ========================================
// SOLICITOR ENDPOINTS
// ========================================

// Get all solicitors
app.get('/api/v1/solicitors', (req, res) => {
    const solicitors = getAllSolicitors();
    res.json({ success: true, solicitors }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Assign random solicitor to a case
app.post('/api/v1/solicitors/assign', (req, res) => {
    const { userId, caseNumber } = req.body;
    if (!userId || !caseNumber) {
        return res.status(400).json({ success: false, error: 'userId and caseNumber required' }).catch(e => console.error('Welcome email failed:', e.message));
    }
    const assignment = assignRandomSolicitor(userId, caseNumber);
    res.json({ success: true, assignment }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Rotate solicitor for a case
app.post('/api/v1/solicitors/rotate', (req, res) => {
    const { userId, caseNumber } = req.body;
    const assignment = rotateSolicitor(userId, caseNumber);
    res.json({ success: true, assignment }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// ========================================
// HEARING ENDPOINTS
// ========================================

// Get user hearings
app.get('/api/v1/hearings/:userId', (req, res) => {
    const hearings = getUserHearings(parseInt(req.params.userId));
    res.json({ success: true, hearings }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Add hearing
app.post('/api/v1/hearings', (req, res) => {
    const { userId, caseNumber, hearingDate, court, judge, notes } = req.body;
    if (!userId || !caseNumber || !hearingDate) {
        return res.status(400).json({ success: false, error: 'userId, caseNumber, hearingDate required' }).catch(e => console.error('Welcome email failed:', e.message));
    }
    const hearing = addHearing(userId, caseNumber, hearingDate, court || 'TBD', judge || 'TBD', notes || '');
    
    // Assign solicitor to the case
    assignRandomSolicitor(userId, caseNumber);
    
    res.json({ success: true, hearing }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Check upcoming hearings
app.get('/api/v1/hearings/upcoming', (req, res) => {
    const upcoming = checkUpcomingHearings();
    res.json({ success: true, upcoming }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// ========================================
// NOTIFICATION ENDPOINTS (Admin only)
// ========================================

// Admin sends notification to user
app.post('/api/v1/notifications/send', async (req, res) => {
    const { userId, message, type } = req.body;
    if (!userId || !message) {
        return res.status(400).json({ success: false, error: 'userId and message required' }).catch(e => console.error('Welcome email failed:', e.message));
    }
    
    const notification = addNotification(userId, message, type || 'admin_message');
    
    // Also send email notification
    const user = users.find(u => u.id === userId);
    if (user) {
        transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: user.email,
            subject: `FLIP Notification: ${type || 'Message from Admin'}`,
            html: `<h3>New Notification</h3><p>${message}</p><p>Log in to view: <a href="https://flip-jade.vercel.app">FLIP Portal</a></p>`,
            text: `${message}\n\nLog in: https://flip-jade.vercel.app`
        }).catch(e => console.error('Welcome email failed:', e.message));
    }
    
    res.json({ success: true, notification }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Get user notifications
app.get('/api/v1/notifications/:userId', (req, res) => {
    const notifications = getUserNotifications(parseInt(req.params.userId));
    res.json({ success: true, notifications }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Mark notification as read
app.put('/api/v1/notifications/:id/read', (req, res) => {
    markNotificationRead(parseInt(req.params.id));
    res.json({ success: true }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// ========================================
// Updated message send with notification
// ========================================
app.post('/api/v1/messages/send', async (req, res) => {
    try {
        const { userName, userEmail, subject, message, caseNumber } = req.body;
        if (!userName || !userEmail || !message) {
            return res.status(400).json({ success: false, error: 'Missing required fields' }).catch(e => console.error('Welcome email failed:', e.message));
        }
        const adminEmail = process.env.ADMIN_EMAIL || 'federalpolicy24@gmail.com';
        transporter.sendMail({
            from: '"FLIP System" <federalpolicy24@gmail.com>',
            to: adminEmail,
            subject: `FLIP: Message from ${userName} - ${subject || 'No Subject'}`,
            html: `<h3>New Message from ${userName}</h3><p><strong>From:</strong> ${userName} (${userEmail})</p>${caseNumber ? `<p><strong>Case:</strong> ${caseNumber}</p>` : ''}<p><strong>Message:</strong></p><p>${message}</p>`,
            text: `Message from ${userName} (${userEmail})\nCase: ${caseNumber || 'N/A'}\n\n${message}`
        }).catch(e => console.error('Welcome email failed:', e.message));
        console.log('📧 Message sent to admin from:', userName);
        res.json({ success: true, message: 'Message sent to admin. You will be notified when they respond.' }).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send message' }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

// Get cases for logged-in user
app.get('/api/v1/my-cases', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ success: true, cases: [
        { id: "CASE-2024-001", title: "Theft Investigation", status: "Active", date: "2026-06-15", offence: "Theft" },
        { id: "CASE-2024-002", title: "Fraud Case", status: "Pending", date: "2026-07-20", offence: "Fraud" }
    ]}).catch(e => console.error('Welcome email failed:', e.message));
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Return cases based on user email hash to make them unique per user
        const hash = decoded.email.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
        const userCases = [
            { id: `CASE-${hash}-001`, title: "Case Investigation", status: hash % 3 === 0 ? "Active" : "Pending", date: "2026-06-15", offence: "Theft", officer: "DC Mitchell" },
            { id: `CASE-${hash}-002`, title: "Evidence Review", status: hash % 2 === 0 ? "Closed" : "Active", date: "2026-07-20", offence: "Fraud", officer: "Agent Johnson" },
        ];
        res.json({ success: true, cases: userCases }).catch(e => console.error('Welcome email failed:', e.message));
    } catch {
        res.json({ success: true, cases: [] }).catch(e => console.error('Welcome email failed:', e.message));
    }
}).catch(e => console.error('Welcome email failed:', e.message));

// Get dashboard stats for logged-in user (empty for new users)
app.get('/api/v1/dashboard/stats', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ success: true, stats: { activeCases: 0, resolved: 0, hearings: 0, notifications: 0 } }).catch(e => console.error('Welcome email failed:', e.message));
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.email === decoded.email);
        if (!user) return res.json({ success: true, stats: { activeCases: 0, resolved: 0, hearings: 0, notifications: 0 } }).catch(e => console.error('Welcome email failed:', e.message));
        
        // Only count admin-assigned cases/hearings/notifications
        const userNotifications = notifications.filter(n => n.userId === user.id);
        const userHearings = hearings.filter(h => h.userId === user.id);
        const userCases = cases.filter(c => c.userId === user.id);
        
        res.json({ success: true, stats: {
            activeCases: userCases.filter(c => c.status === 'Active').length,
            resolved: userCases.filter(c => c.status === 'Closed').length,
            hearings: userHearings.length,
            notifications: userNotifications.filter(n => !n.read).length
        }}).catch(e => console.error('Welcome email failed:', e.message));
    } catch { res.json({ success: true, stats: { activeCases: 0, resolved: 0, hearings: 0, notifications: 0 } }).catch(e => console.error('Welcome email failed:', e.message)); }
}).catch(e => console.error('Welcome email failed:', e.message));

// Get user cases (only admin-assigned)
app.get('/api/v1/my-cases', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ success: true, cases: [] }).catch(e => console.error('Welcome email failed:', e.message));
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.email === decoded.email);
        if (!user) return res.json({ success: true, cases: [] }).catch(e => console.error('Welcome email failed:', e.message));
        
        const userCases = cases.filter(c => c.userId === user.id);
        res.json({ success: true, cases: userCases.map(c => ({
            id: c.case_number || `CASE-${c.id}`,
            offence: c.title || 'Case',
            offender: c.offender || 'TBD',
            role: 'Victim',
            hearing: c.hearingDate || 'TBD',
            status: c.status || 'Pending'
        })) }).catch(e => console.error('Welcome email failed:', e.message));
    } catch { res.json({ success: true, cases: [] }).catch(e => console.error('Welcome email failed:', e.message)); }
}).catch(e => console.error('Welcome email failed:', e.message));

// Admin: assign case to user
app.post('/api/v1/admin/assign-case', (req, res) => {
    const { userId, title, offence, status, hearingDate } = req.body;
    const newCase = {
        id: cases.length + 1,
        case_number: `CASE-${Date.now()}`,
        userId,
        title: title || 'New Case',
        offence: offence || 'TBD',
        status: status || 'Active',
        hearingDate: hearingDate || null,
        assignedAt: new Date().toISOString()
    };
    cases.push(newCase);
    
    // Notify user
    addNotification(userId, `📋 New case assigned: ${newCase.title} (${newCase.case_number})`, 'case_assigned');
    
    // Email user
    const user = users.find(u => u.id === userId);
    if (user) {
        transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `New Case Assigned - ${newCase.case_number}`,
            html: `<h3>New Case Assignment</h3><p>Case: ${newCase.title}</p><p>Number: ${newCase.case_number}</p><p>Status: ${newCase.status}</p><p>Log in: <a href="https://flip-jade.vercel.app">FLIP Portal</a></p>`
        }).catch(e => console.error(e));
    }
    
    res.json({ success: true, case: newCase }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Admin: assign hearing to user
app.post('/api/v1/admin/assign-hearing', (req, res) => {
    const { userId, caseId, hearingDate, court, judge } = req.body;
    const newHearing = {
        id: hearings.length + 1,
        userId,
        caseId,
        hearingDate,
        court: court || 'TBD',
        judge: judge || 'TBD',
        status: 'Scheduled',
        createdAt: new Date().toISOString()
    };
    hearings.push(newHearing);
    
    addNotification(userId, `📅 Hearing scheduled for ${new Date(hearingDate).toLocaleDateString()} at ${court || 'TBD'}`, 'hearing_scheduled');
    
    res.json({ success: true, hearing: newHearing }).catch(e => console.error('Welcome email failed:', e.message));
}).catch(e => console.error('Welcome email failed:', e.message));

// Initialize empty data arrays
// redeploy trigger
