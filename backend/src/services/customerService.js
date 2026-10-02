import { getDbPool } from '../config/database.js';
import { logAudit } from '../utils/auditLogger.js';

export class CustomerService {
  static async listCustomers({ search, status, limit = 20, offset = 0 }) {
    const pool = getDbPool();
    let query = `
      SELECT c.*, u.username, u.email, u.full_name, u.phone, u.status AS user_status,
             m.name AS membership_name, m.code AS membership_code, m.max_borrow_limit,
             (SELECT COUNT(*) FROM loans l WHERE l.customer_id = c.id AND l.status = 'ACTIVE') AS active_loans_count,
             (SELECT COALESCE(SUM(f.outstanding_balance), 0.00) FROM fine_assessments f WHERE f.customer_id = c.id AND f.status IN ('UNPAID', 'PARTIALLY_PAID')) AS total_outstanding_fines
      FROM customers c
      JOIN users u ON u.id = c.user_id
      JOIN membership_types m ON m.id = c.membership_type_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR c.customer_code LIKE ? OR u.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status) {
      if (status === 'SUSPENDED') query += ' AND c.is_suspended = 1';
      else if (status === 'ACTIVE') query += ' AND c.is_suspended = 0 AND u.status = "ACTIVE"';
    }

    query += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);

    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM customers c JOIN users u ON u.id = c.user_id WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR c.customer_code LIKE ? OR u.phone LIKE ?)';
      const s = `%${search}%`;
      countParams.push(s, s, s, s);
    }
    const [countResult] = await pool.query(countQuery, countParams);

    return {
      customers: rows,
      total: countResult[0].total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };
  }

  static async getCustomerDetails(customerId) {
    const pool = getDbPool();
    const [customers] = await pool.query(
      `SELECT c.*, u.username, u.email, u.full_name, u.phone, u.status AS user_status,
              m.name AS membership_name, m.code AS membership_code, m.max_borrow_limit, m.loan_duration_days, m.grace_period_days, m.daily_fine_rate
       FROM customers c
       JOIN users u ON u.id = c.user_id
       JOIN membership_types m ON m.id = c.membership_type_id
       WHERE c.id = ? LIMIT 1`,
      [customerId]
    );

    if (customers.length === 0) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }

    const customer = customers[0];

    // Current Active Loans
    const [activeLoans] = await pool.query(
      `SELECT l.*, b.title AS book_title, b.author AS book_author, cp.barcode
       FROM loans l
       JOIN book_copies cp ON cp.id = l.copy_id
       JOIN books b ON b.id = cp.book_id
       WHERE l.customer_id = ? AND l.status = 'ACTIVE'
       ORDER BY l.due_date ASC`,
      [customerId]
    );

    // Loan History
    const [loanHistory] = await pool.query(
      `SELECT l.*, b.title AS book_title, cp.barcode, f.assessed_amount, f.status AS fine_status
       FROM loans l
       JOIN book_copies cp ON cp.id = l.copy_id
       JOIN books b ON b.id = cp.book_id
       LEFT JOIN fine_assessments f ON f.loan_id = l.id
       WHERE l.customer_id = ?
       ORDER BY l.id DESC LIMIT 50`,
      [customerId]
    );

    // Invoices and Payments
    const [invoices] = await pool.query(
      `SELECT inv.*,
              (SELECT COUNT(*) FROM invoice_items it WHERE it.invoice_id = inv.id) as item_count
       FROM invoices inv
       WHERE inv.customer_id = ?
       ORDER BY inv.id DESC LIMIT 50`,
      [customerId]
    );

    return {
      ...customer,
      activeLoans,
      loanHistory,
      invoices,
    };
  }

  static async toggleCustomerSuspension(customerId, isSuspended, actorUserId) {
    const pool = getDbPool();
    await pool.query('UPDATE customers SET is_suspended = ? WHERE id = ?', [isSuspended ? 1 : 0, customerId]);
    await logAudit({
      userId: actorUserId,
      action: isSuspended ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_REACTIVATED',
      entityType: 'CUSTOMER',
      entityId: customerId,
    });
    return { success: true, isSuspended };
  }
}
