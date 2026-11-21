const { pool } = require('../config/db');

function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to access this resource'
            });
        }

        if (req.user.role === 'student' || req.user.role === 'staff') {
            const table = req.user.role === 'student' ? 'students' : 'staff';
            const idColumn = req.user.role === 'student' ? 'student_id' : 'staff_id';
            const accountId = req.user[`${req.user.role}_id`];
            if (!Number.isInteger(Number(accountId)) || Number(accountId) < 1) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to access this resource'
                });
            }
            try {
                const [accounts] = await pool.execute(
                    `SELECT ${idColumn} FROM ${table} WHERE ${idColumn} = ? AND is_active = 1`,
                    [Number(accountId)]
                );
                if (!accounts.length) {
                    return res.status(403).json({
                        success: false,
                        message: 'This account is inactive'
                    });
                }
            } catch (error) {
                console.error('Account authorization check failed:', error.message);
                return res.status(500).json({
                    success: false,
                    message: 'Could not verify account access'
                });
            }
        }

        return next();
    };
}

module.exports = requireRole;
