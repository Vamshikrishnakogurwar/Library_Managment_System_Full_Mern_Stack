# Database Schema & Entity Relationship Documentation

LibraFlow relies on a relational database (Aiven Cloud MySQL 8.0) using the InnoDB storage engine for ACID compliance, referential integrity, and row-level locking.

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o| customers : "has profile"
    membership_types ||--o{ customers : "governs"
    categories ||--o{ books : "categorizes"
    books ||--|{ book_copies : "owns physical copies"
    customers ||--o{ loans : "borrows"
    book_copies ||--o{ loans : "is loaned via"
    users ||--o{ loans : "issues/receives"
    loans ||--o| fine_assessments : "incurs"
    customers ||--o{ fine_assessments : "owes"
    invoices ||--o{ invoice_items : "contains"
    customers ||--o{ invoices : "billed to"
    fine_assessments ||--o| invoices : "linked to"
    invoices ||--o{ payments : "settled with"
    users ||--o{ audit_logs : "triggers"

    users {
        int id PK
        string username UK
        string email UK
        string password_hash
        enum role
        enum status
    }

    customers {
        int id PK
        int user_id FK
        string customer_code UK
        int membership_type_id FK
        date membership_start_date
        date membership_expiry_date
        boolean is_suspended
    }

    books {
        int id PK
        string book_code UK
        string isbn
        string title
        string author
        decimal replacement_cost
    }

    book_copies {
        int id PK
        int book_id FK
        string barcode UK
        enum status
        enum condition
        string rack_location
    }

    loans {
        int id PK
        string loan_code UK
        int customer_id FK
        int copy_id FK
        date issue_date
        date due_date
        date return_date
        decimal policy_daily_fine_rate
        int policy_grace_period_days
        decimal policy_max_fine
        enum status
    }

    fine_assessments {
        int id PK
        int loan_id FK
        int customer_id FK
        int overdue_days
        decimal calculated_amount
        decimal assessed_amount
        decimal paid_amount
        decimal outstanding_balance
        enum status
    }

    invoices {
        int id PK
        string invoice_number UK
        int customer_id FK
        decimal total_amount
        decimal paid_amount
        decimal balance_amount
        enum status
    }

    payments {
        int id PK
        string payment_reference UK
        int invoice_id FK
        decimal amount
        enum payment_method
        timestamp payment_date
    }
```

## 2. Table Specifications and Keys

- **users**: Master account store supporting `ADMIN`, `LIBRARIAN`, and `CUSTOMER` roles. Passwords hashed using bcrypt.
- **membership_types**: Configurable subscription tiers specifying maximum borrow count, standard loan duration, grace period, and daily fine rates.
- **customers**: One-to-one extension of customer users, enforcing expiry dates and suspension flags.
- **books**: Catalog titles containing metadata, ISBN, and standard replacement cost.
- **book_copies**: Physical inventory tracking barcodes, condition, rack locations, and circulation availability.
- **loans**: Immutable circulation tracking. Stores issue-time snapshots of policy rates (`policy_daily_fine_rate`, `policy_grace_period_days`, `policy_max_fine`) so subsequent policy changes never retroactively corrupt past loans.
- **fine_assessments & invoices**: Financial records for overdue fees, lost book replacements, and itemized billing.
- **payments**: Immutable transaction receipts supporting cash, UPI, cards, and bank transfers.
- **audit_logs**: Immutable audit trail of actor actions, affected IDs, and event metadata.
