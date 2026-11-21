const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { getQueue, getMyQueue } = require('../controllers/queueController');

router.use(verifyToken, requireRole('student', 'staff', 'admin'));
router.get('/', getQueue);
router.get('/mine', requireRole('student'), getMyQueue);

module.exports = router;
