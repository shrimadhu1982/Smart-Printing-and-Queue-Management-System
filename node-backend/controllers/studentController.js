
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyPassword } = require('../utils/passwords');

const getStudentDashboard = async (req, res) => {
    try {
        const [students] = await pool.execute(
            `SELECT student_id, roll_number, full_name, email, department, semester
             FROM students WHERE student_id = ? AND is_active = 1`,
            [req.user.student_id]
        );
        if (!students.length) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        const [[stats]] = await pool.execute(
            `SELECT COUNT(*) AS total_orders,
                    COALESCE(SUM(status IN ('Pending', 'Accepted', 'Printing')), 0) AS pending_orders,
                    COALESCE(SUM(status = 'Completed'), 0) AS completed_orders,
                    COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled', 'Rejected') THEN total_price ELSE 0 END), 0) AS total_spent
             FROM print_orders WHERE student_id = ?`,
            [req.user.student_id]
        );
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.document_id, d.original_filename,
                    po.total_pages_billed, po.total_price, po.status, po.rejection_reason,
                    po.created_at, ps.color_mode, ps.sides, ps.copies, ps.paper_size,
                    q.position AS queue_position, q.estimated_wait_minutes
             FROM print_orders po
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             WHERE po.student_id = ?
             ORDER BY po.created_at DESC LIMIT 10`,
            [req.user.student_id]
        );
        const activeOrder = orders.find(order =>
            ['Pending', 'Accepted', 'Printing'].includes(order.status)
        ) || null;
        return res.json({
            success: true,
            student: students[0],
            stats: {
                ...stats,
                total_orders: Number(stats.total_orders),
                pending_orders: Number(stats.pending_orders),
                completed_orders: Number(stats.completed_orders),
                total_spent: Number(stats.total_spent).toFixed(2),
                current_queue_position: activeOrder?.queue_position || null
            },
            active_order: activeOrder,
            recent_orders: orders
        });
    } catch (error) {
        console.error('Student dashboard error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not load student dashboard' });
    }
};

// STUDENT REGISTRATION
const registerStudent = async (req, res) => {
    try {
        let {
            roll_number,
            full_name,
            email,
            phone,
            department,
            semester,
            password
        } = req.body;

        roll_number = typeof roll_number === 'string' ? roll_number.trim() : '';
        full_name = typeof full_name === 'string' ? full_name.trim() : '';
        email = typeof email === 'string' ? email.trim().toLowerCase() : '';
        department = typeof department === 'string' ? department.trim() : '';

        // Validate required fields
        const validSemesters = Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`);
        if (
            !roll_number ||
            !full_name ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            !department ||
            typeof password !== 'string' ||
            (phone != null && typeof phone !== 'string') ||
            roll_number.length > 50 ||
            full_name.length > 100 ||
            email.length > 100 ||
            department.length > 100 ||
            (phone != null && phone.length > 20) ||
            (semester != null && !validSemesters.includes(semester))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                success: false,
                message: 'Password must be between 8 and 72 bytes'
            });
        }

        // Check whether roll number or email already exists
        const [existing] = await pool.execute(
            'SELECT student_id FROM students WHERE roll_number = ? OR email = ?',
            [roll_number, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Roll number or email already registered'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert student
        const [result] = await pool.execute(
            `INSERT INTO students
            (roll_number, full_name, email, phone, department, semester, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                roll_number,
                full_name,
                email,
                phone || null,
                department,
                semester || 'Semester 4',
                password_hash
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student_id: result.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Roll number or email already registered'
            });
        }
        console.error('Registration error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Student registration failed'
        });
    }
};

// STUDENT LOGIN
const loginStudent = async (req, res) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const { password } = req.body;

        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const [students] = await pool.execute(
            `SELECT student_id, roll_number, full_name, email,
                    department, semester, password_hash, role, is_active
             FROM students
             WHERE email = ?`,
            [email]
        );

        if (students.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const student = students[0];

        if (!student.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive'
            });
        }

        const validPassword = await verifyPassword(password, student.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                student_id: student.student_id,
                role: student.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            student: {
                student_id: student.student_id,
                roll_number: student.roll_number,
                full_name: student.full_name,
                email: student.email,
                department: student.department,
                semester: student.semester,
                role: student.role
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Student login failed'
        });
    }
};

module.exports = {
    registerStudent,
    loginStudent,
    getStudentDashboard
};
