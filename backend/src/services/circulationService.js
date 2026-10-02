import { withTransaction, getDbPool } from '../config/database.js';
import { calculateFine, generateLoanCode, generateInvoiceNumber } from '../utils/fineCalculator.js';
import { logAudit } from '../utils/auditLogger.js';

export class CirculationService {
  /**
   * ISSUE A BOOK COPY TO A CUSTOMER
   * Strictly atomic, row-locking transaction
   */
  static async issueBook({ customerId, copyId, actorUserId, customLoanDays = null }) {
    return await withTransaction(async (conn) => {
      // 1. Validate Customer & Eligibility (with lock)
      const [customers] = await conn.query(
        `SELECT c.*, u.status AS user_status, m.max_borrow_limit, m.loan_duration_days, m.grace_period_days, m.daily_fine_rate, m.max_fine_per_loan
         FROM customers c
         JOIN users u ON u.id = c.user_id
         JOIN membership_types m ON m.id = c.membership_type_id
         WHERE c.id = ? FOR UPDATE`,
        [customerId]
      );

      if (customers.length === 0) {
        const err = new Error('Customer not found');
        err.statusCode = 404;
        throw err;
      }
      const customer = customers[0];

      if (customer.user_status !== 'ACTIVE' || customer.is_suspended) {
        const err = new Error('Customer account is suspended or inactive. Cannot issue books.');
        err.statusCode = 400;
        throw err;
      }

      // Check membership expiry
      const todayStr = new Date().toISOString().split('T')[0];
      if (customer.membership_expiry_date < todayStr) {
        const err = new Error(`Customer membership expired on ${customer.membership_expiry_date}. Please renew membership.`);
        err.statusCode = 400;
        throw err;
      }

      // Check current active loans against limit
      const [activeLoans] = await conn.query(
        "SELECT COUNT(*) AS count FROM loans WHERE customer_id = ? AND status = 'ACTIVE'",
        [customerId]
      );
      if (activeLoans[0].count >= customer.max_borrow_limit) {
        const err = new Error(`Borrowing limit reached (${customer.max_borrow_limit} books). Customer must return issued books first.`);
        err.statusCode = 400;
        throw err;
      }

      // Check for overdue books or excessive unpaid fines
      const [overdueLoans] = await conn.query(
        "SELECT COUNT(*) AS count FROM loans WHERE customer_id = ? AND status = 'ACTIVE' AND due_date < CURDATE()",
        [customerId]
      );
      if (overdueLoans[0].count > 0) {
        const err = new Error('Customer has overdue books that must be returned before borrowing new copies.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Fetch and Lock the Physical Book Copy
      const [copies] = await conn.query(
        `SELECT cp.*, b.title, b.book_code
         FROM book_copies cp
         JOIN books b ON b.id = cp.book_id
         WHERE cp.id = ? FOR UPDATE`,
        [copyId]
      );

      if (copies.length === 0) {
        const err = new Error('Physical book copy not found');
        err.statusCode = 404;
        throw err;
      }
      const copy = copies[0];

      if (copy.status !== 'AVAILABLE') {
        const err = new Error(`Copy ${copy.barcode} is currently ${copy.status} and cannot be issued.`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Compute Dates and Snapshot Policies
      const issueDate = todayStr;
      const loanDuration = customLoanDays || customer.loan_duration_days || 14;
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + loanDuration);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      const loanCode = generateLoanCode();

      // 4. Insert Loan Record
      const [loanRes] = await conn.query(
        `INSERT INTO loans (
           loan_code, customer_id, copy_id, issued_by_user_id,
           issue_date, due_date, status,
           policy_daily_fine_rate, policy_grace_period_days, policy_max_fine
         ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        [
          loanCode,
          customerId,
          copyId,
          actorUserId,
          issueDate,
          dueDate,
          customer.daily_fine_rate,
          customer.grace_period_days,
          customer.max_fine_per_loan,
        ]
      );

      // 5. Update Copy Circulation Status
      await conn.query("UPDATE book_copies SET status = 'ISSUED' WHERE id = ?", [copyId]);

      // 6. Audit Log
      await logAudit({
        userId: actorUserId,
        action: 'BOOK_ISSUED',
        entityType: 'LOAN',
        entityId: loanRes.insertId,
        details: {
          loanCode,
          customerId,
          customerCode: customer.customer_code,
          copyId,
          barcode: copy.barcode,
          dueDate,
        },
      });

      return {
        loanId: loanRes.insertId,
        loanCode,
        issueDate,
        dueDate,
        bookTitle: copy.title,
        copyBarcode: copy.barcode,
      };
    });
  }

  /**
   * PREVIEW FINE BREAKDOWN FOR A PENDING RETURN
   */
  static async previewReturn({ loanId }) {
    const pool = getDbPool();
    const [loans] = await pool.query(
      `SELECT l.*, cp.barcode, b.title AS book_title, b.replacement_cost,
              c.customer_code, u.full_name AS customer_name
       FROM loans l
       JOIN book_copies cp ON cp.id = l.copy_id
       JOIN books b ON b.id = cp.book_id
       JOIN customers c ON c.id = l.customer_id
       JOIN users u ON u.id = c.user_id
       WHERE l.id = ? AND l.status = 'ACTIVE'`,
      [loanId]
    );

    if (loans.length === 0) {
      const err = new Error('Active loan record not found');
      err.statusCode = 404;
      throw err;
    }
    const loan = loans[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const fineCalculation = calculateFine({
      dueDate: loan.due_date,
      returnDate: todayStr,
      dailyRate: loan.policy_daily_fine_rate,
      gracePeriodDays: loan.policy_grace_period_days,
      maxFine: loan.policy_max_fine,
    });

    return {
      loan,
      returnDate: todayStr,
      fineCalculation,
    };
  }

  /**
   * RETURN A BOOK COPY
   * Strictly atomic: updates loan, assesses fine, generates invoice, updates inventory
   */
  static async returnBook({ loanId, actorUserId, condition = 'GOOD', returnNotes = null }) {
    return await withTransaction(async (conn) => {
      // 1. Lock Loan & Copy
      const [loans] = await conn.query(
        `SELECT l.*, cp.id AS copy_id, cp.barcode, b.id AS book_id, b.title AS book_title, b.replacement_cost,
                c.id AS customer_id, c.customer_code, u.full_name AS customer_name
         FROM loans l
         JOIN book_copies cp ON cp.id = l.copy_id
         JOIN books b ON b.id = cp.book_id
         JOIN customers c ON c.id = l.customer_id
         JOIN users u ON u.id = c.user_id
         WHERE l.id = ? FOR UPDATE`,
        [loanId]
      );

      if (loans.length === 0) {
        const err = new Error('Loan record not found');
        err.statusCode = 404;
        throw err;
      }
      const loan = loans[0];

      if (loan.status !== 'ACTIVE') {
        const err = new Error(`Loan is already closed with status ${loan.status}`);
        err.statusCode = 400;
        throw err;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 2. Compute Fine using the loan's policy snapshot
      const fineCalc = calculateFine({
        dueDate: loan.due_date,
        returnDate: todayStr,
        dailyRate: loan.policy_daily_fine_rate,
        gracePeriodDays: loan.policy_grace_period_days,
        maxFine: loan.policy_max_fine,
      });

      // 3. Update Loan Record
      await conn.query(
        `UPDATE loans
         SET status = 'RETURNED',
             return_date = ?,
             actual_return_timestamp = ?,
             returned_by_user_id = ?,
             return_condition = ?,
             return_notes = ?
         WHERE id = ?`,
        [todayStr, nowTimestamp, actorUserId, condition, returnNotes, loanId]
      );

      let fineRecord = null;
      let invoiceRecord = null;
      const assessedAmount = parseFloat(fineCalc.assessedFine);

      // 4. Create Fine Assessment & Invoice if fine > 0
      if (assessedAmount > 0) {
        const [fineRes] = await conn.query(
          `INSERT INTO fine_assessments (
             loan_id, customer_id, overdue_days, grace_days_applied,
             daily_rate_applied, calculated_amount, assessed_amount,
             waived_amount, paid_amount, outstanding_balance, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, ?, 'UNPAID')`,
          [
            loanId,
            loan.customer_id,
            fineCalc.overdueDays,
            fineCalc.gracePeriodDays,
            fineCalc.dailyRate,
            fineCalc.rawFine,
            fineCalc.assessedFine,
            fineCalc.assessedFine,
          ]
        );
        fineRecord = { id: fineRes.insertId, amount: assessedAmount };

        // Generate Invoice
        const invNum = generateInvoiceNumber();
        const [invRes] = await conn.query(
          `INSERT INTO invoices (
             invoice_number, customer_id, loan_id, fine_id, invoice_date, due_date,
             subtotal, discount_amount, total_amount, paid_amount, balance_amount, status, notes
           ) VALUES (?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 7 DAY), ?, 0.00, ?, 0.00, ?, 'ISSUED', ?)`,
          [
            invNum,
            loan.customer_id,
            loanId,
            fineRes.insertId,
            todayStr,
            todayStr,
            fineCalc.assessedFine,
            fineCalc.assessedFine,
            fineCalc.assessedFine,
            `Automated late fine for book '${loan.book_title}' (${fineCalc.overdueDays} days overdue)`,
          ]
        );

        // Insert Invoice Item
        await conn.query(
          `INSERT INTO invoice_items (invoice_id, description, charge_type, quantity, unit_amount, total_amount)
           VALUES (?, ?, 'OVERDUE_FINE', ?, ?, ?)`,
          [
            invRes.insertId,
            `Overdue late fee for ${loan.book_title} (Barcode: ${loan.barcode})`,
            fineCalc.chargeableDays,
            fineCalc.dailyRate,
            fineCalc.assessedFine,
          ]
        );

        invoiceRecord = { id: invRes.insertId, invoiceNumber: invNum, amount: assessedAmount };
      }

      // 5. Update Physical Copy Status and Condition
      let newCopyStatus = 'AVAILABLE';
      if (condition === 'DAMAGED') {
        newCopyStatus = 'DAMAGED';
      } else if (condition === 'LOST') {
        newCopyStatus = 'LOST';
      }

      await conn.query(
        'UPDATE book_copies SET status = ?, `condition` = ?, notes = COALESCE(?, notes) WHERE id = ?',
        [newCopyStatus, condition, returnNotes, loan.copy_id]
      );

      // 6. Audit Log
      await logAudit({
        userId: actorUserId,
        action: 'BOOK_RETURNED',
        entityType: 'LOAN',
        entityId: loanId,
        details: {
          loanId,
          customerId: loan.customer_id,
          copyId: loan.copy_id,
          condition,
          overdueDays: fineCalc.overdueDays,
          assessedFine: fineCalc.assessedFine,
          invoiceNumber: invoiceRecord ? invoiceRecord.invoiceNumber : null,
        },
      });

      return {
        loanId,
        returnDate: todayStr,
        actualReturnTimestamp: nowTimestamp,
        condition,
        fineCalculation: fineCalc,
        fine: fineRecord,
        invoice: invoiceRecord,
        newCopyStatus,
      };
    });
  }

  static async listActiveLoans({ search, customerId, overdueOnly = false, limit = 50, offset = 0 }) {
    const pool = getDbPool();
    let query = `
      SELECT l.*, cp.barcode, cp.rack_location, b.title AS book_title, b.author AS book_author,
             c.customer_code, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
             DATEDIFF(CURDATE(), l.due_date) AS current_overdue_days
      FROM loans l
      JOIN book_copies cp ON cp.id = l.copy_id
      JOIN books b ON b.id = cp.book_id
      JOIN customers c ON c.id = l.customer_id
      JOIN users u ON u.id = c.user_id
      WHERE l.status = 'ACTIVE'
    `;
    const params = [];

    if (customerId) {
      query += ' AND l.customer_id = ?';
      params.push(customerId);
    }

    if (overdueOnly) {
      query += ' AND l.due_date < CURDATE()';
    }

    if (search) {
      query += ' AND (b.title LIKE ? OR cp.barcode LIKE ? OR c.customer_code LIKE ? OR u.full_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY l.due_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }
}
