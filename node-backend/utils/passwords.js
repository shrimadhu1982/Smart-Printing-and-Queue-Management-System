const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function verifyPassword(password, passwordHash) {
    if (/^\$2[aby]\$/.test(passwordHash)) {
        return bcrypt.compare(password, passwordHash);
    }

    const match = /^scrypt:(\d+):(\d+):(\d+)\$([^$]+)\$([a-f\d]+)$/i.exec(passwordHash);
    if (!match) {
        return false;
    }

    const [, cost, blockSize, parallelization, salt, expectedHex] = match;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(password, salt, expected.length, {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallelization),
        maxmem: 128 * 1024 * 1024
    });

    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { verifyPassword };
