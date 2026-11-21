
const express = require('express');
const router = express.Router();

const {
    registerStudent,
    loginStudent
} = require('../controllers/studentController');

const { pool } = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { getStudentDashboard } = require('../controllers/studentController');

// Student registration
router.post('/register', registerStudent);

// Student login
router.post('/login', loginStudent);

// Protected student profile
router.get('/dashboard', verifyToken, requireRole('student'), getStudentDashboard);

router.get('/profile', verifyToken, requireRole('student'), async (req, res) => {
    try {
        const [students] = await pool.execute(
            `SELECT student_id, roll_number, full_name, email,
                    phone, department, semester, role, created_at
             FROM students
             WHERE student_id = ? AND is_active = 1`,
            [req.user.student_id]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            student: students[0],
            profile: students[0]
        });

    } catch (error) {
        console.error('Profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not retrieve student profile'
        });
    }
});

router.put('/profile', verifyToken, requireRole('student'), async (req, res) => {
    const { phone = null, department, semester } = req.body;
    const validSemesters = Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`);
    if ((phone !== null && (typeof phone !== 'string' || phone.length > 20)) ||
        typeof department !== 'string' || !department.trim() || department.length > 100 ||
        !validSemesters.includes(semester)) {
        return res.status(400).json({ success: false, message: 'Provide a valid phone, department, and semester' });
    }
    try {
        await pool.execute(
            'UPDATE students SET phone = ?, department = ?, semester = ? WHERE student_id = ? AND is_active = 1',
            [phone?.trim() || null, department.trim(), semester, req.user.student_id]
        );
        return res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update student profile' });
    }
});

module.exports = router;
