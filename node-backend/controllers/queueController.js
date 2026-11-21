const { pool } = require('../config/db');
const { refreshQueue } = require('../services/queue');

async function getQueue(req, res) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const positions = await refreshQueue(connection);
        const [orders] = await connection.execute(
            `SELECT q.queue_id, q.position, po.order_id, po.order_code, po.status,
                    po.student_id, po.total_pages_billed, po.total_price,
                    d.original_filename, s.full_name AS student_name,
                    s.roll_number, s.department, ps.color_mode, ps.sides, ps.copies, ps.paper_size,
                    q.position AS queue_position, q.estimated_wait_minutes, q.created_at
             FROM queue q
             JOIN print_orders po ON po.order_id = q.order_id
             JOIN documents d ON d.document_id = po.document_id
             JOIN students s ON s.student_id = po.student_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             WHERE po.status IN ('Pending', 'Accepted', 'Printing')
             ORDER BY q.position`
        );
        await connection.commit();
        const visibleOrders = orders.map(order => {
            const isOwner = req.user.role === 'student' && order.student_id === req.user.student_id;
            const visible = { ...order };
            delete visible.student_id;
            if (req.user.role === 'student' && !isOwner) {
                visible.student_name = 'Campus student';
                visible.roll_number = '';
            }
            return visible;
        });
        return res.json({
            success: true,
            queue: visibleOrders,
            count: visibleOrders.length,
            my_orders: positions
                .filter(row => row.student_id === req.user.student_id)
                .map(({ order_id, queue_position, estimated_wait_minutes }) => ({
                    order_id,
                    queue_position,
                    estimated_wait_minutes
                }))
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Queue retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve the printing queue' });
    } finally {
        if (connection) connection.release();
    }
}

async function getMyQueue(req, res) {
    try {
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.status, po.total_pages_billed,
                    po.total_price, po.rejection_reason, d.original_filename,
                    ps.color_mode, ps.sides, ps.copies, ps.paper_size,
                    q.position AS queue_position, q.estimated_wait_minutes
             FROM print_orders po
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             WHERE po.student_id = ?
               AND po.status IN ('Pending', 'Accepted', 'Printing')
             ORDER BY q.position, po.created_at`,
            [req.user.student_id]
        );
        return res.json({ success: true, orders });
    } catch (error) {
        console.error('Student queue lookup error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve your queue status' });
    }
}

module.exports = { getQueue, getMyQueue };
