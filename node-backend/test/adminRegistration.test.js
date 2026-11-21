const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const database = require('../config/db');
const { registerInitialAdmin, loginAdmin } = require('../controllers/authController');

const accessId = 'test-only-admin-access-id-with-at-least-32-characters';
const password = 'TestAdminPassword123';

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function createConnection(state) {
    return {
        async execute(sql, params = []) {
            if (sql.includes('GET_LOCK')) return [[{ acquired: state.lockAcquired ? 1 : 0 }], []];
            if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }], []];
            if (sql.includes('SELECT admin_id FROM admins')) {
                return [state.admins.filter((admin) => admin.email === params[0]), []];
            }
            if (sql.includes('COUNT(*) AS admin_count')) {
                return [[{ admin_count: state.admins.length }], []];
            }
            if (sql.includes('INSERT INTO admins')) {
                const [fullName, email, passwordHash, role] = params;
                state.admins.push({
                    admin_id: state.admins.length + 1,
                    full_name: fullName,
                    email,
                    password_hash: passwordHash,
                    role
                });
                return [{ insertId: state.admins.length }, []];
            }
            throw new Error(`Unexpected SQL in test: ${sql}`);
        },
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
    };
}

async function withFakeDatabase(state, callback) {
    const originalGetConnection = database.pool.getConnection;
    const originalExecute = database.pool.execute;
    const originalAccessId = process.env.ADMIN_INITIAL_SETUP_SECRET;
    const originalJwtSecret = process.env.JWT_SECRET;
    const connection = createConnection(state);
    database.pool.getConnection = async () => connection;
    database.pool.execute = async (sql, params = []) => {
        if (sql.includes('FROM admins WHERE email = ?')) {
            return [state.admins.filter((admin) => admin.email === params[0]), []];
        }
        throw new Error(`Unexpected pool SQL in test: ${sql}`);
    };
    process.env.ADMIN_INITIAL_SETUP_SECRET = accessId;
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-signing';

    try {
        await callback();
    } finally {
        database.pool.getConnection = originalGetConnection;
        database.pool.execute = originalExecute;
        if (originalAccessId === undefined) delete process.env.ADMIN_INITIAL_SETUP_SECRET;
        else process.env.ADMIN_INITIAL_SETUP_SECRET = originalAccessId;
        if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalJwtSecret;
    }
}

function registrationRequest(overrides = {}) {
    return {
        body: {
            full_name: 'Initial Admin',
            email: 'initial-admin@example.edu',
            admin_access_id: accessId,
            password,
            ...overrides
        }
    };
}

test('rejects an incorrect Admin Access ID without querying the database', async () => {
    const state = { admins: [], lockAcquired: true };
    await withFakeDatabase(state, async () => {
        const response = createResponse();
        await registerInitialAdmin(registrationRequest({ admin_access_id: 'wrong-access-id' }), response);
        assert.equal(response.statusCode, 403);
        assert.equal(state.admins.length, 0);
        assert.doesNotMatch(JSON.stringify(response.body), new RegExp(accessId));
    });
});

test('creates the initial admin with a bcrypt hash and allows admin login', async () => {
    const state = { admins: [], lockAcquired: true };
    await withFakeDatabase(state, async () => {
        const response = createResponse();
        await registerInitialAdmin(registrationRequest(), response);

        assert.equal(response.statusCode, 201);
        assert.equal(state.admins.length, 1);
        assert.match(state.admins[0].password_hash, /^\$2[aby]\$/);
        assert.equal(await bcrypt.compare(password, state.admins[0].password_hash), true);
        assert.doesNotMatch(JSON.stringify(response.body), new RegExp(accessId));
        assert.equal(response.body.token, undefined);
        assert.equal(response.body.password_hash, undefined);

        const loginResponse = createResponse();
        await loginAdmin({ body: { email: state.admins[0].email, password } }, loginResponse);
        assert.equal(loginResponse.statusCode, 200);
        assert.equal(loginResponse.body.user.email, state.admins[0].email);
        assert.equal(loginResponse.body.user.password_hash, undefined);
        assert.ok(loginResponse.body.token);
    });
});

test('rejects a duplicate admin email', async () => {
    const state = {
        lockAcquired: true,
        admins: [{ admin_id: 1, email: 'initial-admin@example.edu' }]
    };
    await withFakeDatabase(state, async () => {
        const response = createResponse();
        await registerInitialAdmin(registrationRequest(), response);
        assert.equal(response.statusCode, 409);
        assert.match(response.body.message, /already exists/i);
        assert.equal(state.admins.length, 1);
    });
});

test('disables initial registration after an admin exists', async () => {
    const state = {
        lockAcquired: true,
        admins: [{ admin_id: 1, email: 'existing-admin@example.edu' }]
    };
    await withFakeDatabase(state, async () => {
        const response = createResponse();
        await registerInitialAdmin(registrationRequest(), response);
        assert.equal(response.statusCode, 409);
        assert.match(response.body.message, /setup is already complete/i);
        assert.equal(state.admins.length, 1);
    });
});

test('returns a temporary error when the concurrency lock cannot be acquired', async () => {
    const state = { admins: [], lockAcquired: false };
    await withFakeDatabase(state, async () => {
        const response = createResponse();
        await registerInitialAdmin(registrationRequest(), response);
        assert.equal(response.statusCode, 503);
        assert.equal(state.admins.length, 0);
    });
});
