const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const { createNotification } = require('../services/notifications');

async function getDashboard(req, res) {
    try {
        const [[metrics]] = await pool.execute(
            `SELECT
                (SELECT COUNT(*) FROM students) AS total_students,
                (SELECT COUNT(*) FROM staff WHERE is_active = 1) AS total_staff,
                COUNT(*) AS total_orders,
                COALESCE(SUM(status = 'Pending'), 0) AS pending_orders,
                COALESCE(SUM(status = 'Completed'), 0) AS completed_orders,
                COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled', 'Rejected') THEN total_price ELSE 0 END), 0) AS total_revenue
             FROM print_orders`
        );
        const [status_distribution] = await pool.execute(
            `SELECT status, COUNT(*) AS count,
                    COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled', 'Rejected') THEN total_price ELSE 0 END), 0) AS revenue
             FROM print_orders GROUP BY status ORDER BY status`
        );
        const [print_types] = await pool.execute(
            `SELECT ps.color_mode, ps.sides, ps.paper_size, COUNT(*) AS count
             FROM print_orders po JOIN print_settings ps ON ps.setting_id = po.setting_id
             GROUP BY ps.color_mode, ps.sides, ps.paper_size
             ORDER BY count DESC LIMIT 10`
        );
        const [recent_orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.total_price, po.status, po.created_at,
                    s.full_name AS student_name, s.department, d.original_filename
             FROM print_orders po
             JOIN students s ON s.student_id = po.student_id
             JOIN documents d ON d.document_id = po.document_id
             ORDER BY po.created_at DESC LIMIT 10`
        );
        return res.json({
            success: true,
            metrics: { ...metrics, total_revenue: Number(metrics.total_revenue) },
            status_distribution,
            print_types,
            recent_orders
        });
    } catch (error) {
        console.error('Admin dashboard error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not load admin dashboard' });
    }
}

async function getStudents(req, res) {
    try {
        const [users] = await pool.execute(
            `SELECT s.student_id, s.roll_number, s.full_name, s.email, s.phone,
                    s.department, s.semester, s.is_active, s.created_at,
                    COUNT(po.order_id) AS total_orders,
                    COALESCE(SUM(CASE WHEN po.status NOT IN ('Cancelled', 'Rejected') THEN po.total_price ELSE 0 END), 0) AS total_spent
             FROM students s LEFT JOIN print_orders po ON po.student_id = s.student_id
             GROUP BY s.student_id ORDER BY s.created_at DESC`
        );
        return res.json({ success: true, users });
    } catch (error) {
        console.error('Admin student list error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve students' });
    }
}

async function toggleStudent(req, res) {
    const studentId = Number(req.params.id);
    if (!Number.isInteger(studentId) || studentId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }
    try {
        const [result] = await pool.execute(
            'UPDATE students SET is_active = NOT is_active WHERE student_id = ?',
            [studentId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        return res.json({ success: true, message: 'Student status updated' });
    } catch (error) {
        console.error('Admin student update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update student' });
    }
}

async function getStaff(req, res) {
    try {
        const [staff] = await pool.execute(
            `SELECT s.staff_id, s.staff_code, s.full_name, s.email, s.phone, s.counter_number,
                    s.is_active, s.created_at, COUNT(po.order_id) AS processed_orders
             FROM staff s LEFT JOIN print_orders po ON po.processed_by_staff_id = s.staff_id
             GROUP BY s.staff_id ORDER BY s.created_at DESC`
        );
        return res.json({ success: true, staff });
    } catch (error) {
        console.error('Admin staff list error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve staff' });
    }
}

async function createStaff(req, res) {
    const { full_name, staff_code, email, phone, counter_number = 'Counter 1', password } = req.body;
    if (typeof full_name !== 'string' || !full_name.trim() ||
        full_name.trim().length > 100 ||
        typeof staff_code !== 'string' || !staff_code.trim() ||
        staff_code.trim().length > 50 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 100 ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 ||
        typeof phone !== 'string' || !phone.trim() ||
        typeof counter_number !== 'string' || !counter_number.trim() || counter_number.trim().length > 50 ||
        phone.trim().length > 20) {
        return res.status(400).json({
            success: false,
            message: 'Provide a name, staff ID, valid email, phone, counter, and password of at least 8 characters'
        });
    }
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            `INSERT INTO staff (staff_code, full_name, email, password_hash, phone, counter_number)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                staff_code.trim(),
                full_name.trim(),
                email.trim().toLowerCase(),
                passwordHash,
                phone.trim(),
                counter_number.trim()
            ]
        );
        return res.status(201).json({
            success: true,
            staff_id: result.insertId,
            staff_code: staff_code.trim(),
            message: 'Staff account created'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A staff account with this ID or email already exists' });
        }
        console.error('Admin staff creation error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not create staff account' });
    }
}

