const { pool } = require('../config/db');
const { createNotification } = require('../services/notifications');
const { refreshQueue } = require('../services/queue');

async function getDashboard(req, res) {
    try {
        const [counts] = await pool.execute(
            `SELECT status, COUNT(*) AS order_count
             FROM print_orders
             WHERE status IN ('Pending', 'Accepted', 'Printing', 'Completed')
             GROUP BY status`
        );
        const stats = { pending_count: 0, accepted_count: 0, printing_count: 0, completed_count: 0, queue_length: 0, pages_queued: 0 };
        for (const row of counts) {
            if (row.status === 'Pending') stats.pending_count = Number(row.order_count);
            if (row.status === 'Accepted') stats.accepted_count = Number(row.order_count);
            if (row.status === 'Printing') stats.printing_count = Number(row.order_count);
            if (row.status === 'Completed') stats.completed_count = Number(row.order_count);
        }
        const [[queueStats]] = await pool.execute(
            `SELECT COUNT(*) AS queue_length, COALESCE(SUM(po.total_pages_billed), 0) AS pages_queued
             FROM queue q JOIN print_orders po ON po.order_id = q.order_id
             WHERE po.status IN ('Pending', 'Accepted', 'Printing')`
        );
        const [[staff]] = await pool.execute(
            `SELECT staff_id, full_name, email, phone, counter_number
             FROM staff WHERE staff_id = ? AND is_active = 1`,
            [req.user.staff_id]
        );
        stats.queue_length = Number(queueStats.queue_length);
        stats.pages_queued = Number(queueStats.pages_queued);
        return res.json({ success: true, staff, stats });
    } catch (error) {
        console.error('Staff dashboard error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not load staff dashboard' });
    }
}

async function getOrders(req, res) {
    const status = req.query.status;
    const validStatuses = ['Pending', 'Accepted', 'Printing', 'Completed', 'Rejected', 'Cancelled'];
    if (status && status !== 'all' && !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid order status filter' });
    }
    try {
        const params = [];
        let statusClause = '';
        if (status && status !== 'all') {
            statusClause = 'WHERE po.status = ?';
            params.push(status);
        }
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.student_id, po.document_id,
                    po.total_pages_billed, po.total_price, po.status, po.rejection_reason,
                    po.special_instructions, po.created_at, po.updated_at,
                    s.full_name AS student_name, s.roll_number, s.department,
                    s.phone AS student_phone, d.original_filename,
                    d.total_pages AS doc_pages,
                    ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type,
                    ps.orientation, ps.page_range, ps.binding_type,
                    q.position AS queue_position, q.estimated_wait_minutes
             FROM print_orders po
             JOIN students s ON s.student_id = po.student_id
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             ${statusClause}
             ORDER BY FIELD(po.status, 'Pending', 'Accepted', 'Printing', 'Completed', 'Rejected', 'Cancelled'),
                      q.position, po.created_at`
            , params
        );
        return res.json({ success: true, count: orders.length, orders });
    } catch (error) {
        console.error('Staff order retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve print orders' });
    }
}

async function updateOrderStatus(req, res) {
    const orderId = Number(req.params.id);
    const { status, rejection_reason: rejectionReason } = req.body;
    if (!Number.isInteger(orderId) || orderId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    if (!['Accepted', 'Rejected', 'Printing', 'Completed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    if (status === 'Rejected' && (typeof rejectionReason !== 'string' || !rejectionReason.trim())) {
        return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [orders] = await connection.execute(
            `SELECT order_id, order_code, student_id, status
             FROM print_orders WHERE order_id = ? FOR UPDATE`,
            [orderId]
        );
        if (!orders.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orders[0];
        const reason = status === 'Rejected' ? rejectionReason.trim() : null;
        const transitions = {
            Pending: ['Accepted', 'Rejected'],
            Accepted: ['Printing', 'Rejected'],
            Printing: ['Completed']
        };
        if (!transitions[order.status]?.includes(status)) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: `Order cannot transition from ${order.status} to ${status}`
            });
        }

        await connection.execute(
            `UPDATE print_orders
             SET status = ?, rejection_reason = ?,
                 processed_by_staff_id = ?,
                 completed_at = CASE WHEN ? = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
             WHERE order_id = ?`,
            [
                status,
                reason,
                req.user.staff_id || null,
                status,
                orderId
            ]
        );
        if (['Rejected', 'Completed'].includes(status)) {
            await connection.execute('DELETE FROM queue WHERE order_id = ?', [orderId]);
        }
        await refreshQueue(connection);

        const eventMessages = {
            Accepted: ['Order accepted', `Your print order ${order.order_code} has been accepted and is in the queue.`],
            Rejected: ['Order rejected', `Your print order ${order.order_code} was rejected: ${reason}`],
            Printing: ['Printing started', `Printing has started for order ${order.order_code}.`],
            Completed: ['Order completed', `Your print order ${order.order_code} is complete and ready for pickup.`]
        };
        const [title, message] = eventMessages[status];
        await createNotification(connection, {
            role: 'student',
            recipientId: order.student_id,
            orderId,
            title,
            message
        });
        await connection.commit();
        return res.json({ success: true, message: `Order marked ${status.toLowerCase()}`, order_id: orderId, status });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Staff order update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update order status' });
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { getDashboard, getOrders, updateOrderStatus };
