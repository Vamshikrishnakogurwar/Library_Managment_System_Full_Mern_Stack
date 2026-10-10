import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
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
  const adminRow = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  if (!adminRow) {
    const saltRounds = 10;
    const defaultHash = bcrypt.hashSync('Password123!', saltRounds);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
      VALUES ('admin', 'admin@libraflow.org', ?, 'System Administrator', 'ADMIN', 'ACTIVE', '+91 9876543210')
    `).run(defaultHash);
  }
}
