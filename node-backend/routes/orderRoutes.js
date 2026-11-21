const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const {
    createOrder,
    calculateQuote,
    getStudentOrders,
    getOrderDetails,
    cancelOrder
} = require('../controllers/orderController');

router.post('/calculate-cost', verifyToken, requireRole('student'), calculateQuote);
// Create print order
router.post('/', verifyToken, requireRole('student'), createOrder);

// Get logged-in student's order history
router.get('/', verifyToken, requireRole('student'), getStudentOrders);

// Cancel a pending order
router.patch('/:id/cancel', verifyToken, requireRole('student'), cancelOrder);
router.get('/:id', verifyToken, requireRole('student'), getOrderDetails);

module.exports = router;