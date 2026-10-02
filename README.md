# LibraFlow — Smart Library Management and Circulation System

LibraFlow is a full-stack, enterprise-grade Library Management and Circulation System tailored for academic institutions, engineering colleges, and public libraries. Built with React (Vite & Tailwind CSS), Node.js (Express), and persistent Aiven Cloud MySQL with InnoDB ACID transactions.

---

## 🌟 Key Features

- **Robust Multi-Role Authorization**: Role-based access control for `ADMIN`, `LIBRARIAN`, and `CUSTOMER`.
- **Physical Copy Inventory**: Track unique barcodes, shelf/rack locations, acquisition costs, and physical condition (`NEW`, `GOOD`, `FAIR`, `DAMAGED`, `LOST`).
- **Atomic Circulation (Issue & Return)**: Row-level database locks (`SELECT ... FOR UPDATE`) prevent race conditions and concurrent double-issuance of physical copies.
- **Automated Fine & Billing Engine**: Exact decimal late fee calculation using policy snapshots (due date, grace period, daily rate, max cap).
- **Official Invoicing & Payment Processing**: Print-friendly invoices, partial payment support, multi-method payments (Cash, UPI, Card, Bank Transfer).
- **Interactive Live Dashboard**: Live metrics computed directly from database queries (no hardcoded statistics).
- **Optional AI Library Assistant**: Integrated Gemini AI assistant to explain circulation policies and recommend catalog titles based on database context.
- **Audit Trails**: Non-repudiable audit logging for authentication events, circulation actions, fine assessments, waivers, and system policy changes.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v7, TanStack Query, Lucide Icons, Recharts |
| **Backend** | Node.js (Active LTS), Express.js (REST API /api/v1), Helmet, CORS, Morgan, Express Rate Limit |
| **Database** | Aiven Cloud MySQL 8.0+ / InnoDB (with SSL/TLS and connection pooling) |
| **Authentication** | JWT Access & Refresh Tokens, bcrypt password hashing |
| **DevOps & CI/CD** | Docker multi-stage builds, Docker Compose, GitHub Actions CI workflow |

> **Note on Architecture**: LibraFlow utilizes React, Express, and Node.js with relational **Aiven Cloud MySQL** rather than MongoDB. Relational integrity, foreign key constraints, and transactional row locking are essential for financial ledgers, circulation tracking, and overdue fine assessments.

---

## 🚀 Quick Start & Development Setup

### 1. Prerequisites
- **Node.js**: v20 or v22 LTS (`node -v`)
- **MySQL**: Aiven Cloud MySQL or local MySQL 8.0+

### 2. Clone and Configure Environment
```bash
git clone https://github.com/Vamshikrishnakogurwar/Library_Managment_System_Full_Mern_Stack.git
cd Library_Managment_System_Full_Mern_Stack

# Copy environment variables template
cp .env.example .env
```
Edit `.env` to configure your Aiven MySQL or local database connection:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=libraflow_db
DB_USER=root
DB_PASSWORD=your_password
DB_SSL=false
```

### 3. Install Dependencies
```bash
# Installs root, backend, and frontend dependencies in one command
npm run install:all
```

### 4. Run Migrations & Bootstrap Admin
```bash
# Apply versioned database migrations
npm run db:migrate

# Bootstrap the initial secure Administrator account
npm run admin:bootstrap --prefix backend
```

### 5. Launch Full Application
```bash
# Starts both Express backend and Vite frontend concurrently in one terminal
npm run dev
```
- **Frontend Web UI**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🧪 Testing and Verification

Run backend unit and formula calculation tests:
```bash
npm run test
```

Build production bundles:
```bash
npm run build
```

---

## 🐳 Docker Deployment

To launch the full stack with an optional isolated MySQL container:
```bash
npm run docker:up
```
To stop the containers:
```bash
npm run docker:down
```

---

## 📚 Comprehensive Documentation Links
- [Setup Guide (Step-by-Step for Students)](README_SETUP.md)
- [REST API Reference & Endpoints](README_API.md)
- [Production Deployment & Docker Guide](README_DEPLOYMENT.md)
- [Viva Voce Preparation & 25+ Q&A](README_VIVA.md)
- [Application Architecture](docs/architecture.md)
- [Database Schema & ER Diagrams](docs/database-schema.md)
- [Business Rules & Fine Formulas](docs/business-rules.md)
