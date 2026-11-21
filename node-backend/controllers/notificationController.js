const { pool } = require('../config/db');

async function getNotifications(req, res) {
    try {
        const role = req.user.role;
        const recipientId = req.user[`${role}_id`];
        const [notifications] = await pool.execute(
            `SELECT notification_id, order_id, title, message, is_read, created_at
             FROM notifications
             WHERE recipient_role = ? AND recipient_id = ?
             ORDER BY created_at DESC
             LIMIT 100`,
            [role, recipientId]
        );
        return res.json({ success: true, notifications });
    } catch (error) {
        console.error('Notification retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve notifications' });
    }
}

async function markNotificationRead(req, res) {
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }
    try {
        const role = req.user.role;
        const recipientId = req.user[`${role}_id`];
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = 1
             WHERE notification_id = ? AND recipient_role = ? AND recipient_id = ?`,
            [notificationId, role, recipientId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        return res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Notification update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update notification' });
    }
}

module.exports = { getNotifications, markNotificationRead };
