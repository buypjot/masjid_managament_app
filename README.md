# 🕌 Masjid Income, Expense & Collection Management System (Phase 1)

A full-stack, enterprise-grade web application for managing Masjid finances, starting with Phase 1: **Public Registration, Webhook Notifications, Admin Verification Workflow, WhatsApp OTP Authentication, and User Dashboard**.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite, Tailwind CSS, Lucide Icons, Axios, React Router v6)
- **Backend**: FastAPI (Python 3.11, SQLAlchemy 2.0, Pydantic v2, PyJWT, Passlib/Bcrypt)
- **Database**: PostgreSQL (Connects to existing PostgreSQL server)
- **Ports**: 
  - FastAPI API: `8011`
  - React Frontend: `9017`
- **Deployment**: Docker & Docker Compose

---

## 🔑 Initial Admin Credentials

```text
Username: Admin
Password: Sr@983683
```

> Admin credentials are required to authenticate into `/admin/login` and review/approve Masjid registration requests. Credentials can be configured in `.env`.

---

## 🚀 Setup & Execution Guide

### 1. Database Configuration (Existing PostgreSQL Server)

The application connects to your existing PostgreSQL server running on `localhost:5432` (or container `postgres15-db` / `host.docker.internal:5432`).

- **PostgreSQL User**: `postgres`
- **PostgreSQL Password**: `Sr@983683`
- **Database Name**: `Masjiddesk`

The backend automatically checks and creates the `Masjiddesk` database upon startup if it does not exist, and initializes all required tables (`admins`, `signup_requests`, `masjids`, `otps`).

### 2. Environment Variables Configuration

Copy `.env.example` to `.env` in the root folder:

```bash
cp .env.example .env
```

Ensure the following variables are configured in `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:Sr%40983683@localhost:5432/Masjiddesk

# Admin Credentials
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=Sr@983683

# Webhook URL (Zoho Cliq / Slack / Custom Webhook)
SIGNUP_WEBHOOK_URL=https://cliq.zoho.com/api/v2/channelsbyname/webhookmessage/message?zapikey=1001.1082b3c2c08375718988a789389d3023.f0cb869525a1dc04ecab779149be5af4
WEBHOOK_BOT_NAME=Majid_New_Member

# WhatsApp OTP Provider
OTP_PROVIDER=whatsapp
OTP_API_URL=https://waapi.buypapps.com/v1/message/send-message
OTP_API_KEY=6a936b34e8c1946bdb327d93a61dcfb5a8e18ad0d24a9c2ffc7668f129ed557d8eaac8b77b7e8d62b6ac1a15415a36a31a0ea4626e67e7d2748909b4eb5e0f94
OTP_TEMPLATE_NAME=buyp_play_zone

# JWT Authentication
JWT_SECRET=masjid_management_system_super_secret_jwt_key_2026_buyp
JWT_EXPIRATION_MINUTES=1440

# Frontend Base URL
VITE_API_BASE_URL=http://localhost:8011
```

---

### 3. Running Backend Locally

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server on port `8011`:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
   ```
5. Interactive API docs will be available at: [http://localhost:8011/docs](http://localhost:8011/docs)

---

### 4. Running Frontend Locally

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server on port `9017`:
   ```bash
   npm run dev
   ```
4. Open your browser at: [http://localhost:9017](http://localhost:9017)

---

### 5. Running with Docker Compose

To build and run both the Frontend (port 9017) and Backend (port 8011) using Docker:

```bash
docker-compose up --build
```

*(Note: Docker Compose is configured to connect to your host machine's existing PostgreSQL instance via `host.docker.internal:5432` without creating a duplicate PostgreSQL container).*

---

## 📡 API Endpoints Reference

### Public Authentication & Registration
- `POST /api/auth/signup` - Submit public Masjid registration request & trigger webhook
- `POST /api/auth/send-otp` - Send WhatsApp OTP to registered/approved mobile number
- `POST /api/auth/verify-otp` - Verify OTP code and issue User JWT token
- `POST /api/auth/logout` - Logout session
- `GET /api/auth/me` - Get current authenticated user profile

### Admin Management (Protected)
- `POST /api/admin/login` - Authenticate admin (`Admin` / `Sr@983683`)
- `GET /api/admin/signup-requests` - List all submitted signup requests (with status/search filters)
- `GET /api/admin/signup-requests/{id}` - Fetch single signup request details
- `POST /api/admin/signup-requests/{id}/approve` - Approve request & activate Masjid account
- `POST /api/admin/signup-requests/{id}/reject` - Reject registration request
- `GET /api/admin/me` - Get current admin session info

### Masjid Directory (Protected)
- `GET /api/masjids` - List active/approved Masjids

---

## 🔔 Webhook Integration Details

After a user submits the public signup form, the backend triggers an asynchronous webhook to the configured `SIGNUP_WEBHOOK_URL`.

- Default target: Zoho Cliq Channel Webhook
- Bot name: `Majid_New_Member`
- Payload structure includes:
  ```json
  {
    "text": "🕌 New Masjid Registration Request...",
    "bot_name": "Majid_New_Member",
    "signup_request_id": "1",
    "masjid_name": "Jamia Masjid An-Noor",
    "mobile_number": "919600698893",
    "street": "123 Main St",
    "city": "Chennai",
    "email": "info@masjid.org"
  }
  ```
- Webhook execution is non-blocking and failure-resilient, preventing registration failure if the webhook service is temporarily unreachable.

---

## 📲 WhatsApp OTP Integration Details

When an approved user requests OTP login:

1. System verifies mobile number is in `masjids` table with `active` status.
2. A random 6-digit OTP code is generated and hashed into `otps` table with 10-minute expiry.
3. The backend calls the WhatsApp API (`https://waapi.buypapps.com/v1/message/send-message`):
   - Token: Configured in `OTP_API_KEY`
   - Template: `buyp_play_zone`
   - Components: Formatted with OTP parameter for body and URL button.
4. User enters OTP on `/verify-otp` screen, and upon validation, gets redirected to `/dashboard`.
