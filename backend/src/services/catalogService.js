import { getDbPool } from '../config/database.js';
import { logAudit } from '../utils/auditLogger.js';

export class CatalogService {
  static async listBooks({ search, categoryId, isArchived = false, limit = 20, offset = 0 }) {
    const pool = getDbPool();
    let query = `
      SELECT b.*, c.name AS category_name,
        COUNT(DISTINCT cp.id) AS total_copies,
        SUM(CASE WHEN cp.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_copies,
        SUM(CASE WHEN cp.status = 'ISSUED' THEN 1 ELSE 0 END) AS issued_copies
      FROM books b
      LEFT JOIN categories c ON c.id = b.category_id
      LEFT JOIN book_copies cp ON cp.book_id = b.id
      WHERE b.is_archived = ?
    `;
    const params = [isArchived ? 1 : 0];

    if (search) {
      query += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.book_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (categoryId) {
      query += ' AND b.category_id = ?';
      params.push(categoryId);
    }

    query += ' GROUP BY b.id ORDER BY b.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);

    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM books b WHERE b.is_archived = ?';
    const countParams = [isArchived ? 1 : 0];
    if (search) {
      countQuery += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.book_code LIKE ?)';
      const s = `%${search}%`;
      countParams.push(s, s, s, s);
    }
    if (categoryId) {
      countQuery += ' AND b.category_id = ?';
      countParams.push(categoryId);
    }
    const [countResult] = await pool.query(countQuery, countParams);

    return {
      books: rows,
      total: countResult[0].total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };
  }

  static async getBookById(id) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Book title not found');
      err.statusCode = 404;
      throw err;
    }

    const [copies] = await pool.query(
      `SELECT cp.*, 
              l.id AS current_loan_id, l.due_date, cu.customer_code, u.full_name AS borrowed_by_name
       FROM book_copies cp
       LEFT JOIN loans l ON l.copy_id = cp.id AND l.status = 'ACTIVE'
       LEFT JOIN customers cu ON cu.id = l.customer_id
       LEFT JOIN users u ON u.id = cu.user_id
       WHERE cp.book_id = ?
       ORDER BY cp.copy_number ASC`,
      [id]
    );

    return { ...rows[0], copies };
  }

  static async createBook(data, actorUserId) {
    const pool = getDbPool();
    const bookCode = data.book_code || `BK-${Date.now().toString(36).toUpperCase()}`;

    const [res] = await pool.query(
      `INSERT INTO books (book_code, isbn, title, author, publisher, edition, language, category_id, publication_year, replacement_cost, description, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookCode,
        data.isbn || null,
        data.title,
        data.author,
        data.publisher || null,
        data.edition || null,
        data.language || 'English',
        data.category_id || null,
        data.publication_year || null,
        data.replacement_cost || 500.00,
        data.description || null,
        data.cover_image_url || null,
      ]
    );

    const newBookId = res.insertId;

    // If initial copies requested
    if (data.initial_copies && data.initial_copies > 0) {
      for (let i = 1; i <= data.initial_copies; i++) {
        const barcode = `BC-${bookCode}-${String(i).padStart(2, '0')}`;
        await pool.query(
          `INSERT INTO book_copies (book_id, barcode, copy_number, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
           VALUES (?, ?, ?, CURDATE(), ?, 'AVAILABLE', 'GOOD', ?)`,
          [newBookId, barcode, i, data.replacement_cost || 0.00, data.rack_location || 'General Stacks']
        );
      }
    }

    await logAudit({
      userId: actorUserId,
      action: 'BOOK_CREATED',
      entityType: 'BOOK',
      entityId: newBookId,
      details: { title: data.title, bookCode },
    });

    return this.getBookById(newBookId);
  }

  static async addCopy(bookId, copyData, actorUserId) {
    const pool = getDbPool();
    // Get next copy number
    const [numRows] = await pool.query('SELECT MAX(copy_number) as max_num FROM book_copies WHERE book_id = ?', [bookId]);
    const nextNum = (numRows[0].max_num || 0) + 1;

    const [book] = await pool.query('SELECT book_code FROM books WHERE id = ?', [bookId]);
    if (book.length === 0) {
      const err = new Error('Parent book not found');
      err.statusCode = 404;
      throw err;
    }

    const barcode = copyData.barcode || `BC-${book[0].book_code}-${String(nextNum).padStart(2, '0')}`;

    const [res] = await pool.query(
      `INSERT INTO book_copies (book_id, barcode, copy_number, acquisition_date, acquisition_cost, status, \`condition\`, rack_location, notes)
       VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?)`,
      [
        bookId,
        barcode,
        nextNum,
        copyData.acquisition_date || new Date().toISOString().split('T')[0],
        copyData.acquisition_cost || 0.00,
        copyData.condition || 'GOOD',
        copyData.rack_location || 'General Stacks',
        copyData.notes || null,
      ]
    );

    await logAudit({
      userId: actorUserId,
      action: 'COPY_ADDED',
      entityType: 'BOOK_COPY',
      entityId: res.insertId,
      details: { bookId, barcode },
    });

    return { id: res.insertId, barcode, copyNumber: nextNum };
  }

  static async updateCopyStatus(copyId, { status, condition, notes }, actorUserId) {
    const pool = getDbPool();
    // Prevent marking as AVAILABLE if actively loaned
    if (status === 'AVAILABLE') {
      const [activeLoan] = await pool.query("SELECT id FROM loans WHERE copy_id = ? AND status = 'ACTIVE' LIMIT 1", [copyId]);
      if (activeLoan.length > 0) {
        const err = new Error('Cannot set status to AVAILABLE while copy has an active loan');
        err.statusCode = 400;
        throw err;
      }
    }

    await pool.query(
      `UPDATE book_copies 
       SET status = COALESCE(?, status),
           \`condition\` = COALESCE(?, \`condition\`),
           notes = COALESCE(?, notes)
       WHERE id = ?`,
      [status || null, condition || null, notes || null, copyId]
    );

    await logAudit({
      userId: actorUserId,
      action: 'COPY_STATUS_UPDATED',
      entityType: 'BOOK_COPY',
      entityId: copyId,
      details: { status, condition },
    });

    return { success: true };
  }
}
