const { pool } = require('../config/db');
const crypto = require('crypto');
const { refreshQueue } = require('../services/queue');
const { createNotification } = require('../services/notifications');

const ALLOWED_OPTIONS = {
    color_mode: ['bw', 'color'],
    sides: ['single', 'double'],
    paper_size: ['A4', 'A3'],
    paper_type: ['standard', 'premium', 'glossy'],
    orientation: ['portrait', 'landscape'],
    binding_type: ['none', 'staple', 'spiral', 'hardbound']
};

function getSettings(body) {
    return {
        color_mode: body.color_mode ?? 'bw',
        sides: body.sides ?? 'single',
        copies: body.copies ?? 1,
        paper_size: body.paper_size ?? 'A4',
        paper_type: body.paper_type ?? 'standard',
        orientation: body.orientation ?? 'portrait',
        page_range: body.page_range ?? 'all',
        binding_type: body.binding_type ?? 'none'
    };
}

function countSelectedPages(pageRange, totalPages) {
    if (typeof pageRange !== 'string') {
        throw new Error('Invalid page range');
    }
    if (!pageRange.trim() || pageRange.trim().toLowerCase() === 'all') {
        return totalPages;
    }
    const selected = new Set();
    for (const part of pageRange.split(',')) {
        const range = part.trim().split('-').map(value => value.trim());
        if (range.length > 2 || range.some(value => !/^\d+$/.test(value))) {
            throw new Error('Invalid page range');
        }
        const start = Number(range[0]);
        const end = range.length === 1 ? start : Number(range[1]);
        if (start < 1 || end < start || end > totalPages) {
            throw new Error(`Page range must be between 1 and ${totalPages}`);
        }
        for (let page = start; page <= end; page += 1) selected.add(page);
    }
    return selected.size;
}

function validateSettings(settings) {
    for (const [field, values] of Object.entries(ALLOWED_OPTIONS)) {
        if (!values.includes(settings[field])) {
            throw new Error(`Invalid ${field}`);
        }
    }
    const copies = Number(settings.copies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
        throw new Error('Copies must be between 1 and 100');
    }
    if (typeof settings.page_range !== 'string' || settings.page_range.length > 100) {
        throw new Error('Page range must be 100 characters or fewer');
    }
    return { ...settings, copies };
}

async function calculatePrice(connection, settings, totalDocumentPages) {
    const pagesToPrint = countSelectedPages(settings.page_range, totalDocumentPages);
    const totalPagesBilled = pagesToPrint * settings.copies;
    const totalSheets = (
        settings.sides === 'double' ? Math.ceil(pagesToPrint / 2) : pagesToPrint
    ) * settings.copies;
    const categories = [
        settings.sides === 'single' ? 'bw_single' : 'bw_double',
        settings.sides === 'single' ? 'color_single' : 'color_double',
        'a3_multiplier',
        `paper_${settings.paper_type}`,
        `bind_${settings.binding_type}`
    ];
    const placeholders = categories.map(() => '?').join(',');
    const [priceRows] = await connection.execute(
        `SELECT category, unit_price FROM printing_prices WHERE category IN (${placeholders})`,
        categories
    );
    const prices = Object.fromEntries(priceRows.map(row => [row.category, Number(row.unit_price)]));
    if (priceRows.length !== categories.length) {
        throw new Error('Printing prices are not fully configured');
    }

    const baseRate = prices[categories[0]];
    const selectedRate = settings.color_mode === 'color' ? prices[categories[1]] : baseRate;
    const a3Multiplier = settings.paper_size === 'A3' ? prices.a3_multiplier : 1;
    const basePricePerPage = baseRate * a3Multiplier;
    const colorSurcharge = settings.color_mode === 'color'
        ? (selectedRate - baseRate) * a3Multiplier
        : 0;
    const paperSurcharge = prices[`paper_${settings.paper_type}`] * totalSheets;
    const bindingPrice = prices[`bind_${settings.binding_type}`] * settings.copies;
    const printingCost = selectedRate * a3Multiplier * totalPagesBilled;
    const totalPrice = Number((printingCost + paperSurcharge + bindingPrice).toFixed(2));

    return {
        pages_to_print: pagesToPrint,
        total_pages_billed: totalPagesBilled,
        total_sheets: totalSheets,
        base_price_per_page: Number(basePricePerPage.toFixed(2)),
        color_surcharge: Number(colorSurcharge.toFixed(2)),
        paper_surcharge: Number(paperSurcharge.toFixed(2)),
        binding_price: Number(bindingPrice.toFixed(2)),
        total_price: totalPrice
    };
}