async function updateStaffStatus(req, res) {
    const staffId = Number(req.params.id);
    const { is_active: isActive } = req.body;
    if (!Number.isInteger(staffId) || staffId < 1 || typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Provide a valid staff ID and account status' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE staff SET is_active = ? WHERE staff_id = ? AND is_active <> ?',
            [isActive ? 1 : 0, staffId, isActive ? 1 : 0]
        );
        if (!result.affectedRows) {
            const [staff] = await pool.execute(
                'SELECT staff_id FROM staff WHERE staff_id = ?',
                [staffId]
            );
            if (!staff.length) {
                return res.status(404).json({ success: false, message: 'Staff member not found' });
            }
        }
        return res.json({ success: true, message: `Staff account ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error('Admin staff status update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update staff account status' });
    }
}

async function deactivateStaff(req, res) {
    const staffId = Number(req.params.id);
    if (!Number.isInteger(staffId) || staffId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }
    try {
        const [result] = await pool.execute(
            'UPDATE staff SET is_active = 0 WHERE staff_id = ? AND is_active = 1',
            [staffId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Active staff member not found' });
        }
        return res.json({ success: true, message: 'Staff account deactivated' });
    } catch (error) {
        console.error('Admin staff deactivation error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not deactivate staff account' });
    }
}

async function activateStaff(req, res) {
    const staffId = Number(req.params.id);
    if (!Number.isInteger(staffId) || staffId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }
    try {
        const [result] = await pool.execute(
            'UPDATE staff SET is_active = 1 WHERE staff_id = ? AND is_active = 0',
            [staffId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Inactive staff member not found' });
        }
        return res.json({ success: true, message: 'Staff account activated' });
    } catch (error) {
        console.error('Admin staff activation error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not activate staff account' });
    }
}

async function getPricing(req, res) {
    try {
        const [pricing] = await pool.execute(
            `SELECT price_id, category, display_name, unit_price, description, updated_at
             FROM printing_prices ORDER BY price_id`
        );
        return res.json({ success: true, pricing });
    } catch (error) {
        console.error('Pricing retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve printing prices' });
    }
}

async function updatePricing(req, res) {
    const prices = req.body.prices;
    if (!Array.isArray(prices) || !prices.length) {
        return res.status(400).json({ success: false, message: 'Provide at least one price update' });
    }
    const seen = new Set();
    for (const price of prices) {
        const amount = Number(price.unit_price);
        if (typeof price.category !== 'string' || !price.category ||
            seen.has(price.category) || !Number.isFinite(amount) || amount < 0 || amount > 100000) {
            return res.status(400).json({ success: false, message: 'Each price must have a unique category and a valid non-negative amount' });
        }
        seen.add(price.category);
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        for (const price of prices) {
            const [result] = await connection.execute(
                'UPDATE printing_prices SET unit_price = ? WHERE category = ?',
                [Number(price.unit_price), price.category]
            );
            if (!result.affectedRows) {
                const [[existing]] = await connection.execute(
                    'SELECT price_id FROM printing_prices WHERE category = ?',
                    [price.category]
                );
                if (!existing) throw new Error(`Unknown price category: ${price.category}`);
            }
        }
        await connection.commit();
        return res.json({ success: true, message: 'Printing prices updated' });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.message.startsWith('Unknown price category:')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Pricing update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update printing prices' });
    } finally {
        if (connection) connection.release();
    }
}

async function getOrders(req, res) {
    try {
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.student_id, po.document_id,
                    po.total_pages_billed, po.total_price, po.status, po.rejection_reason,
                    po.special_instructions, po.created_at, po.updated_at, po.completed_at,
                    s.full_name AS student_name, s.roll_number, s.department, s.email AS student_email,
                    d.original_filename, d.total_pages AS doc_pages,
                    ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type,
                    ps.orientation, ps.page_range, ps.binding_type,
                    st.full_name AS staff_name, q.position AS queue_position,
                    q.estimated_wait_minutes
             FROM print_orders po
             JOIN students s ON s.student_id = po.student_id
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN staff st ON st.staff_id = po.processed_by_staff_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             ORDER BY po.created_at DESC`
        );
        return res.json({ success: true, orders });
    } catch (error) {
        console.error('Admin order list error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve orders' });
    }
}

async function getDocuments(req, res) {
    try {
        const [documents] = await pool.execute(
            `SELECT d.document_id, d.student_id, d.original_filename, d.file_size_bytes,
                    d.total_pages, d.mime_type, d.uploaded_at, s.full_name AS student_name,
                    s.roll_number
             FROM documents d JOIN students s ON s.student_id = d.student_id
             ORDER BY d.uploaded_at DESC`
        );
        return res.json({ success: true, documents });
    } catch (error) {
        console.error('Admin document list error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve documents' });
    }
}

async function getReports(req, res) {
    try {
        const [department_stats] = await pool.execute(
            `SELECT s.department, COUNT(po.order_id) AS order_count,
                    COALESCE(SUM(CASE WHEN po.status NOT IN ('Cancelled', 'Rejected') THEN po.total_price ELSE 0 END), 0) AS revenue
             FROM students s LEFT JOIN print_orders po ON po.student_id = s.student_id
             GROUP BY s.department ORDER BY order_count DESC`
        );
        const [color_stats] = await pool.execute(
            `SELECT ps.color_mode, COUNT(po.order_id) AS total_orders,
                    COALESCE(SUM(po.total_pages_billed), 0) AS total_pages,
                    COALESCE(SUM(CASE WHEN po.status NOT IN ('Cancelled', 'Rejected') THEN po.total_price ELSE 0 END), 0) AS total_revenue
             FROM print_orders po JOIN print_settings ps ON ps.setting_id = po.setting_id
             GROUP BY ps.color_mode`
        );
        const [paper_stats] = await pool.execute(
            `SELECT ps.paper_size, COUNT(po.order_id) AS total_orders,
                    COALESCE(SUM(po.total_pages_billed), 0) AS total_pages
             FROM print_orders po JOIN print_settings ps ON ps.setting_id = po.setting_id
             GROUP BY ps.paper_size`
        );
        return res.json({ success: true, department_stats, color_stats, paper_stats });
    } catch (error) {
        console.error('Admin reports error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not generate reports' });
    }
}

module.exports = {
    getDashboard,
    getStudents,
    toggleStudent,
    getStaff,
    createStaff,
    updateStaffStatus,
    deactivateStaff,
    activateStaff,
    getPricing,
    updatePricing,
    getOrders,
    getDocuments,
    getReports
};
