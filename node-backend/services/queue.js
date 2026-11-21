const MINUTES_PER_PAGE = 0.15;
const BASE_QUEUE_MINUTES = 2;

async function refreshQueue(connection) {
    const [lockRows] = await connection.execute(
        'SELECT price_id FROM printing_prices ORDER BY price_id LIMIT 1 FOR UPDATE'
    );
    if (!lockRows.length) {
        throw new Error('Printing prices must be configured before queue updates');
    }

    const [queueRows] = await connection.execute(
        `SELECT q.queue_id, q.order_id, po.student_id, po.total_pages_billed
         FROM queue q
         JOIN print_orders po ON po.order_id = q.order_id
         WHERE po.status IN ('Pending', 'Accepted', 'Printing')
         ORDER BY q.created_at, q.queue_id
         FOR UPDATE`
    );
    const [staleRows] = await connection.execute(
        `SELECT q.queue_id
         FROM queue q
         JOIN print_orders po ON po.order_id = q.order_id
         WHERE po.status NOT IN ('Pending', 'Accepted', 'Printing')
         FOR UPDATE`
    );

    for (const row of staleRows) {
        await connection.execute('DELETE FROM queue WHERE queue_id = ?', [row.queue_id]);
    }

    let cumulativeWait = 0;
    const positions = [];
    for (let index = 0; index < queueRows.length; index += 1) {
        const row = queueRows[index];
        cumulativeWait += Math.ceil(
            BASE_QUEUE_MINUTES + Number(row.total_pages_billed) * MINUTES_PER_PAGE
        );
        const position = index + 1;
        await connection.execute(
            `UPDATE queue
             SET position = ?, estimated_wait_minutes = ?
             WHERE queue_id = ?`,
            [position, cumulativeWait, row.queue_id]
        );
        positions.push({
            order_id: row.order_id,
            student_id: row.student_id,
            queue_position: position,
            estimated_wait_minutes: cumulativeWait
        });
    }

    return positions;
}

module.exports = { refreshQueue };
