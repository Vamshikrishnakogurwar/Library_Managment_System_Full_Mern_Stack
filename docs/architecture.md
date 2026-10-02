# LibraFlow Application Architecture

LibraFlow is built with a decoupled client-server architecture designed for reliability, strict financial precision, and concurrent transaction safety.

## 1. High-Level Architecture Overview

```mermaid
graph TD
    Client[React + Vite Single Page Application]
    Proxy[Vite Proxy / Cloud Reverse Proxy]
    API[Express.js REST API Server /api/v1]
    Auth[JWT Authentication & Role Middleware]
    Services[Circulation, Billing, Catalog Services]
    DB[(Aiven Cloud MySQL 8.0 / InnoDB)]
    Gemini[Optional Gemini AI Intelligence API]

    Client -->|HTTP/REST /api/v1| Proxy
    Proxy --> API
    API --> Auth
    Auth --> Services
    Services -->|Connection Pool + Row Locks| DB
    Services -.->|Catalog & Q&A Queries| Gemini
```

## 2. Request Lifecycle & Business Safety

1. **Authentication Flow**:
   - Clients send credentials to `/api/v1/auth/login`.
   - The server verifies passwords using `bcrypt` and returns signed JWT access tokens containing user role, customer ID, and expiration claims.
   - For protected endpoints, the `authenticate` middleware decodes tokens and prevents unauthorized role elevation.

2. **Circulation Workflow (Issue / Return)**:
   - All critical circulation actions execute inside `withTransaction()` with row-level locks (`SELECT ... FOR UPDATE`).
   - Prevents race conditions such as duplicate issue attempts on the same physical copy.

```mermaid
sequenceDiagram
    actor Librarian
    participant API as Express API
    participant Tx as MySQL Transaction
    participant Copies as book_copies Table
    participant Loans as loans Table

    Librarian->>API: POST /api/v1/circulation/issue
    API->>Tx: BEGIN TRANSACTION
    Tx->>Copies: SELECT * FROM book_copies WHERE id=? FOR UPDATE
    Note over Tx: Lock acquired on copy
    Tx->>Loans: INSERT INTO loans (...)
    Tx->>Copies: UPDATE book_copies SET status='ISSUED'
    Tx->>API: COMMIT
    API-->>Librarian: 201 Created (Loan Code & Due Date)
```
