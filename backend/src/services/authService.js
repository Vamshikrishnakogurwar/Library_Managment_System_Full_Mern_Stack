import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDbPool } from '../config/database.js';
import { config } from '../config/env.js';
import { logAudit } from '../utils/auditLogger.js';

export class AuthService {
  static async login({ identifier, password, ipAddress }) {
    const pool = getDbPool();
    // Allow login via username or email
    const [users] = await pool.query(
      `SELECT u.*, c.id AS customer_profile_id, c.customer_code, c.membership_type_id
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.username = ? OR u.email = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (users.length === 0) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      const err = new Error(`Account is ${user.status.toLowerCase()}. Please contact the administrator.`);
      err.statusCode = 403;
      throw err;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    // Generate JWT access token and refresh token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      customerProfileId: user.customer_profile_id,
      customerCode: user.customer_code,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(tokenPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        customerProfileId: user.customer_profile_id,
        customerCode: user.customer_code,
      },
    };
  }

  static async registerCustomer({ username, email, password, fullName, phone, address, idProofNumber, membershipTypeId, ipAddress }) {
    const pool = getDbPool();

    // Check if membership type exists and is active
    const [mTypes] = await pool.query('SELECT * FROM membership_types WHERE id = ? AND is_active = TRUE', [membershipTypeId]);
    if (mTypes.length === 0) {
      const err = new Error('Invalid or inactive membership plan selected');
      err.statusCode = 400;
      throw err;
    }
    const plan = mTypes[0];

    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Insert user with strictly CUSTOMER role (prevent escalation)
      const [uRes] = await conn.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
         VALUES (?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', ?)`,
        [username, email, hashedPassword, fullName, phone || null]
      );
      const newUserId = uRes.insertId;

      // 2. Generate unique Customer Code
      const customerCode = `CUST-${new Date().getFullYear()}-${String(newUserId).padStart(5, '0')}`;

      // 3. Compute membership validity dates
      const startDate = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (plan.validity_days || 365));
      const expiryDate = expiry.toISOString().split('T')[0];

      // 4. Create customer record
      const [cRes] = await conn.query(
        `INSERT INTO customers (user_id, customer_code, membership_type_id, address, id_proof_number, membership_start_date, membership_expiry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, customerCode, plan.id, address || null, idProofNumber || null, startDate, expiryDate]
      );

      await conn.commit();

      await logAudit({
        userId: newUserId,
        action: 'CUSTOMER_SELF_REGISTER',
        entityType: 'CUSTOMER',
        entityId: cRes.insertId,
        details: { customerCode, username, email },
        ipAddress,
      });

      return {
        userId: newUserId,
        customerId: cRes.insertId,
        customerCode,
        fullName,
        email,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getProfile(userId) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.phone, u.created_at,
              c.id AS customer_id, c.customer_code, c.membership_type_id, c.membership_start_date, c.membership_expiry_date, c.is_suspended,
              m.name AS membership_name, m.max_borrow_limit, m.loan_duration_days
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN membership_types m ON m.id = c.membership_type_id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return rows[0];
  }
}
