#!/bin/bash

# Add fs import if not present
if ! grep -q "import fs from 'fs'" server.js; then
    sed -i "1s/^/import fs from 'fs';\n/" server.js
fi

# Add multer and path imports
sed -i "2s/^/import multer from 'multer';\nimport path from 'path';\nimport { fileURLToPath } from 'url';\n/" server.js

# Remove duplicate imports if any
sed -i '/^import fs from/d' server.js
sed -i '1s/^/import fs from '"'"'fs'"'"';\n/' server.js

# Add the new endpoints before app.listen
sed -i '/app.listen/i\
// File upload configuration\
const __filename = fileURLToPath(import.meta.url);\
const __dirname = path.dirname(__filename);\
\
const storage = multer.diskStorage({\
    destination: (req, file, cb) => {\
        const uploadDir = path.join(__dirname, "uploads");\
        if (!fs.existsSync(uploadDir)) {\
            fs.mkdirSync(uploadDir, { recursive: true });\
        }\
        cb(null, uploadDir);\
    },\
    filename: (req, file, cb) => {\
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);\
        cb(null, uniqueSuffix + "-" + file.originalname);\
    }\
});\
\
const upload = multer({ \
    storage: storage,\
    limits: { fileSize: 10 * 1024 * 1024 },\
    fileFilter: (req, file, cb) => {\
        const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt"];\
        const ext = path.extname(file.originalname).toLowerCase();\
        if (allowedTypes.includes(ext)) {\
            cb(null, true);\
        } else {\
            cb(new Error("Invalid file type"), false);\
        }\
    }\
});\
\
app.post("/api/v1/documents/upload", upload.single("document"), (req, res) => {\
    try {\
        if (!req.file) {\
            return res.status(400).json({ success: false, error: "No file uploaded" });\
        }\
        const fileInfo = {\
            filename: req.file.filename,\
            originalName: req.file.originalname,\
            size: req.file.size,\
            path: req.file.path,\
            uploadedAt: new Date().toISOString()\
        };\
        res.json({ success: true, message: "Document uploaded successfully", data: fileInfo });\
    } catch (error) {\
        res.status(500).json({ success: false, error: error.message });\
    }\
});\
\
app.post("/api/v1/messages/send", async (req, res) => {\
    try {\
        const { userName, userEmail, subject, message, caseNumber } = req.body;\
        if (!userName || !userEmail || !message) {\
            return res.status(400).json({ success: false, error: "Missing required fields" });\
        }\
        const adminEmail = process.env.ADMIN_EMAIL || "admin@flip-system.com";\
        await transporter.sendMail({\
            from: "FLIP System <federalpolicy24@gmail.com>",\
            to: adminEmail,\
            subject: `FLIP: Message from ${userName} - ${subject || "No Subject"}`,\
            html: `<h3>New Message from ${userName}</h3><p><strong>From:</strong> ${userName} (${userEmail})</p>${caseNumber ? `<p><strong>Case Number:</strong> ${caseNumber}</p>` : ""}<p><strong>Message:</strong></p><p>${message}</p>`,\
            text: `Message from ${userName} (${userEmail})\nCase: ${caseNumber || "N/A"}\nSubject: ${subject || "No Subject"}\n\n${message}`\
        });\
        res.json({ success: true, message: "Message sent successfully" });\
    } catch (error) {\
        res.status(500).json({ success: false, error: "Failed to send message" });\
    }\
});\
\
app.get("/api/v1/documents", (req, res) => {\
    try {\
        const uploadDir = path.join(__dirname, "uploads");\
        if (!fs.existsSync(uploadDir)) {\
            return res.json({ success: true, documents: [] });\
        }\
        const files = fs.readdirSync(uploadDir).map(filename => {\
            const stats = fs.statSync(path.join(uploadDir, filename));\
            return { filename, size: stats.size, uploadedAt: stats.birthtime };\
        });\
        res.json({ success: true, documents: files });\
    } catch (error) {\
        res.status(500).json({ success: false, error: error.message });\
    }\
});' server.js

echo "✅ server.js updated with document upload and message endpoints"
