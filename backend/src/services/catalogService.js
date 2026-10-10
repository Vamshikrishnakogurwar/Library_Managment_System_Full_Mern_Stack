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
      `INSERT INTO books (book_code, isbn, title, author, publisher, edition, language, category_id, publication_year, replacement_cost, discount_percentage, description, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.discount_percentage || 0.00,
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

  static async updateBook(bookId, data, actorUserId) {
    const pool = getDbPool();
    const [existing] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (existing.length === 0) {
      const err = new Error('Book not found');
      err.statusCode = 404;
      throw err;
    }

    await pool.query(
      `UPDATE books SET
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        publisher = COALESCE(?, publisher),
        edition = COALESCE(?, edition),
        category_id = COALESCE(?, category_id),
        publication_year = COALESCE(?, publication_year),
        replacement_cost = COALESCE(?, replacement_cost),
        description = COALESCE(?, description),
        cover_image_url = COALESCE(?, cover_image_url),
        discount_percentage = COALESCE(?, discount_percentage)
       WHERE id = ?`,
      [
        data.title || null,
        data.author || null,
        data.publisher || null,
        data.edition || null,
        data.category_id || null,
        data.publication_year || null,
        data.replacement_cost !== undefined ? data.replacement_cost : null,
        data.description || null,
        data.cover_image_url || null,
        data.discount_percentage !== undefined ? data.discount_percentage : null,
        bookId
      ]
    );

    await logAudit({
      userId: actorUserId,
      action: 'BOOK_UPDATED',
      entityType: 'BOOK',
      entityId: bookId,
      details: data,
    });

    return this.getBookById(bookId);
  }

  static async adjustStock(bookId, delta, { rackLocation = 'General Stacks', notes = 'Inventory Adjustment' }, actorUserId) {
    const pool = getDbPool();
    const num = parseInt(delta, 10);
    if (isNaN(num) || num === 0) {
      const err = new Error('Delta must be a non-zero integer');
      err.statusCode = 400;
      throw err;
    }

    if (num > 0) {
      for (let i = 0; i < num; i++) {
        await this.addCopy(bookId, {
          rack_location: rackLocation,
          condition: 'GOOD',
          notes: notes,
        }, actorUserId);
      }
    } else {
      const neededToRemove = Math.abs(num);
      const [availableCopies] = await pool.query(
        "SELECT id FROM book_copies WHERE book_id = ? AND status = 'AVAILABLE' ORDER BY id DESC LIMIT ?",
        [bookId, neededToRemove]
      );

      if (availableCopies.length < neededToRemove) {
        const err = new Error(`Cannot decrease stock by ${neededToRemove}: only ${availableCopies.length} copy(ies) are currently AVAILABLE.`);
        err.statusCode = 400;
        throw err;
      }

      for (const copy of availableCopies) {
        await pool.query("UPDATE book_copies SET status = 'WITHDRAWN', notes = ? WHERE id = ?", [notes, copy.id]);
      }

      await logAudit({
        userId: actorUserId,
        action: 'STOCK_DECREASED',
        entityType: 'BOOK',
        entityId: bookId,
        details: { count: neededToRemove, reason: notes },
      });
    }

    return this.getBookById(bookId);
  }

  static async purchaseBook({ customerId, bookId, actorUserId, paymentMethod = 'CASH', notes }) {
    const pool = getDbPool();
    const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customers.length === 0) {
      const err = new Error('Customer profile not found');
      err.statusCode = 404;
      throw err;
    }
    const customer = customers[0];

    const [books] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      const err = new Error('Book not found');
      err.statusCode = 404;
      throw err;
    }
    const book = books[0];

    const [copies] = await pool.query(
      "SELECT id, barcode FROM book_copies WHERE book_id = ? AND status = 'AVAILABLE' LIMIT 1",
      [bookId]
    );
    if (copies.length === 0) {
      const err = new Error('No copies available for purchase in stock.');
      err.statusCode = 400;
      throw err;
    }
    const copy = copies[0];

    const price = parseFloat(book.replacement_cost) || 500.00;
    const discountPct = parseFloat(book.discount_percentage) || 0;
    const discountAmount = Number(((price * discountPct) / 100).toFixed(2));
    const finalAmount = Number(Math.max(0, price - discountAmount).toFixed(2));

    await pool.query("UPDATE book_copies SET status = 'WITHDRAWN', notes = ? WHERE id = ?", [
      `Sold to Customer ID ${customerId} (${customer.customer_code})`,
      copy.id
    ]);

    const invoiceNum = `INV-BUY-${Date.now().toString(36).toUpperCase()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const [invRes] = await pool.query(
      `INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, discount_amount, total_amount, paid_amount, balance_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'PAID', ?)`,
      [
        invoiceNum,
        customerId,
        todayStr,
        todayStr,
        price,
        discountAmount,
        finalAmount,
        finalAmount,
        notes || `Outright Book Purchase: ${book.title} (${copy.barcode})`
      ]
    );

    const invoiceId = invRes.insertId;

    await pool.query(
      `INSERT INTO invoice_items (invoice_id, description, charge_type, quantity, unit_amount, total_amount)
       VALUES (?, ?, 'PURCHASE', 1, ?, ?)`,
      [invoiceId, `Book Purchase: ${book.title}`, price, finalAmount]
    );

    const payRef = `PAY-BUY-${Date.now().toString(36).toUpperCase()}`;
    await pool.query(
      `INSERT INTO payments (payment_reference, invoice_id, customer_id, received_by_user_id, amount, payment_method, transaction_note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payRef,
        invoiceId,
        customerId,
        actorUserId,
        finalAmount,
        paymentMethod,
        `Payment received for purchase of ${book.title}`
      ]
    );

    await logAudit({
      userId: actorUserId,
      action: 'BOOK_PURCHASED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      details: { bookId, copyId: copy.id, finalAmount, customerId }
    });

    return {
      success: true,
      invoiceNumber: invoiceNum,
      paymentReference: payRef,
      bookTitle: book.title,
      barcode: copy.barcode,
      totalAmount: finalAmount,
      discountAmount,
      invoiceId
    };
  }
}
