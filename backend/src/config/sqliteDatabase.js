import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In serverless environments like Vercel, the only writable directory is /tmp
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dataDir = isServerless ? '/tmp' : path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'libraflow.sqlite');

let sqliteDb = null;

export function getSqliteDb() {
  if (sqliteDb) return sqliteDb;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  initSqliteSchema(sqliteDb);
  return sqliteDb;
}

function initSqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      library_name TEXT NOT NULL DEFAULT 'LibraFlow Central Library',
      library_email TEXT DEFAULT 'admin@libraflow.local',
      library_phone TEXT DEFAULT '+91 9876543210',
      library_address TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      default_loan_days INTEGER NOT NULL DEFAULT 14,
      default_grace_period_days INTEGER NOT NULL DEFAULT 2,
      default_daily_fine_rate NUMERIC NOT NULL DEFAULT 5.00,
      default_max_fine_per_loan NUMERIC NOT NULL DEFAULT 200.00,
      receipt_footer_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS membership_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      max_borrow_limit INTEGER NOT NULL DEFAULT 3,
      loan_duration_days INTEGER NOT NULL DEFAULT 14,
      grace_period_days INTEGER NOT NULL DEFAULT 2,
      daily_fine_rate NUMERIC NOT NULL DEFAULT 5.00,
      max_fine_per_loan NUMERIC NOT NULL DEFAULT 200.00,
      membership_fee NUMERIC NOT NULL DEFAULT 0.00,
      validity_days INTEGER NOT NULL DEFAULT 365,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      customer_code TEXT NOT NULL UNIQUE,
      membership_type_id INTEGER NOT NULL,
      address TEXT,
      id_proof_number TEXT,
      membership_start_date TEXT NOT NULL,
      membership_expiry_date TEXT NOT NULL,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (membership_type_id) REFERENCES membership_types(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_code TEXT NOT NULL UNIQUE,
      isbn TEXT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT,
      edition TEXT,
      language TEXT DEFAULT 'English',
      category_id INTEGER,
      publication_year INTEGER,
      replacement_cost NUMERIC NOT NULL DEFAULT 500.00,
      discount_percentage NUMERIC NOT NULL DEFAULT 0.00,
      description TEXT,
      cover_image_url TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS book_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      barcode TEXT NOT NULL UNIQUE,
      copy_number INTEGER NOT NULL DEFAULT 1,
      acquisition_date TEXT NOT NULL,
      acquisition_cost NUMERIC NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      condition TEXT NOT NULL DEFAULT 'GOOD',
      rack_location TEXT DEFAULT 'General Stacks',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      copy_id INTEGER NOT NULL,
      issued_by_user_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      actual_return_timestamp TEXT,
      returned_by_user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      policy_daily_fine_rate NUMERIC NOT NULL,
      policy_grace_period_days INTEGER NOT NULL,
      policy_max_fine NUMERIC NOT NULL,
      return_condition TEXT,
      return_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (copy_id) REFERENCES book_copies(id),
      FOREIGN KEY (issued_by_user_id) REFERENCES users(id),
      FOREIGN KEY (returned_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fine_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      overdue_days INTEGER NOT NULL DEFAULT 0,
      grace_days_applied INTEGER NOT NULL DEFAULT 0,
      daily_rate_applied NUMERIC NOT NULL,
      calculated_amount NUMERIC NOT NULL,
      assessed_amount NUMERIC NOT NULL,
      waived_amount NUMERIC NOT NULL DEFAULT 0.00,
      paid_amount NUMERIC NOT NULL DEFAULT 0.00,
      outstanding_balance NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      loan_id INTEGER,
      fine_id INTEGER,
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      subtotal NUMERIC NOT NULL DEFAULT 0.00,
      discount_amount NUMERIC NOT NULL DEFAULT 0.00,
      total_amount NUMERIC NOT NULL DEFAULT 0.00,
      paid_amount NUMERIC NOT NULL DEFAULT 0.00,
      balance_amount NUMERIC NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (fine_id) REFERENCES fine_assessments(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      charge_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_amount NUMERIC NOT NULL,
      total_amount NUMERIC NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_reference TEXT NOT NULL UNIQUE,
      invoice_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      received_by_user_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      transaction_note TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (received_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fine_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fine_id INTEGER NOT NULL,
      authorized_by_user_id INTEGER NOT NULL,
      previous_amount NUMERIC NOT NULL,
      waived_amount NUMERIC NOT NULL,
      new_outstanding_amount NUMERIC NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fine_id) REFERENCES fine_assessments(id),
      FOREIGN KEY (authorized_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      queue_position INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notified_at DATETIME,
      expires_at DATETIME,
      notes TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Auto-migrate column discount_percentage if existing database table was created prior
  try {
    db.prepare("ALTER TABLE books ADD COLUMN discount_percentage NUMERIC NOT NULL DEFAULT 0.00").run();
  } catch (e) {
    // Column already exists
  }

  // Ensure default settings exist
  const settingsRow = db.prepare('SELECT id FROM library_settings WHERE id = 1').get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO library_settings (id, library_name, library_email, library_phone, library_address, default_loan_days, default_grace_period_days, default_daily_fine_rate, default_max_fine_per_loan)
      VALUES (1, 'LibraFlow Central Tech Library', 'librarian@libraflow.org', '+91 9876543210', 'Block 4, Academic City, Hyderabad, India', 14, 2, 5.00, 200.00)
    `).run();
  }

  // Ensure default membership plans exist
  const countPlans = db.prepare('SELECT COUNT(*) as count FROM membership_types').get();
  if (countPlans.count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO membership_types (code, name, description, max_borrow_limit, loan_duration_days, grace_period_days, daily_fine_rate, max_fine_per_loan, membership_fee, validity_days, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertPlan.run('STUDENT', 'B.Tech / Student Plan', 'Standard borrowing privileges for undergraduate engineering students', 4, 14, 2, 5.00, 250.00, 100.00, 365);
    insertPlan.run('FACULTY', 'Faculty & Researchers', 'Extended borrowing duration for academic teaching and research staff', 8, 30, 5, 2.00, 500.00, 0.00, 730);
    insertPlan.run('GENERAL', 'General Public / Community', 'Public access community reading membership', 2, 7, 1, 10.00, 150.00, 250.00, 180);
  }

  // Ensure default categories exist
  const countCats = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (countCats.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    insertCat.run('Computer Science & IT', 'Software engineering, algorithms, networking, and databases');
    insertCat.run('Artificial Intelligence', 'Machine learning, deep learning, NLP, and intelligent agents');
    insertCat.run('Mathematics & Discrete Logic', 'Applied mathematics, calculus, linear algebra, and discrete math');
    insertCat.run('Electronics & IoT', 'Embedded systems, microcontrollers, and VLSI design');
  }

  // Ensure initial admin user exists
  let adminUserId = null;
  const adminRow = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminRow) {
    const saltRounds = 10;
    const defaultHash = bcrypt.hashSync('Password123!', saltRounds);
    const info = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
      VALUES ('admin', 'admin@libraflow.org', ?, 'System Administrator', 'ADMIN', 'ACTIVE', '+91 9876543210')
    `).run(defaultHash);
    adminUserId = Number(info.lastInsertRowid);
  } else {
    adminUserId = adminRow.id;
  }

  // Ensure Admin Customer Profile exists
  const adminCust = db.prepare("SELECT id FROM customers WHERE user_id = ?").get(adminUserId);
  if (!adminCust) {
    db.prepare(`
      INSERT INTO customers (user_id, customer_code, membership_type_id, address, id_proof_number, membership_start_date, membership_expiry_date, is_suspended, notes)
      VALUES (?, 'CUST-ADMIN-00001', 1, 'Library Operations HQ, Tech Campus', 'GOVT-ADMIN-01', '2026-01-01', '2030-01-01', 0, 'System Administrator Profile')
    `).run(adminUserId);
  }

  // Ensure initial student / customer exists
  let studentUserId = null;
  const studentRow = db.prepare("SELECT id FROM users WHERE username = 'test_student'").get();
  if (!studentRow) {
    const saltRounds = 10;
    const defaultHash = bcrypt.hashSync('Password123!', saltRounds);
    const info = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
      VALUES ('test_student', 'test_student@example.com', ?, 'Test Student', 'CUSTOMER', 'ACTIVE', '+91 9999999999')
    `).run(defaultHash);
    studentUserId = Number(info.lastInsertRowid);
  } else {
    studentUserId = studentRow.id;
  }

  const studentCust = db.prepare("SELECT id FROM customers WHERE user_id = ?").get(studentUserId);
  if (!studentCust) {
    db.prepare(`
      INSERT INTO customers (user_id, customer_code, membership_type_id, address, id_proof_number, membership_start_date, membership_expiry_date, is_suspended, notes)
      VALUES (?, 'CUST-2026-00002', 1, 'Hostel Block 4, Campus', 'STU-2026-001', '2026-01-01', '2028-01-01', 0, 'Standard Student Membership')
    `).run(studentUserId);
  }

  // Ensure default books and physical copies exist
  const countBooks = db.prepare('SELECT COUNT(*) as count FROM books').get();
  if (countBooks.count === 0) {
    const initialBooks = [
      {
        book_code: 'BK-CS101-DS',
        isbn: '978-0131103627',
        title: 'Data Structures and Algorithms in Java',
        author: 'Robert Lafore',
        publisher: 'Pearson Education',
        edition: '2nd Edition',
        language: 'English',
        category_id: 1,
        publication_year: 2021,
        replacement_cost: 650.00,
        discount_percentage: 15.00,
        description: 'Fundamental guide to data structures, algorithm analysis, linked lists, trees, graphs, and Big-O computational complexity for IT students.',
        cover_image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e37946?auto=format&fit=crop&q=80&w=400',
        copies: 5,
      },
      {
        book_code: 'BK-CS102-OS',
        isbn: '978-1118063330',
        title: 'Operating System Concepts',
        author: 'Abraham Silberschatz, Peter B. Galvin',
        publisher: 'Wiley Higher Education',
        edition: '10th Edition',
        language: 'English',
        category_id: 1,
        publication_year: 2020,
        replacement_cost: 820.00,
        discount_percentage: 20.00,
        description: 'The definitive "dinosaur book" covering process management, virtual memory, concurrency, multi-threading, CPU scheduling, and file systems.',
        cover_image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
        copies: 4,
      },
      {
        book_code: 'BK-CS103-DBMS',
        isbn: '978-0078022159',
        title: 'Database System Concepts & Relational Architecture',
        author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
        publisher: 'McGraw-Hill Education',
        edition: '7th Edition',
        language: 'English',
        category_id: 1,
        publication_year: 2022,
        replacement_cost: 750.00,
        discount_percentage: 12.00,
        description: 'In-depth study of relational databases, SQL queries, normalization, ACID transaction processing, indexing, and distributed storage systems.',
        cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
        copies: 6,
      },
      {
        book_code: 'BK-AI201-DL',
        isbn: '978-0262035613',
        title: 'Deep Learning with Python & PyTorch',
        author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
        publisher: 'MIT Press',
        edition: '1st Edition',
        language: 'English',
        category_id: 2,
        publication_year: 2023,
        replacement_cost: 1100.00,
        discount_percentage: 25.00,
        description: 'Comprehensive mathematical grounding and hands-on neural network design, CNNs, RNNs, transformers, and generative modeling.',
        cover_image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400',
        copies: 4,
      },
      {
        book_code: 'BK-LIT502-ATOMIC',
        isbn: '978-0735211292',
        title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
        author: 'James Clear',
        publisher: 'Avery / Penguin Random House',
        edition: 'Hardcover Edition',
        language: 'English',
        category_id: 1,
        publication_year: 2022,
        replacement_cost: 499.00,
        discount_percentage: 25.00,
        description: 'No-nonsense framework for making tiny behavioral changes that yield extraordinary personal and professional results over time.',
        cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        copies: 5,
      }
    ];

    const insertBook = db.prepare(`
      INSERT INTO books (book_code, isbn, title, author, publisher, edition, language, category_id, publication_year, replacement_cost, discount_percentage, description, cover_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCopy = db.prepare(`
      INSERT INTO book_copies (book_id, copy_number, barcode, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
      VALUES (?, ?, ?, '2026-01-01', ?, 'AVAILABLE', 'NEW', 'Section A - Stacks')
    `);

    for (const b of initialBooks) {
      const bookRes = insertBook.run(
        b.book_code, b.isbn, b.title, b.author, b.publisher, b.edition, b.language, b.category_id,
        b.publication_year, b.replacement_cost, b.discount_percentage, b.description, b.cover_image_url
      );
      const bId = Number(bookRes.lastInsertRowid);
      for (let i = 1; i <= b.copies; i++) {
        const barcode = `BAR-${bId.toString().padStart(4, '0')}-${i.toString().padStart(3, '0')}`;
        insertCopy.run(bId, i, barcode, b.replacement_cost);
      }
    }
  }
}
