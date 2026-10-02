# LibraFlow REST API Specification

LibraFlow provides a clean, versioned RESTful API under the `/api/v1` namespace.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/login`
Authenticates a user and issues JWT tokens.
- **Request Body**:
  ```json
  {
    "identifier": "admin",
    "password": "SecretPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@libraflow.org",
        "role": "ADMIN"
      }
    }
  }
  ```

### `POST /api/v1/auth/register`
Self-service customer registration. Strictly assigns `CUSTOMER` role.
- **Request Body**:
  ```json
  {
    "username": "rahul_k",
    "email": "rahul@example.edu",
    "password": "Password123!",
    "fullName": "Rahul Kumar",
    "phone": "+91 9876543210",
    "membershipTypeId": 1
  }
  ```

### `GET /api/v1/auth/me`
Retrieves authenticated user profile (Requires `Bearer` token).

---

## 2. Catalog & Inventory (`/api/v1/catalog`)

- `GET /api/v1/catalog`: Search catalog titles (supports `search`, `categoryId`, `limit`, `offset`).
- `GET /api/v1/catalog/categories`: List all categories.
- `GET /api/v1/catalog/:id`: Retrieve single book with copy inventory details.
- `POST /api/v1/catalog`: Add new book title with optional initial copies (`ADMIN`, `LIBRARIAN`).
- `POST /api/v1/catalog/:id/copies`: Add a physical book copy with barcode (`ADMIN`, `LIBRARIAN`).
- `PATCH /api/v1/catalog/copies/:copyId/status`: Update physical copy status or condition (`ADMIN`, `LIBRARIAN`).

---

## 3. Circulation Endpoints (`/api/v1/circulation`)

### `POST /api/v1/circulation/issue`
Issues an available physical book copy to an eligible customer (`ADMIN`, `LIBRARIAN`).
- **Request Body**:
  ```json
  {
    "customerId": 1,
    "copyId": 4,
    "customLoanDays": 14
  }
  ```

### `GET /api/v1/circulation/return-preview/:loanId`
Calculates automated overdue fine breakdown before finalizing return (`ADMIN`, `LIBRARIAN`).

### `POST /api/v1/circulation/return`
Completes return, assesses fine, generates invoice, and updates copy condition (`ADMIN`, `LIBRARIAN`).
- **Request Body**:
  ```json
  {
    "loanId": 12,
    "condition": "GOOD",
    "returnNotes": "Returned in clean condition"
  }
  ```

---

## 4. Billing & Payments (`/api/v1/billing`)

- `GET /api/v1/billing/invoices`: List invoices.
- `GET /api/v1/billing/invoices/:id`: Detailed invoice view with line items and payment receipts.
- `POST /api/v1/billing/payments`: Process payment towards an invoice (`ADMIN`, `LIBRARIAN`).
- `POST /api/v1/billing/fines/:fineId/waive`: Waive or adjust assessed late fees with audit trail (`ADMIN` only).

---

## 5. System & AI Endpoints (`/api/v1/system`)

- `GET /api/v1/system/metrics`: Live circulation metrics for admin dashboard.
- `GET /api/v1/system/settings`: Circulation policies and library configuration.
- `PUT /api/v1/system/settings`: Update circulation policies (`ADMIN`).
- `GET /api/v1/system/audit-logs`: System audit trail logs (`ADMIN`).
- `POST /api/v1/system/ai/ask`: AI assistant catalog discovery and policy Q&A.
