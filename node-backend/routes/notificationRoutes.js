const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
    getNotifications,
    markNotificationRead
} = require('../controllers/notificationController');

router.use(verifyToken, requireRole('student', 'staff', 'admin'));
router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
