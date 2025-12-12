const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory storage for Vercel (files stored as base64 in metadata)
let fileMetadata = {};

// Initialize metadata structure
const initMetadata = () => {
    if (Object.keys(fileMetadata).length === 0) {
        fileMetadata = {
            morningLab: [],
            morningLabSolution: [],
            morningQuiz: [],
            morningQuizSolution: [],
            afternoonLab: [],
            afternoonLabSolution: [],
            afternoonQuiz: [],
            afternoonQuizSolution: []
        };
    }
};

// Authorized users
const AUTHORIZED_USERS = [
    'bcsf23m020@pucit.edu.pk',
    'bcsf23m002@pucit.edu.pk',
    'bcsf23m018@pucit.edu.pk'
];

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }
    
    if (!AUTHORIZED_USERS.includes(email)) {
        return res.status(401).json({ 
            success: false, 
            message: 'This email is not authorized for TA access' 
        });
    }
    
    const correctPassword = process.env.TA_PASSWORD || 'yaarajeebzindagihai';
    
    if (password !== correctPassword) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid password' 
        });
    }
    
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
    
    res.json({ success: true });
});

// Get all files endpoint
app.get('/api/files', (req, res) => {
    initMetadata();
    res.json({ success: true, files: fileMetadata });
});

// File upload endpoint (base64 data)
app.post('/api/upload', (req, res) => {
    try {
        const { email, category, file } = req.body;
        
        if (!AUTHORIZED_USERS.includes(email)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        if (!file || !file.data || !file.name) {
            return res.status(400).json({ success: false, message: 'File data required' });
        }
        
        initMetadata();
        if (!fileMetadata[category]) {
            fileMetadata[category] = [];
        }
        
        const fileInfo = {
            id: Date.now().toString(),
            name: file.name,
            type: file.type || 'pdf',
            data: file.data, // Base64 data
            uploadedBy: email,
            uploadedAt: new Date().toISOString()
        };
        
        fileMetadata[category].push(fileInfo);
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Error uploading file' });
    }
});

// Delete file endpoint
app.post('/api/delete', (req, res) => {
    try {
        const { email, category, fileName } = req.body;
        
        if (!AUTHORIZED_USERS.includes(email)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        initMetadata();
        if (!fileMetadata[category]) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        const initialLength = fileMetadata[category].length;
        fileMetadata[category] = fileMetadata[category].filter(f => f.name !== fileName);
        
        if (fileMetadata[category].length === initialLength) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        
        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Error deleting file' });
    }
});

// Serve files endpoint
app.get('/api/file/:category/:id', (req, res) => {
    try {
        const { category, id } = req.params;
        initMetadata();
        
        if (!fileMetadata[category]) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        const file = fileMetadata[category].find(f => f.id === id);
        if (!file || !file.data) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        
        // Convert base64 to buffer
        const base64Data = file.data.replace(/^data:.*,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        res.setHeader('Content-Type', file.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.send(buffer);
    } catch (error) {
        console.error('File serve error:', error);
        res.status(500).json({ success: false, message: 'Error serving file' });
    }
});

module.exports = app;

