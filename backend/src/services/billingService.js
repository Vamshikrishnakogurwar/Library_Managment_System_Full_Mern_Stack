import { withTransaction, getDbPool } from '../config/database.js';
import { generatePaymentReference } from '../utils/fineCalculator.js';
import { logAudit } from '../utils/auditLogger.js';

export class BillingService {
  static async listInvoices({ customerId, status, limit = 50, offset = 0 }) {
    const pool = getDbPool();
    let query = `
      SELECT inv.*, c.customer_code, u.full_name AS customer_name, u.email AS customer_email,
             b.title AS book_title, cp.barcode
      FROM invoices inv
      JOIN customers c ON c.id = inv.customer_id
      JOIN users u ON u.id = c.user_id
      LEFT JOIN loans l ON l.id = inv.loan_id
      LEFT JOIN book_copies cp ON cp.id = l.copy_id
      LEFT JOIN books b ON b.id = cp.book_id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      query += ' AND inv.customer_id = ?';
      params.push(customerId);
    }

    if (status) {
      query += ' AND inv.status = ?';
      params.push(status);
    }

    query += ' ORDER BY inv.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getInvoiceDetails(invoiceId) {
    const pool = getDbPool();
    const [invoices] = await pool.query(
      `SELECT inv.*, c.customer_code, c.address AS customer_address,
              u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              s.library_name, s.library_email, s.library_phone, s.library_address, s.currency_symbol, s.receipt_footer_note
       FROM invoices inv
       JOIN customers c ON c.id = inv.customer_id
       JOIN users u ON u.id = c.user_id
       CROSS JOIN library_settings s
       WHERE inv.id = ? LIMIT 1`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    const invoice = invoices[0];

    const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    const [payments] = await pool.query(
      `SELECT p.*, u.full_name AS received_by_name
       FROM payments p
       JOIN users u ON u.id = p.received_by_user_id
       WHERE p.invoice_id = ?
       ORDER BY p.id ASC`,
      [invoiceId]
    );

    return {
      ...invoice,
      items,
      payments,
    };
  }

  /**
   * PROCESS PAYMENT FOR AN INVOICE
   * Atomic row lock, supports partial payments, recalculates outstanding balance
   */
  static async recordPayment({ invoiceId, amount, paymentMethod = 'CASH', transactionNote = null, actorUserId }) {
    return await withTransaction(async (conn) => {
      // 1. Lock invoice row
      const [invoices] = await conn.query(
        'SELECT * FROM invoices WHERE id = ? FOR UPDATE',
        [invoiceId]
      );

      if (invoices.length === 0) {
        const err = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      const inv = invoices[0];
      const outstanding = parseFloat(inv.balance_amount);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount <= 0) {
        const err = new Error('Payment amount must be greater than zero');
        err.statusCode = 400;
        throw err;
      }

      if (paymentAmount > outstanding) {
        const err = new Error(`Payment amount (₹${paymentAmount}) exceeds outstanding balance (₹${outstanding})`);
        err.statusCode = 400;
        throw err;
      }

      const paymentRef = generatePaymentReference();

      // 2. Insert Payment Record
      const [payRes] = await conn.query(
        `INSERT INTO payments (payment_reference, invoice_id, customer_id, received_by_user_id, amount, payment_method, transaction_note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [paymentRef, invoiceId, inv.customer_id, actorUserId, paymentAmount.toFixed(2), paymentMethod, transactionNote]
      );

      // 3. Recalculate invoice figures
      const newPaid = parseFloat(inv.paid_amount) + paymentAmount;
      const newBalance = outstanding - paymentAmount;
      const newStatus = newBalance <= 0.001 ? 'PAID' : 'PARTIALLY_PAID';

      await conn.query(
        'UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?',
        [newPaid.toFixed(2), newBalance.toFixed(2), newStatus, invoiceId]
      );

      // 4. If linked to fine assessment, update fine balance atomically
      if (inv.fine_id) {
        await conn.query(
          `UPDATE fine_assessments
           SET paid_amount = paid_amount + ?,
               outstanding_balance = outstanding_balance - ?,
               status = CASE WHEN outstanding_balance - ? <= 0.001 THEN 'PAID' ELSE 'PARTIALLY_PAID' END
           WHERE id = ?`,
          [paymentAmount.toFixed(2), paymentAmount.toFixed(2), paymentAmount.toFixed(2), inv.fine_id]
        );
      }

      // 5. Audit Log
      await logAudit({
        userId: actorUserId,
        action: 'PAYMENT_RECEIVED',
        entityType: 'PAYMENT',
        entityId: payRes.insertId,
        details: {
          invoiceId,
          paymentRef,
          amount: paymentAmount.toFixed(2),
          method: paymentMethod,
          remainingBalance: newBalance.toFixed(2),
        },
      });

      return {
        paymentId: payRes.insertId,
        paymentReference: paymentRef,
        amount: paymentAmount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        invoiceStatus: newStatus,
      };
    });
  }

  /**
   * WAIVE OR ADJUST A FINE WITH AUTHORIZATION & AUDIT TRAIL
   */
  static async waiveFine({ fineId, waivedAmount, reason, actorUserId }) {
    return await withTransaction(async (conn) => {
      const [fines] = await conn.query('SELECT * FROM fine_assessments WHERE id = ? FOR UPDATE', [fineId]);
      if (fines.length === 0) {
        const err = new Error('Fine assessment not found');
        err.statusCode = 404;
        throw err;
      }
      const fine = fines[0];
      const currentOutstanding = parseFloat(fine.outstanding_balance);
      const waiveAmt = parseFloat(waivedAmount);

      if (waiveAmt <= 0 || waiveAmt > currentOutstanding) {
        const err = new Error(`Invalid waiver amount. Outstanding is ₹${currentOutstanding}`);
        err.statusCode = 400;
        throw err;
      }

      const newOutstanding = currentOutstanding - waiveAmt;
      const newStatus = newOutstanding <= 0.001 ? 'WAIVED' : fine.status;

      // 1. Record adjustment history
      await conn.query(
        `INSERT INTO fine_adjustments (fine_id, authorized_by_user_id, previous_amount, waived_amount, new_outstanding_amount, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [fineId, actorUserId, currentOutstanding.toFixed(2), waiveAmt.toFixed(2), newOutstanding.toFixed(2), reason]
      );

      // 2. Update Fine record
      await conn.query(
        `UPDATE fine_assessments
         SET waived_amount = waived_amount + ?,
             outstanding_balance = ?,
             status = ?
         WHERE id = ?`,
        [waiveAmt.toFixed(2), newOutstanding.toFixed(2), newStatus, fineId]
      );

      // 3. Update corresponding invoice
      await conn.query(
        `UPDATE invoices
         SET discount_amount = discount_amount + ?,
             total_amount = total_amount - ?,
             balance_amount = balance_amount - ?,
             status = CASE WHEN balance_amount - ? <= 0.001 THEN 'PAID' ELSE status END
         WHERE fine_id = ?`,
        [waiveAmt.toFixed(2), waiveAmt.toFixed(2), waiveAmt.toFixed(2), waiveAmt.toFixed(2), fineId]
      );

      // 4. Audit Log
      await logAudit({
        userId: actorUserId,
        action: 'FINE_WAIVED',
        entityType: 'FINE_ASSESSMENT',
        entityId: fineId,
        details: { waiveAmt, reason, newOutstanding: newOutstanding.toFixed(2) },
      });

      return {
        fineId,
        waivedAmount: waiveAmt.toFixed(2),
        newOutstanding: newOutstanding.toFixed(2),
        status: newStatus,
      };
    });
  }
}
