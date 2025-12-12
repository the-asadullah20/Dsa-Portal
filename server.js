const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['.pdf', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and DOCX files are allowed'));
        }
    }
});

// File metadata storage
const metadataFile = path.join(__dirname, 'file-metadata.json');

function loadMetadata() {
    if (fs.existsSync(metadataFile)) {
        try {
            const data = fs.readFileSync(metadataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading metadata:', error);
            return {};
        }
    }
    return {};
}

function saveMetadata(metadata) {
    try {
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.error('Error saving metadata:', error);
    }
}

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for GitHub Pages
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static(uploadsDir));

// Authorized users
const AUTHORIZED_USERS = [
    'bcsf23m020@pucit.edu.pk',
    'bcsf23m002@pucit.edu.pk',
    'bcsf23m018@pucit.edu.pk'
];

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }
    
    // Check if user is authorized
    if (!AUTHORIZED_USERS.includes(email)) {
        return res.status(401).json({ 
            success: false, 
            message: 'This email is not authorized for TA access' 
        });
    }
    
    // Check password from environment variable
    const correctPassword = process.env.TA_PASSWORD;
    
    if (!correctPassword) {
        return res.status(500).json({ 
            success: false, 
            message: 'Server configuration error' 
        });
    }
    
    if (password !== correctPassword) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid password' 
        });
    }
    
    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    res.json({
        success: true,
        message: 'Login successful',
        token: token,
        email: email
    });
});

// Verify token endpoint
app.post('/api/verify', (req, res) => {
    const { token, email } = req.body;
    
    if (!token || !email) {
        return res.status(400).json({ success: false });
    }
    
    if (!AUTHORIZED_USERS.includes(email)) {
        return res.status(401).json({ success: false });
    }
    
    // Simple token verification (in production, use proper JWT verification)
    res.json({ success: true });
});

// Get all files endpoint
app.get('/api/files', (req, res) => {
    try {
        const metadata = loadMetadata();
        res.json({ success: true, files: metadata });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error loading files' });
    }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        const { email, category } = req.body;
        
        if (!AUTHORIZED_USERS.includes(email)) {
            // Delete uploaded file if unauthorized
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // Save file metadata
        const metadata = loadMetadata();
        if (!metadata[category]) {
            metadata[category] = [];
        }
        
        const fileInfo = {
            id: Date.now().toString(),
            name: req.file.originalname,
            type: path.extname(req.file.originalname).toLowerCase().substring(1),
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            uploadedBy: email,
            uploadedAt: new Date().toISOString(),
            size: req.file.size
        };
        
        metadata[category].push(fileInfo);
        saveMetadata(metadata);
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Error uploading file' });
    }
});

// Delete file endpoint
app.delete('/api/files/:category/:id', (req, res) => {
    try {
        const { category, id } = req.params;
        const { email } = req.body;
        
        if (!AUTHORIZED_USERS.includes(email)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        const metadata = loadMetadata();
        if (!metadata[category]) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        const fileIndex = metadata[category].findIndex(f => f.id === id);
        if (fileIndex === -1) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        
        const file = metadata[category][fileIndex];
        const filePath = path.join(uploadsDir, file.filename);
        
        // Delete physical file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from metadata
        metadata[category].splice(fileIndex, 1);
        saveMetadata(metadata);
        
        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Error deleting file' });
    }
});

// Export for Vercel
module.exports = app;

// Start server (only if not in Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('Make sure TA_PASSWORD is set in .env file');
    });
}

