-- ==============================================================================
-- Migration 001: Initial Schema for LibraFlow Library Management System
-- Database Engine: MySQL 8.0+ / Aiven Cloud MySQL
-- ==============================================================================

-- 1. Migrations Tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Library Settings & Circulation Policies
CREATE TABLE IF NOT EXISTS library_settings (
    id INT PRIMARY KEY DEFAULT 1,
    library_name VARCHAR(150) NOT NULL DEFAULT 'LibraFlow Central Library',
    library_email VARCHAR(100) DEFAULT 'admin@libraflow.local',
    library_phone VARCHAR(30) DEFAULT '+91 9876543210',
    library_address TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
    default_loan_days INT NOT NULL DEFAULT 14,
    default_grace_period_days INT NOT NULL DEFAULT 2,
    default_daily_fine_rate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    default_max_fine_per_loan DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    receipt_footer_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Membership Types / Plans
CREATE TABLE IF NOT EXISTS membership_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_borrow_limit INT NOT NULL DEFAULT 3,
    loan_duration_days INT NOT NULL DEFAULT 14,
    grace_period_days INT NOT NULL DEFAULT 2,
    daily_fine_rate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    max_fine_per_loan DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    membership_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    validity_days INT NOT NULL DEFAULT 365,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Users (Admin, Staff / Librarian, Customer)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role ENUM('ADMIN', 'LIBRARIAN', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    status ENUM('ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customer Profile details (1-to-1 with User role CUSTOMER)
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    customer_code VARCHAR(30) NOT NULL UNIQUE,
    membership_type_id INT NOT NULL,
    address TEXT,
    id_proof_number VARCHAR(100),
    membership_start_date DATE NOT NULL,
    membership_expiry_date DATE NOT NULL,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_customer_membership FOREIGN KEY (membership_type_id) REFERENCES membership_types(id) ON DELETE RESTRICT,
    INDEX idx_customer_code (customer_code),
    INDEX idx_customer_expiry (membership_expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Book Categories
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Books (Catalog Titles)
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_code VARCHAR(40) NOT NULL UNIQUE,
    isbn VARCHAR(30) NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(150),
    edition VARCHAR(50),
    language VARCHAR(50) DEFAULT 'English',
    category_id INT NULL,
    publication_year INT,
    replacement_cost DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    description TEXT,
    cover_image_url VARCHAR(500),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_book_isbn (isbn),
    INDEX idx_book_title (title),
    INDEX idx_book_author (author),
    INDEX idx_book_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Physical Book Copies
CREATE TABLE IF NOT EXISTS book_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    barcode VARCHAR(60) NOT NULL UNIQUE,
    copy_number INT NOT NULL DEFAULT 1,
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('AVAILABLE', 'ISSUED', 'RESERVED', 'DAMAGED', 'LOST', 'WITHDRAWN') NOT NULL DEFAULT 'AVAILABLE',
    `condition` ENUM('NEW', 'GOOD', 'FAIR', 'DAMAGED') NOT NULL DEFAULT 'GOOD',
    rack_location VARCHAR(100) DEFAULT 'General Stacks',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
    INDEX idx_copy_status (status),
    INDEX idx_copy_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Loans (Circulation Issues)
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_code VARCHAR(40) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    copy_id INT NOT NULL,
    issued_by_user_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    actual_return_timestamp DATETIME NULL,
    returned_by_user_id INT NULL,
    status ENUM('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST') NOT NULL DEFAULT 'ACTIVE',
    -- Immutable policy snapshots taken at issue time
    policy_daily_fine_rate DECIMAL(10,2) NOT NULL,
    policy_grace_period_days INT NOT NULL,
    policy_max_fine DECIMAL(10,2) NOT NULL,
    return_condition ENUM('NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST') NULL,
    return_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_receiver FOREIGN KEY (returned_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_loans_status (status),
    INDEX idx_loans_due_date (due_date),
    INDEX idx_loans_customer_status (customer_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Fine Assessments
CREATE TABLE IF NOT EXISTS fine_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    overdue_days INT NOT NULL DEFAULT 0,
    grace_days_applied INT NOT NULL DEFAULT 0,
    daily_rate_applied DECIMAL(10,2) NOT NULL,
    calculated_amount DECIMAL(10,2) NOT NULL,
    assessed_amount DECIMAL(10,2) NOT NULL,
    waived_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    outstanding_balance DECIMAL(10,2) NOT NULL,
    status ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED') NOT NULL DEFAULT 'UNPAID',
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fine_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fine_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_fine_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    loan_id INT NULL,
    fine_id INT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_fine FOREIGN KEY (fine_id) REFERENCES fine_assessments(id) ON DELETE SET NULL,
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    charge_type ENUM('OVERDUE_FINE', 'LOST_BOOK_REPLACEMENT', 'DAMAGE_FEE', 'MEMBERSHIP_FEE', 'MISC') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_reference VARCHAR(60) NOT NULL UNIQUE,
    invoice_id INT NOT NULL,
    customer_id INT NOT NULL,
    received_by_user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_note VARCHAR(255),
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_receiver FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_payment_invoice (invoice_id),
    INDEX idx_payment_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Fine Adjustments and Waivers
CREATE TABLE IF NOT EXISTS fine_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fine_id INT NOT NULL,
    authorized_by_user_id INT NOT NULL,
    previous_amount DECIMAL(10,2) NOT NULL,
    waived_amount DECIMAL(10,2) NOT NULL,
    new_outstanding_amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adjustment_fine FOREIGN KEY (fine_id) REFERENCES fine_assessments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_adjustment_authorizer FOREIGN KEY (authorized_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_code VARCHAR(40) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    book_id INT NOT NULL,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    queue_position INT NOT NULL DEFAULT 1,
    status ENUM('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    notified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    notes TEXT,
    CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_res_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
    INDEX idx_res_status (status),
    INDEX idx_res_book (book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(60) NOT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
