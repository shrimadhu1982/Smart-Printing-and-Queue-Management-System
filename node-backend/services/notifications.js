async function createNotification(connection, {
    role,
    recipientId,
    orderId,
    title,
    message
}) {
    await connection.execute(
        `INSERT INTO notifications
         (recipient_role, recipient_id, order_id, title, message)
         VALUES (?, ?, ?, ?, ?)`,
        [role, recipientId, orderId || null, title, message]
    );
}

module.exports = { createNotification };
