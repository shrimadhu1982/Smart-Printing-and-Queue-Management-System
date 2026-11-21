const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
    loginAdmin,
    getAdminProfile,
    registerInitialAdmin
} = require('../controllers/authController');
const {
    getDashboard,
    getStudents,
    toggleStudent,
    getStaff,
    createStaff,
    updateStaffStatus,
    deactivateStaff,
    activateStaff,
    getPricing,
    updatePricing,
    getOrders,
    getDocuments,
    getReports
} = require('../controllers/adminController');

router.post('/login', loginAdmin);
router.post('/register-initial', registerInitialAdmin);
router.use(verifyToken, requireRole('admin'));
router.get('/profile', getAdminProfile);
router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.patch('/students/:id/toggle', toggleStudent);
router.get('/staff', getStaff);
router.post('/staff', createStaff);
router.patch('/staff/:id/status', updateStaffStatus);
router.patch('/staff/:id/activate', activateStaff);
router.delete('/staff/:id', deactivateStaff);
router.get('/pricing', getPricing);
router.put('/pricing', updatePricing);
router.get('/orders', getOrders);
router.get('/documents', getDocuments);
router.get('/reports', getReports);

module.exports = router;