function sendValidationError(res, error) {
    if (
        error.message === 'Invalid page range' ||
        error.message.startsWith('Page range') ||
        error.message.startsWith('Invalid ') ||
        error.message.startsWith('Copies must')
    ) {
        return res.status(400).json({ success: false, message: error.message });
    }
    return null;
}

async function getOwnedDocument(connection, documentId, studentId) {
    const [documents] = await connection.execute(
        `SELECT document_id, total_pages FROM documents
         WHERE document_id = ? AND student_id = ?`,
        [documentId, studentId]
    );
    return documents[0] || null;
}

async function calculateQuote(req, res) {
    const documentId = Number(req.body.document_id);
    if (!Number.isInteger(documentId) || documentId < 1) {
        return res.status(400).json({ success: false, message: 'A valid document_id is required' });
    }
    const submittedSettings = req.body.settings && typeof req.body.settings === 'object'
        ? { ...req.body.settings, document_id: undefined }
        : req.body;
    let connection;
    try {
        const settings = validateSettings(getSettings(submittedSettings));
        connection = await pool.getConnection();
        const document = await getOwnedDocument(connection, documentId, req.user.student_id);
        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const pricing_breakdown = await calculatePrice(connection, settings, document.total_pages);
        return res.json({ success: true, pricing_breakdown });
    } catch (error) {
        const validationResponse = sendValidationError(res, error);
        if (validationResponse) return validationResponse;
        console.error('Quote calculation error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not calculate print price' });
    } finally {
        if (connection) connection.release();
    }
}

