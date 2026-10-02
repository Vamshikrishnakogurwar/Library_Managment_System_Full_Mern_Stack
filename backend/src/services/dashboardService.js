import { getDbPool } from '../config/database.js';

export class DashboardService {
  static async getMetrics() {
    const pool = getDbPool();

    // 1. High level statistics
    const [bookStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM books WHERE is_archived = 0) AS total_active_titles,
        (SELECT COUNT(*) FROM book_copies) AS total_physical_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'AVAILABLE') AS available_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'ISSUED') AS issued_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'DAMAGED') AS damaged_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'LOST') AS lost_copies
    `);

    const [customerStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(*) FROM customers c JOIN users u ON u.id = c.user_id WHERE u.status = 'ACTIVE' AND c.is_suspended = 0) AS active_customers,
        (SELECT COUNT(*) FROM loans WHERE status = 'ACTIVE' AND due_date < CURDATE()) AS overdue_loans_count
    `);

    const [financialStats] = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(assessed_amount), 0.00) FROM fine_assessments) AS total_fines_assessed,
        (SELECT COALESCE(SUM(paid_amount), 0.00) FROM fine_assessments) AS total_fines_collected,
        (SELECT COALESCE(SUM(outstanding_balance), 0.00) FROM fine_assessments WHERE status IN ('UNPAID', 'PARTIALLY_PAID')) AS outstanding_fines,
        (SELECT COALESCE(SUM(amount), 0.00) FROM payments) AS total_payments_received
    `);

    // 2. Recent Circulation Activity
    const [recentActivity] = await pool.query(`
      SELECT l.id, l.loan_code, l.status, l.issue_date, l.due_date, l.return_date,
             b.title AS book_title, cp.barcode,
             c.customer_code, u.full_name AS customer_name
      FROM loans l
      JOIN book_copies cp ON cp.id = l.copy_id
      JOIN books b ON b.id = cp.book_id
      JOIN customers c ON c.id = l.customer_id
      JOIN users u ON u.id = c.user_id
      ORDER BY l.id DESC LIMIT 10
    `);

    // 3. Most Popular Books
    const [popularBooks] = await pool.query(`
      SELECT b.id, b.title, b.author, COUNT(l.id) AS borrow_count
      FROM books b
      JOIN book_copies cp ON cp.book_id = b.id
      JOIN loans l ON l.copy_id = cp.id
      GROUP BY b.id, b.title, b.author
      ORDER BY borrow_count DESC
      LIMIT 5
    `);

    // 4. Monthly Issue Trends (Last 6 months)
    const [monthlyTrends] = await pool.query(`
      SELECT DATE_FORMAT(issue_date, '%b %Y') AS month_label,
             COUNT(*) AS total_issued
      FROM loans
      WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(issue_date, '%b %Y'), YEAR(issue_date), MONTH(issue_date)
      ORDER BY YEAR(issue_date) ASC, MONTH(issue_date) ASC
    `);

    return {
      metrics: {
        ...bookStats[0],
        ...customerStats[0],
        ...financialStats[0],
      },
      recentActivity,
      popularBooks,
      monthlyTrends,
    };
  }
}
