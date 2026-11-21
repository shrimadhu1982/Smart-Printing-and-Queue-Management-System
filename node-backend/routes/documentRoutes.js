
const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
    uploadDocument,
    getStudentDocuments,
    downloadDocument
} = require('../controllers/documentController');

// Upload PDF document (protected)
router.post(
    '/upload',
    verifyToken,
    requireRole('student'),
    upload.single('document'),
    uploadDocument
);

// Get all documents uploaded by logged-in student
router.get(
    '/',
    verifyToken,
    requireRole('student'),
    getStudentDocuments
);

router.get(
    '/:id/download',
    verifyToken,
    requireRole('student', 'staff', 'admin'),
    downloadDocument
);

module.exports = router;