async function createOrder(req, res) {
    const documentId = Number(req.body.document_id);
    if (!Number.isInteger(documentId) || documentId < 1) {
        return res.status(400).json({ success: false, message: 'A valid document_id is required' });
    }
    let connection;
    try {
        const settings = validateSettings(getSettings(
            req.body.settings && typeof req.body.settings === 'object'
                ? req.body.settings
                : req.body
        ));
        const specialInstructions = req.body.special_instructions;
        if (specialInstructions != null &&
            (typeof specialInstructions !== 'string' || specialInstructions.length > 1000)) {
            return res.status(400).json({ success: false, message: 'Special instructions must be 1000 characters or fewer' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();
        const document = await getOwnedDocument(connection, documentId, req.user.student_id);
        if (!document) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const price = await calculatePrice(connection, settings, document.total_pages);
        const [settingsResult] = await connection.execute(
            `INSERT INTO print_settings
             (color_mode, sides, copies, paper_size, paper_type, orientation,
              page_range, binding_type, pages_to_print)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                settings.color_mode, settings.sides, settings.copies, settings.paper_size,
                settings.paper_type, settings.orientation, settings.page_range,
                settings.binding_type, price.pages_to_print
            ]
        );
        const orderCode = `SP${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const [orderResult] = await connection.execute(
            `INSERT INTO print_orders
             (order_code, student_id, document_id, setting_id, total_pages_billed,
              base_price_per_page, color_surcharge, paper_surcharge, binding_price,
              total_price, special_instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderCode, req.user.student_id, documentId, settingsResult.insertId,
                price.total_pages_billed, price.base_price_per_page, price.color_surcharge,
                price.paper_surcharge, price.binding_price, price.total_price,
                specialInstructions?.trim() || null
            ]
        );
        const orderId = orderResult.insertId;
        await connection.execute(
            'INSERT INTO queue (order_id, position, estimated_wait_minutes) VALUES (?, 0, 0)',
            [orderId]
        );
        const positions = await refreshQueue(connection);
        const queueStatus = positions.find(row => row.order_id === orderId);
        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Print order created successfully',
            order: {
                order_id: orderId,
                order_code: orderCode,
                total_pages_billed: price.total_pages_billed,
                queue_position: queueStatus?.queue_position,
                estimated_wait_minutes: queueStatus?.estimated_wait_minutes,
                ...price,
                status: 'Pending'
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        const validationResponse = sendValidationError(res, error);
        if (validationResponse) return validationResponse;
        console.error('Create order error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not create print order' });
    } finally {
        if (connection) connection.release();
    }
}

async function getStudentOrders(req, res) {
    try {
        const status = req.query.status;
        const validStatuses = ['Pending', 'Accepted', 'Printing', 'Completed', 'Rejected', 'Cancelled'];
        if (status && status !== 'all' && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status filter' });
        }
        const statusClause = status && status !== 'all' ? 'AND po.status = ?' : '';
        const params = statusClause
            ? [req.user.student_id, status]
            : [req.user.student_id];
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.document_id, d.original_filename,
                    d.total_pages AS doc_pages, d.file_size_bytes,
                    po.total_pages_billed, po.total_price, po.status, po.rejection_reason,
                    po.special_instructions, po.created_at, po.updated_at, po.completed_at,
                    ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type,
                    ps.orientation, ps.page_range, ps.binding_type,
                    q.position AS queue_position, q.estimated_wait_minutes
             FROM print_orders po
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             WHERE po.student_id = ?
             ${statusClause}
             ORDER BY po.created_at DESC`,
            params
        );
        return res.json({ success: true, count: orders.length, orders });
    } catch (error) {
        console.error('Get student orders error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve student orders' });
    }
}

async function getOrderDetails(req, res) {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    try {
        const [orders] = await pool.execute(
            `SELECT po.order_id, po.order_code, po.student_id, po.document_id,
                    po.total_pages_billed, po.total_price, po.status, po.rejection_reason,
                    po.special_instructions, po.created_at, po.updated_at,
                    d.original_filename, d.total_pages AS document_pages,
                    ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type,
                    ps.orientation, ps.page_range, ps.binding_type,
                    q.position AS queue_position, q.estimated_wait_minutes
             FROM print_orders po
             JOIN documents d ON d.document_id = po.document_id
             JOIN print_settings ps ON ps.setting_id = po.setting_id
             LEFT JOIN queue q ON q.order_id = po.order_id
             WHERE po.order_id = ? AND po.student_id = ?`,
            [orderId, req.user.student_id]
        );
        if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found' });
        return res.json({ success: true, order: orders[0] });
    } catch (error) {
        console.error('Order detail error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not retrieve order details' });
    }
}

async function cancelOrder(req, res) {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [orders] = await connection.execute(
            `SELECT order_id, order_code, status FROM print_orders
             WHERE order_id = ? AND student_id = ? FOR UPDATE`,
            [orderId, req.user.student_id]
        );
        if (!orders.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (orders[0].status !== 'Pending') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Only pending orders can be cancelled' });
        }
        await connection.execute(
            "UPDATE print_orders SET status = 'Cancelled' WHERE order_id = ?",
            [orderId]
        );
        await connection.execute('DELETE FROM queue WHERE order_id = ?', [orderId]);
        await refreshQueue(connection);
        await createNotification(connection, {
            role: 'student',
            recipientId: req.user.student_id,
            orderId,
            title: 'Order cancelled',
            message: `Your print order ${orders[0].order_code} has been cancelled.`
        });
        await connection.commit();
        return res.json({ success: true, message: 'Order cancelled successfully', order_id: orderId, status: 'Cancelled' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Cancel order error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not cancel order' });
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    createOrder,
    calculateQuote,
    getStudentOrders,
    getOrderDetails,
    cancelOrder
};
