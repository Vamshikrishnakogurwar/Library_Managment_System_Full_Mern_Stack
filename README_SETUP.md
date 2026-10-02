# LibraFlow Setup Guide for Students

This step-by-step tutorial guides 3rd-year B.Tech students through setting up LibraFlow on Windows, Linux, or macOS.

---

## ⚡ Fastest Method: One-Click Runner (Windows)

If you are on Windows, simply double-click **`run.bat`** in the repository root folder.

It will automatically:
1. Verify Node.js.
2. Initialize `.env` from template if not present.
3. Install dependencies across root, frontend, and backend.
4. Build frontend distribution bundles.
5. Check and run database migrations.
6. Launch both frontend and backend concurrently in one terminal.

---

## 1. System Prerequisites

Verify your installed development tools in terminal:
```bash
node -v    # Must be Node.js v18, v20, or v22
npm -v     # npm 9 or 10
mysql -V   # Local MySQL 8.0 client or active Aiven Cloud account
```

---

## 2. Aiven Cloud MySQL Setup (Recommended)

1. Sign in to your [Aiven Console](https://console.aiven.io/).
2. Create a new **MySQL** service on the free tier or student cloud credit plan.
3. In service settings, note your:
   - **Host** (e.g., `mysql-3a1b...aivencloud.com`)
   - **Port** (e.g., `12345`)
   - **User** (typically `avnadmin`)
   - **Password**
4. Download the `ca.pem` certificate from Aiven console and save it in your project's `certs/` folder.
5. In `.env`, set:
   ```env
   DB_HOST=mysql-3a1b...aivencloud.com
   DB_PORT=12345
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=your_aiven_password
   DB_SSL=true
   DB_SSL_CA_PATH=certs/ca.pem
   ```

---

## 3. Alternative: Local MySQL Setup

If using local MySQL:
```sql
CREATE DATABASE IF NOT EXISTS libraflow_db;
```
Configure `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=libraflow_db
DB_USER=root
DB_PASSWORD=your_root_password
DB_SSL=false
```

---

## 4. Install Dependencies

In the repository root:
```bash
npm run install:all
```

---

## 5. Apply Migrations & Bootstrap Administrator

Apply schema migrations:
```bash
npm run db:migrate
```

Create your first administrative account:
```bash
npm run admin:bootstrap --prefix backend
```
*You will be prompted to enter an Administrator Username, Email, and Password.*

---

## 6. (Optional) Development Seed Data

For initial local exploration and viva demonstrations, run:
```bash
npm run seed --prefix backend
```
*Note: This creates sample categories, demo books with copies, and sample customer accounts.*

---

## 7. Run Applications Concurrently

Start the backend and frontend together:
```bash
npm run dev
```

Open your browser to:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
