# LibraFlow Viva Voce Comprehensive Guide

This reference document prepares 3rd-year B.Tech Information Technology students for their final project viva voce, technical demonstration, and architecture questioning.

---

## 1. Project Abstract & Objectives

**Abstract**:
LibraFlow is an enterprise-grade web application engineered to modernize library operations, circulation tracking, and overdue fine collection. By leveraging a single-page React frontend with a transactional Express.js backend and Aiven Cloud MySQL database, the system replaces traditional, error-prone manual register workflows with atomic, tamper-evident circulation events.

**Key Objectives**:
1. Enforce strict ACID compliance on book issuance, returns, and invoice generation.
2. Automate overdue fine calculations using policy snapshots and exact decimal arithmetic.
3. Provide role-based access control protecting customer boundaries.
4. Support live circulation metrics without fabricated or hardcoded statistical mock data.

---

## 2. 25+ Comprehensive Viva Questions & Expert Answers

### Q1: Why did you choose MySQL instead of MongoDB for this project?
**Answer**:
Circulation, inventory management, and fine payments require strict relational integrity and transactional guarantees. In MySQL, foreign key constraints prevent orphaned records (e.g., deleting a book title that has an active loan or outstanding fine). Furthermore, MySQL's InnoDB engine supports ACID transactions with row-level locks (`SELECT ... FOR UPDATE`), which prevents race conditions such as two librarians issuing the same physical copy concurrently. In a document store like MongoDB, modeling historical balance updates across separate collections without multi-document ACID transactions can lead to financial inconsistencies.

### Q2: How does the system prevent two librarians from issuing the exact same physical copy at the same time?
**Answer**:
We use pessimistic concurrency control inside a database transaction (`withTransaction`). When the issue request is received, the backend executes:
```sql
SELECT * FROM book_copies WHERE id = ? FOR UPDATE;
```
This acquires an exclusive row-level lock on the physical copy until the transaction commits. If a second librarian attempts to issue that copy at the same moment, the database forces the second request to wait. Once the first transaction sets `status = 'ISSUED'` and commits, the second transaction reads the updated status and immediately throws an error: `"Copy is currently ISSUED and cannot be issued."`

### Q3: What is the fine calculation algorithm, and how is it tested?
**Answer**:
The fine is calculated using the formula:
$$\text{Overdue Days} = \max(0, \lfloor (\text{Return Date} - \text{Due Date}) \rfloor)$$
If $\text{Overdue Days} > \text{Grace Period}$, $\text{Chargeable Days} = \text{Overdue Days}$, else $0$.
$$\text{Fine} = \min(\text{Chargeable Days} \times \text{Daily Rate}, \text{Max Fine Cap})$$
This algorithm is tested with automated unit tests covering on-time returns, grace period returns, overdue returns, and policy cap limits.

### Q4: Why do you store policy snapshots in the `loans` table?
**Answer**:
If library policies change in the future (for example, if the fine rate increases from ₹5 to ₹10/day), historical loans issued before the change must still be governed by the policy agreed upon at the time of issuance. Storing `policy_daily_fine_rate`, `policy_grace_period_days`, and `policy_max_fine` directly on the loan ensures that calculations remain fair, immutable, and reproducible.

### Q5: How is financial accuracy ensured when dealing with money?
**Answer**:
We avoid floating-point binary inaccuracies (such as `0.1 + 0.2 = 0.30000000000000004`) by using MySQL's `DECIMAL(10, 2)` column type and configuring the `mysql2` driver with `decimalNumbers: false`. This ensures numbers are transferred and formatted as exact decimal strings with fixed two-decimal precision.

### Q6: How does the system ensure customers cannot see each other's data?
**Answer**:
We enforce customer boundary isolation on the backend. When a customer logs in, their JWT payload contains their specific `customerProfileId`. Endpoints such as `/api/v1/customers/:id`, `/api/v1/circulation/loans`, and `/api/v1/billing/invoices` check `req.user.role`. If the role is `CUSTOMER`, the server ensures they can only query records where `customer_id` matches their own verified ID, returning `403 Forbidden` if an unauthorized ID is supplied.

