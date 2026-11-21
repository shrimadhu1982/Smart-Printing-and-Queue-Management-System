const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
    loginStaff,
    getStaffProfile
} = require('../controllers/authController');
const {
    getDashboard,
    getOrders,
    updateOrderStatus
} = require('../controllers/staffController');

router.post('/login', loginStaff);
router.get('/profile', verifyToken, requireRole('staff'), getStaffProfile);
router.get('/dashboard', verifyToken, requireRole('staff', 'admin'), getDashboard);
router.get('/orders', verifyToken, requireRole('staff', 'admin'), getOrders);
router.patch('/orders/:id/status', verifyToken, requireRole('staff', 'admin'), updateOrderStatus);

module.exports = router;
