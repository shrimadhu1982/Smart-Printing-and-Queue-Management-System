const studentRoutes = require('./routes/studentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const queueRoutes = require('./routes/queueRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool, testConnection } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/students', studentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
// Home route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Printing System Node.js API is running!'
    });
});

// Health check route
app.get('/api/health', async (req, res) => {
    try {
        const [tables] = await pool.query('SHOW TABLES');

        res.json({
            success: true,
            status: 'healthy',
            backend: 'Node.js + Express',
            database: process.env.DB_NAME,
            driver: 'mysql',
            tables: tables.map(row => Object.values(row)[0])
        });

        app.use((error, req, res, next) => {
            if (res.headersSent) return next(error);
            if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
                return res.status(400).json({ success: false, message: 'Request body must contain valid JSON' });
            }
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: 'PDF uploads are limited to 10 MB' });
            }
            if (error.message === 'Only PDF files are allowed') {
                return res.status(400).json({ success: false, message: error.message });
            }
            console.error('Unhandled API error:', error.message);
            return res.status(500).json({ success: false, message: 'An unexpected server error occurred' });
        });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            throw new Error('JWT_SECRET must be configured with at least 32 characters');
        }
        await testConnection();

        app.listen(PORT, () => {
            console.log('======================================');
            console.log('Smart Printing System Backend Started');
            console.log(`Server: http://localhost:${PORT}`);
            console.log('Database: MySQL');
            console.log('======================================');
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