### Q7: What is the purpose of the `schema_migrations` table?
**Answer**:
The `schema_migrations` table tracks every versioned `.sql` script that has been applied to the database. When the migration script runs (`npm run db:migrate`), it inspects applied files and executes only newly added migration files in alphabetical order inside a transaction. This allows development and cloud production environments to stay in sync safely.

### Q8: How is the initial administrator account created?
**Answer**:
To satisfy strict security guidelines, no default admin credentials or hardcoded passwords exist in the codebase. Instead, the administrator is initialized through an explicit CLI bootstrap script (`npm run admin:bootstrap`) or via pre-configured environment variables, hashing the password using `bcrypt` before writing to MySQL.

### Q9: What is the difference between a Book and a Book Copy?
**Answer**:
A **Book** represents a bibliographic catalog title (e.g., *Introduction to Algorithms* by Cormen, ISBN 978-0262033848). A **Book Copy** represents an individual physical item on a library shelf with its own unique barcode, acquisition date, physical condition, and rack location. A single book title can have multiple physical copies.

### Q10: How does Vite enhance React development compared to Create React App?
**Answer**:
Vite uses native ES modules (`ESM`) in modern browsers and the ultra-fast `esbuild`/`rolldown` bundler, providing near-instantaneous Hot Module Replacement (HMR) and fast production builds, whereas legacy Create React App relies on Webpack which bundles the entire application before serving.

### Q11: How do you handle partial payments?
**Answer**:
When a payment is processed towards an invoice, the backend executes an atomic transaction that records the payment receipt in the `payments` table and updates `invoices.paid_amount` and `invoices.balance_amount`. If `balance_amount` is greater than 0, the invoice status becomes `PARTIALLY_PAID`; when the balance reaches 0, it transitions to `PAID`.

### Q12: What role does Tailwind CSS play in the frontend architecture?
**Answer**:
Tailwind CSS provides a utility-first styling architecture that compiles down to a small, purged CSS bundle. It guarantees consistent design tokens for spacing, typography, and colors while eliminating dead CSS classes.

### Q13: What does the `/health` endpoint do?
**Answer**:
The `/health` endpoint allows monitoring tools and container orchestrators (like Docker or Kubernetes) to verify that both the Node.js HTTP server and the MySQL database connection pool are active and responding normally.

### Q14: What is the purpose of Helmet and Morgan in Express?
**Answer**:
- **Helmet**: Sets critical HTTP security headers (e.g., `X-DNS-Prefetch-Control`, `X-Frame-Options`, `Strict-Transport-Security`) to guard against cross-site scripting (XSS) and clickjacking.
- **Morgan**: Logs incoming HTTP requests, response status codes, and execution durations for debugging and observability.

### Q15: How does the AI Assistant work without breaking core library functions?
**Answer**:
The AI assistant is strictly optional and decoupled. It retrieves real catalog metadata and circulation policies from MySQL and passes them as grounding context to the Gemini API. The AI is never permitted to calculate fines, issue books, or mutate database state; those operations are strictly handled by deterministic backend code.

---

## 3. Project Demonstration Checklist for Students

During your viva presentation, demonstrate these steps:
1. **Empty Database Verification**: Show that the dashboard displays true zero metrics and clean empty states before data entry.
2. **Book Title & Physical Copy Creation**: Add a new book title and generate two unique copy barcodes.
3. **Customer Registration**: Register a customer under the undergraduate Student plan.
4. **Issue Book**: Search for the customer, select an available copy, and confirm the issue.
5. **Simulated Return**: Open the Return Desk, review the fine breakdown preview, and confirm the return.
6. **Invoicing & Payment**: Open the invoice, record a partial payment in Cash or UPI, and print the official receipt.
7. **Customer Boundary Check**: Log in as the customer and verify that only their own loans and receipts are visible.
