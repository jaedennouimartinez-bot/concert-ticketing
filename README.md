# Concert Ticketing System • LivePass

A secure, high-integrity concert ticketing web application built according to finalized SRS specifications and approved Google Stitch designs ("Direct Stage" design system).

---

## 📌 Project Overview & Architecture

The application provides an end-to-end event admissions and ticketing management platform featuring:
- **Mobile-First Attendee Experience:** Multi-screen responsive single-page application covering registration, event selection, order review, and dynamic scannable digital passes.
- **Organizer Box Office Portal:** Real-time KPI dashboard, attendee ticket roster, live capacity metrics, debounced search, filtering, CSV/JSON gate manifest generation, and ticket revocation.
- **MySQL / MariaDB Relational Database:** ACID-compliant transactions with foreign-key constraints, duplicate purchase prevention, and security audit logs.
- **Bot Detection & Abuse Protection:** Burst rate-limiting middleware blocking automated scalpers and bot activity.

---

## 🎯 Functional Requirements Compliance

| SRS Requirement | Description | Implementation Details |
|---|---|---|
| **FR-001** | Attendee Identity Binding & Validation | Validates full name, email, government ID upload (`multer`), and account number binding. Triggers *Missing Information Modal* if fields are incomplete. |
| **FR-002** | One Ticket Per Account Per Event | Enforces strict uniqueness constraint (`account_number` + `event_id`). Rejects duplicate attempts with HTTP 409 and triggers the *Duplicate Ticket Modal* with a one-click shortcut to view the existing pass. |
| **FR-003** | Real-Time Capacity & Sold-Out Handling | Live tracking of event capacity. Prevents overselling; selecting sold-out events (e.g. *Neon Dreams*) triggers the *Sold Out Modal*. |
| **FR-004** | Rapid Bot Purchase Pattern Detection | Sliding window rate limiting detects automated burst traffic (>5 requests per 10s per IP/account), logs incidents to `security_logs`, and renders the *Purchase Blocked Modal* with an audit reference ID (`Ref ID: SEC-XXXXXX`). |
| **FR-005** | Dynamic QR & Scannable Digital Passes | High-contrast SVG QR barcode with laser scan animation and a 15:00 countdown timer. Supports real-time status tracking (`Valid` vs `Revoked`) and box-office organizer revocation. |
| **FR-006 & FR-007** | Turnstile Sync & Gate Manifest | Exports offline-ready JSON gate manifests and CSV attendee rosters for field turnstiles. |

---

## 🎨 UI & Google Stitch Parity

All 11 views and modals from the approved Google Stitch exports (`stitch_export`) are implemented with pixel-level fidelity using Tailwind CSS and Inter typography:
1. **Welcome Screen** (`view-welcome`) — Brand hero, gate access indicator, trust highlights, CTA, and quick ticket lookup.
2. **Attendee Registration** (`view-step1`) — Legal name, email, account number, and government ID document dropzone.
3. **Event & Ticket Selection** (`view-step2`) — Event details banner, tier cards (GA $85, Floor $150, VIP $250) with dynamic inclusion chips, and total price calculator.
4. **Review Details** (`view-step3`) — Order summary card, attendee details, ticket breakdown, security assurances, and inline edit shortcuts.
5. **Digital Ticket Pass** (`view-step4` & `/ticket/:ticketCode`) — High-contrast QR barcode, laser sweep line, 15:00 dynamic refresh timer, venue info, and gate assignment.
6. **Missing Information Modal** (`modal-missing-info`) — Warning dialog for incomplete form fields.
7. **Duplicate Ticket Modal** (`modal-duplicate-ticket`) — Notice for existing ticket with "View My Ticket" action.
8. **Purchase Blocked Modal** (`modal-purchase-blocked`) — Security shield alert with unique incident reference code.
9. **Sold Out Modal** (`modal-sold-out`) — Notification when tier or event is at full capacity.
10. **Organizer Login** (`/organizer/login`) — Secure authentication portal for event staff.
11. **Organizer Dashboard** (`/organizer/dashboard`) — Full desktop dashboard with live metrics, roster table, search, filters, pagination, CSV export, and gate manifest download.

---

## 💻 Tech Stack & Environment

- **Frontend:** HTML5, Modern Vanilla JavaScript (ES6+), Tailwind CSS (JIT CDN), Google Fonts (Inter & Material Symbols Outlined).
- **Backend:** Node.js (v20+ or v26+), Express.js.
- **Database:** MariaDB / MySQL with `mysql2/promise` connection pooling.
- **File Uploads:** Multer with storage in `server/uploads`.
- **Security:** `bcryptjs` password hashing, bot-detection rate limiting.

---

## ⚙️ Configuration (`.env`)

The application reads configuration from `.env`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=concert_ticketing
NODE_ENV=development
SESSION_SECRET=concert_livepass_stage_secret_2025
```

---

## 🚀 Running the Application

### 1. Start MariaDB / MySQL Server
Ensure MariaDB is running on `127.0.0.1:3306`. If using the standalone directory:
```powershell
& "C:\Program Files\MariaDB 13.0\bin\mysqld.exe" --defaults-file="D:\wearetheworldwearetheniggas\ConcertTicketing\mysql_data\my.ini" --console
```

### 2. Seed Database (Initial Setup)
Populate initial events, tiers, organizers, and sample attendees:
```powershell
node server/models/seed.js
```

### 3. Start Express Web Server
```powershell
node server.js
```

The application will be accessible at:
- **Attendee Flow:** [http://localhost:3000](http://localhost:3000)
- **Organizer Login:** [http://localhost:3000/organizer/login](http://localhost:3000/organizer/login)
- **Organizer Dashboard:** [http://localhost:3000/organizer/dashboard](http://localhost:3000/organizer/dashboard)

---

## 🧪 Running Automated Tests

A 15-test automated test suite verifies all APIs, validation constraints, and database transactions:
```powershell
node server/tests/test_flow.js
```

**Test Coverage Summary:**
- Frontend Static & View Routes (`/`, `/organizer/login`, `/organizer/dashboard`)
- Events and Ticket Tier REST endpoints
- Quick Account Lookup
- FR-001 Missing Information Validation
- Attendee Registration & Ticket Issuance
- FR-002 Duplicate Ticket Claim Rejection
- FR-003 Sold-Out Capacity Rejection
- FR-004 Rapid Bot Burst Detection & Blocking
- FR-005 Digital Ticket Code Retrieval & Verification
- Organizer Authentication & Password Verification
- Organizer Metrics & Live Roster Querying
- FR-005 Organizer Ticket Revocation & Status Propagation

---

## 🔑 Default Credentials & Test Data

- **Organizer Login:**
  - Email: `organizer@venue.com`
  - Password: `password123`
- **Existing Test Attendees:**
  - `ACCT-892410` — Alex Morgan (Midnight Echoes, GA)
  - `ACCT-104921` — Marcus Vance (Midnight Echoes, VIP)
  - `ACCT-553109` — Sophia Chen (Midnight Echoes, Floor)
