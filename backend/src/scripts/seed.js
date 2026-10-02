import readline from 'readline';
import bcrypt from 'bcrypt';
import { getDbPool } from '../config/database.js';

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runSeed() {
  console.log('====================================================');
  console.log('   LibraFlow Development Seed Script (OPTIONAL)');
  console.log('   Warning: Only for isolated local development/testing!');
  console.log('====================================================\n');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SEED SCRIPT IS STRICTLY FORBIDDEN IN PRODUCTION ENVIRONMENTS.');
    process.exit(1);
  }

  const autoConfirm = process.env.AUTO_SEED === 'true' || process.argv.includes('--yes') || process.argv.includes('-y');
  if (!autoConfirm) {
    const confirm = await ask('Are you sure you want to seed development sample data? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Seed aborted.');
      process.exit(0);
    }
  }

  const pool = getDbPool();

  try {
    console.log('🌱 Seeding initial library settings & membership types...');
    await pool.query(`
      INSERT INTO library_settings (id, library_name, library_email, library_phone, library_address, default_loan_days, default_grace_period_days, default_daily_fine_rate, default_max_fine_per_loan)
      VALUES (1, 'LibraFlow Central Tech Library', 'librarian@libraflow.org', '+91 9876543210', 'Block 4, Academic City, Hyderabad, India', 14, 2, 5.00, 200.00)
      ON DUPLICATE KEY UPDATE library_name = VALUES(library_name);
    `);

    await pool.query(`
      INSERT INTO membership_types (code, name, description, max_borrow_limit, loan_duration_days, grace_period_days, daily_fine_rate, max_fine_per_loan, membership_fee, validity_days)
      VALUES 
      ('STUDENT', 'B.Tech / Student Plan', 'Standard borrowing privileges for undergraduate engineering students', 4, 14, 2, 5.00, 250.00, 100.00, 365),
      ('FACULTY', 'Faculty & Researchers', 'Extended borrowing duration for academic teaching and research staff', 8, 30, 5, 2.00, 500.00, 0.00, 730),
      ('GENERAL', 'General Public / Community', 'Public access community reading membership', 2, 7, 1, 10.00, 150.00, 250.00, 180)
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);

    console.log('📚 Seeding sample categories...');
    await pool.query(`
      INSERT INTO categories (name, description) VALUES
      ('Computer Science & IT', 'Software engineering, algorithms, networking, and databases'),
      ('Artificial Intelligence', 'Machine learning, deep learning, NLP, and intelligent agents'),
      ('Mathematics & Discrete Logic', 'Applied mathematics, calculus, linear algebra, and discrete math'),
      ('Electronics & IoT', 'Embedded systems, microcontrollers, and VLSI design')
      ON DUPLICATE KEY UPDATE description = VALUES(description);
    `);

    console.log('👤 Seeding default Librarian and demo Customer accounts...');
    const hashedPwd = await bcrypt.hash('Password123!', 10);

    // Librarian
    await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
      VALUES ('librarian_demo', 'librarian@libraflow.org', ?, 'Anita Sharma (Chief Librarian)', 'LIBRARIAN', 'ACTIVE', '+91 9876543211')
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
    `, [hashedPwd]);

    // Customer user
    const [custUserRes] = await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, status, phone)
      VALUES ('rahul_student', 'rahul.sharma@example.edu', ?, 'Rahul Sharma', 'CUSTOMER', 'ACTIVE', '+91 9876543212')
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
    `, [hashedPwd]);

    // Customer profile
    const [custUser] = await pool.query("SELECT id FROM users WHERE username = 'rahul_student'");
    const [mType] = await pool.query("SELECT id FROM membership_types WHERE code = 'STUDENT'");
    
    if (custUser.length > 0 && mType.length > 0) {
      await pool.query(`
        INSERT INTO customers (user_id, customer_code, membership_type_id, address, id_proof_number, membership_start_date, membership_expiry_date)
        VALUES (?, 'CUST-2026-0001', ?, 'Room 204, Campus Hostel A', 'STU2023IT045', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY))
        ON DUPLICATE KEY UPDATE address = VALUES(address);
      `, [custUser[0].id, mType[0].id]);
    }

    console.log('📖 Seeding sample book titles and physical copies...');
    const [catCs] = await pool.query("SELECT id FROM categories WHERE name = 'Computer Science & IT'");
    const [catAi] = await pool.query("SELECT id FROM categories WHERE name = 'Artificial Intelligence'");

    const csCatId = catCs[0]?.id || null;
    const aiCatId = catAi[0]?.id || null;

    await pool.query(`
      INSERT INTO books (book_code, isbn, title, author, publisher, edition, category_id, publication_year, replacement_cost, description)
      VALUES 
      ('BK-CS-001', '978-0131103627', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Prentice Hall', '2nd Edition', ?, 1988, 650.00, 'The authoritative reference for C programming.'),
      ('BK-CS-002', '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', 'MIT Press', '3rd Edition', ?, 2009, 1450.00, 'The classic comprehensive algorithms textbook.'),
      ('BK-AI-001', '978-0134610993', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', '4th Edition', ?, 2020, 1200.00, 'Leading textbook in artificial intelligence.')
      ON DUPLICATE KEY UPDATE title = VALUES(title);
    `, [csCatId, csCatId, aiCatId]);

    // Copies
    const [b1] = await pool.query("SELECT id FROM books WHERE book_code = 'BK-CS-001'");
    const [b2] = await pool.query("SELECT id FROM books WHERE book_code = 'BK-CS-002'");
    const [b3] = await pool.query("SELECT id FROM books WHERE book_code = 'BK-AI-001'");

    if (b1.length > 0) {
      await pool.query(`
        INSERT INTO book_copies (book_id, barcode, copy_number, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
        VALUES 
        (?, 'BC-CS001-01', 1, CURDATE(), 650.00, 'AVAILABLE', 'GOOD', 'Shelf CS-01'),
        (?, 'BC-CS001-02', 2, CURDATE(), 650.00, 'AVAILABLE', 'GOOD', 'Shelf CS-01')
        ON DUPLICATE KEY UPDATE rack_location = VALUES(rack_location);
      `, [b1[0].id, b1[0].id]);
    }

    if (b2.length > 0) {
      await pool.query(`
        INSERT INTO book_copies (book_id, barcode, copy_number, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
        VALUES 
        (?, 'BC-CS002-01', 1, CURDATE(), 1450.00, 'AVAILABLE', 'GOOD', 'Shelf CS-02'),
        (?, 'BC-CS002-02', 2, CURDATE(), 1450.00, 'AVAILABLE', 'GOOD', 'Shelf CS-02')
        ON DUPLICATE KEY UPDATE rack_location = VALUES(rack_location);
      `, [b2[0].id, b2[0].id]);
    }

    if (b3.length > 0) {
      await pool.query(`
        INSERT INTO book_copies (book_id, barcode, copy_number, acquisition_date, acquisition_cost, status, \`condition\`, rack_location)
        VALUES 
        (?, 'BC-AI001-01', 1, CURDATE(), 1200.00, 'AVAILABLE', 'NEW', 'Shelf AI-01')
        ON DUPLICATE KEY UPDATE rack_location = VALUES(rack_location);
      `, [b3[0].id]);
    }

    console.log('✅ Development seeding complete!');
    console.log('Test Accounts created:');
    console.log('- Librarian: username="librarian_demo", password="Password123!"');
    console.log('- Customer:  username="rahul_student",  password="Password123!"');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

runSeed();
