
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// UPLOAD DOCUMENT
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a PDF document'
            });
        }

        const filePath = req.file.path;

        // Read PDF and count pages
       const fileBuffer = fs.readFileSync(filePath);

const parser = new PDFParse({ data: fileBuffer });

const pdfData = await parser.getInfo();

const totalPages = pdfData.total;

await parser.destroy();
        

        if (!totalPages || totalPages < 1) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'Invalid PDF document'
            });
        }

        // Store document details in MySQL
        const [result] = await pool.execute(
            `INSERT INTO documents
            (student_id, original_filename, stored_filename,
             file_path, file_size_bytes, total_pages, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.student_id,
                req.file.originalname,
                req.file.filename,
                filePath,
                req.file.size,
                totalPages,
                'application/pdf'
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: {
                document_id: result.insertId,
                original_filename: req.file.originalname,
                file_size_bytes: req.file.size,
                total_pages: totalPages,
                download_url: `/api/documents/${result.insertId}/download`
            }
        });

    } catch (error) {
        console.error('Document upload error:', error.message);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Document upload failed'
        });
    }
};

const downloadDocument = async (req, res) => {
    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }
    try {
        const [documents] = await pool.execute(
            `SELECT document_id, student_id, original_filename, stored_filename
             FROM documents WHERE document_id = ?`,
            [documentId]
        );
        if (!documents.length) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const document = documents[0];
        if (req.user.role === 'student' && document.student_id !== req.user.student_id) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const storedFilename = path.basename(document.stored_filename);
        const filePath = path.join(__dirname, '..', 'uploads', storedFilename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'The uploaded file is no longer available' });
        }
        const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `${disposition}; filename="${encodeURIComponent(document.original_filename)}"`
        );
        return res.sendFile(filePath, error => {
            if (error) {
                console.error('Document download error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'Could not download document' });
                }
            }
        });
    } catch (error) {
        console.error('Document retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve document' });
    }
};

// GET STUDENT DOCUMENTS
const getStudentDocuments = async (req, res) => {
    try {
        const [documents] = await pool.execute(
            `SELECT document_id, original_filename, file_size_bytes,
                    total_pages, mime_type, uploaded_at
             FROM documents
             WHERE student_id = ?
             ORDER BY uploaded_at DESC`,
            [req.user.student_id]
        );

        res.json({
            success: true,
            documents: documents.map(document => ({
                ...document,
                download_url: `/api/documents/${document.document_id}/download`
            }))
        });

    } catch (error) {
        console.error('Fetch documents error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve documents'
        });
    }
};

module.exports = {
    uploadDocument,
    getStudentDocuments,
    downloadDocument
};
