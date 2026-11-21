const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { verifyPassword } = require('../utils/passwords');

const ACCOUNT_CONFIG = {
    staff: {
        table: 'staff',
        id: 'staff_id',
        fields: 'staff_id, full_name, email, phone, counter_number, role, is_active',
        requireActive: true
    },
    admin: {
        table: 'admins',
        id: 'admin_id',
        fields: 'admin_id, full_name, email, role',
        requireActive: false
    }
};

async function loginAccount(req, res, role) {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = req.body.password;
        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const config = ACCOUNT_CONFIG[role];
        const [accounts] = await pool.execute(
            `SELECT ${config.fields}, password_hash FROM ${config.table} WHERE email = ?`,
            [email]
        );
        if (!accounts.length) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const account = accounts[0];
        if (config.requireActive && !account.is_active) {
            return res.status(403).json({ success: false, message: 'This account is inactive' });
        }
        if (!(await verifyPassword(password, account.password_hash))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const user = { ...account };
        delete user.password_hash;
        const token = jwt.sign(
            { [`${role}_id`]: account[config.id], role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        return res.json({ success: true, message: 'Login successful', token, user });
    } catch (error) {
        console.error(`${role} login error:`, error.message);
        return res.status(500).json({ success: false, message: `${role} login failed` });
    }
}

const loginStaff = (req, res) => loginAccount(req, res, 'staff');
const loginAdmin = (req, res) => loginAccount(req, res, 'admin');

async function registerInitialAdmin(req, res) {
    const body = req.body || {};
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    const providedAccessId = body.admin_access_id;
    const configuredAccessId = process.env.ADMIN_INITIAL_SETUP_SECRET;

    if (!configuredAccessId || Buffer.byteLength(configuredAccessId) < 32) {
        return res.status(503).json({ success: false, message: 'Initial admin registration is not configured' });
    }

    if (typeof providedAccessId !== 'string' ||
        Buffer.byteLength(providedAccessId) !== Buffer.byteLength(configuredAccessId) ||
        !crypto.timingSafeEqual(Buffer.from(providedAccessId), Buffer.from(configuredAccessId))) {
        return res.status(403).json({ success: false, message: 'Invalid Admin Access ID' });
    }

    if (!fullName || fullName.length > 100 ||
        !email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
        return res.status(400).json({
            success: false,
            message: 'Provide a valid name, email, and password (8–72 bytes)'
        });
    }

    let connection;
    let lockAcquired = false;
    let transactionStarted = false;
    try {
        connection = await pool.getConnection();
        const [lockRows] = await connection.execute(
            'SELECT GET_LOCK(?, 10) AS acquired',
            ['smart_printing_initial_admin_setup']
        );
        if (Number(lockRows[0]?.acquired) !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Initial admin registration is temporarily unavailable'
            });
        }
        lockAcquired = true;

        await connection.beginTransaction();
        transactionStarted = true;

        const [existingEmails] = await connection.execute(
            'SELECT admin_id FROM admins WHERE email = ? LIMIT 1',
            [email]
        );
        if (existingEmails.length) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(409).json({ success: false, message: 'An admin account with this email already exists' });
        }

        const [adminCounts] = await connection.execute(
            'SELECT COUNT(*) AS admin_count FROM admins'
        );
        if (Number(adminCounts[0]?.admin_count) > 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(409).json({ success: false, message: 'Initial admin setup is already complete' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await connection.execute(
            'INSERT INTO admins (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [fullName, email, passwordHash, 'admin']
        );
        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: 'Initial admin account created. Please sign in.'
        });
    } catch (error) {
        if (transactionStarted && connection) {
            await connection.rollback().catch(() => {});
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'An admin account with this email already exists' });
        }
        console.error('Initial admin registration failed:', error.message);
        return res.status(500).json({ success: false, message: 'Could not create the initial admin account' });
    } finally {
        if (lockAcquired && connection) {
            await connection.execute(
                'SELECT RELEASE_LOCK(?) AS released',
                ['smart_printing_initial_admin_setup']
            ).catch(() => {});
        }
        if (connection) connection.release();
    }
}

async function getAccountProfile(req, res, role) {
    const config = ACCOUNT_CONFIG[role];
    try {
        const [accounts] = await pool.execute(
            `SELECT ${config.fields} FROM ${config.table} WHERE ${config.id} = ?`,
            [req.user[`${role}_id`]]
        );
        if (!accounts.length || (config.requireActive && !accounts[0].is_active)) {
            return res.status(404).json({ success: false, message: `${role} account not found` });
        }
        return res.json({ success: true, user: accounts[0], [role]: accounts[0] });
    } catch (error) {
        console.error(`${role} profile error:`, error.message);
        return res.status(500).json({ success: false, message: `Could not retrieve ${role} profile` });
    }
}

const getStaffProfile = (req, res) => getAccountProfile(req, res, 'staff');
const getAdminProfile = (req, res) => getAccountProfile(req, res, 'admin');

module.exports = { loginStaff, loginAdmin, registerInitialAdmin, getStaffProfile, getAdminProfile };
