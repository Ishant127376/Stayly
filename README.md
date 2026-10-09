# Stayly

Stayly is a full-stack accommodation marketplace inspired by photo-led travel platforms. Guests can explore stays, filter listings, review availability, book a trip, and manage saved places. Hosts can create and manage listings and view bookings.

## Features

- Explore listings with category, location, date, guest, price, amenity, and rating filters
- Listing details with photos, reviews, and availability calendar
- Booking flow with server-side availability checks and a simulated checkout
- My Trips, booking cancellation, and booking confirmation emails
- User accounts with email/password signup and login, server-side sessions, and logout
- Wishlist and host dashboard with listing management and host booking views
- Host onboarding from a guest account

Payment is simulated. The application does not process or collect real payments.

## Tech stack and architecture

| Area | Technologies |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS, CSS |
| Backend | FastAPI, Python, Pydantic, SQLAlchemy |
| Database | SQLite |
| Authentication | Argon2 password hashes, opaque server-side sessions, HttpOnly cookies |
| Email | Python standard library SMTP with HTML and plain-text messages |

The frontend lives in `frontend/`. Its typed API client communicates with the FastAPI service under `/api`. The backend lives in `backend/`; routers define HTTP contracts and services implement search, booking, availability, and email behavior. The database is created additively at application startup. Booking availability, prices, ownership checks, and persistence are enforced by the backend.

## Local setup

Use Node.js 20.9 or newer and Python 3.11 or newer.

### 1. Configure the frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to the API base URL. For local development, the example value is `http://localhost:8000/api`.

Start the frontend:

```powershell
npm run dev
```

The frontend is available at <http://localhost:3000>.

### 2. Configure the backend

From the repository root:

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` for the local environment, then start the API:

```powershell
uvicorn app.main:app --reload
```

The API is available at <http://localhost:8000>; interactive API documentation is at <http://localhost:8000/docs>.

### Environment variables

Backend settings are read from `backend/.env` or the process environment. `backend/.env.example` contains safe local defaults and placeholders.

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL | `sqlite:///./airbnb.db` |
| `FRONTEND_ORIGIN` | Exact allowed browser origin for CORS and state-changing API requests | `http://localhost:3000` |
| `SESSION_TTL_DAYS` | Session lifetime | `7` |
| `SESSION_COOKIE_SECURE` | Mark the session cookie Secure; enable for HTTPS | `false` |
| `FRONTEND_BASE_URL` | Absolute frontend URL used in confirmation email links | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host; unset means email is skipped with a warning | unset |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Optional SMTP authentication credentials | unset |
| `SMTP_FROM_EMAIL` | Sender address | `bookings@example.com` placeholder |
| `SMTP_USE_TLS` | Use STARTTLS for SMTP | `true` |
| `SMTP_USE_SSL` | Use implicit TLS, commonly on port 465 | `false` |
| `SMTP_TIMEOUT_SECONDS` | SMTP connection timeout | `15` |

Configure both SMTP username and password, or leave both unset if the server does not require authentication. SMTP credentials belong only in the backend environment and must never be committed or exposed through frontend variables. If SMTP is not configured, bookings still succeed and no email is sent.

The frontend reads `NEXT_PUBLIC_API_URL` from `frontend/.env.local`. This value is public by design; do not put credentials or secrets in `NEXT_PUBLIC_*` variables.

## Authentication and host onboarding

Users can sign up with an email address and password. Passwords are stored as Argon2 hashes. The server issues a random opaque `stayly_session` cookie and stores only its hash. The cookie is HttpOnly and SameSite=Lax; enable `SESSION_COOKIE_SECURE` when serving over HTTPS. State-changing API requests are restricted to the configured `FRONTEND_ORIGIN`.

New accounts start as guests. A signed-in guest can open **Become a host** to enable host tools. Host listing and booking access is checked by the backend, including listing ownership. Existing seeded user records have no shared/default password. An operator who has verified an existing account can set its first password locally from `backend/`:

```powershell
python scripts/set_user_password.py --user-id <EXISTING_USER_ID>
```

The command prompts for the password without echoing it. Verify the account owner before assigning credentials. Email ownership verification and automated login throttling are not included.

## Booking flow and confirmation email

The backend validates availability and guest limits, calculates the fees, and stores a confirmed booking before returning success. The checkout page is a simulation: **no real payment is processed**. A confirmation email is attempted after the booking is committed. Email delivery failure does not cancel or duplicate the booking. The message contains the saved booking prices, dates, guest count, property information, confirmation reference, and a link to My Trips.

To enable email, configure the `SMTP_*` variables and `FRONTEND_BASE_URL` in `backend/.env`. For port 587, use STARTTLS (`SMTP_USE_TLS=true`, `SMTP_USE_SSL=false`). For implicit TLS (commonly port 465), use `SMTP_USE_SSL=true`. No external email API is required.

## Database initialization and seeding

On startup, SQLAlchemy creates missing tables in the configured database. This does not seed sample listings or reset existing records.

To create or reset the **development** database with sample data, run from `backend/`:

```powershell
python -m app.seed
```

**Warning:** this seed command drops and recreates the tables in the database selected by `DATABASE_URL` before inserting sample data. It is destructive and can permanently delete existing users, listings, bookings, and other records. Do not run it against a database containing data you need to keep. The backend test suite uses an isolated temporary SQLite database.

## Tests and checks

Backend tests, from `backend/`:

```powershell
python -m pytest
```

Frontend checks, from `frontend/`:

```powershell
npm run lint
npm run build
```

## Deployment considerations

- Serve the frontend and API over HTTPS and set `SESSION_COOKIE_SECURE=true`.
- Set `FRONTEND_ORIGIN` to the exact deployed frontend origin and `FRONTEND_BASE_URL` to its absolute URL. The backend allows credentials only from the configured origin.
- Keep SMTP credentials and other backend secrets in the deployment platform's secret manager, never in Git or frontend environment variables.
- The session cookie uses SameSite=Lax. Prefer deploying the frontend and API on the same site; a cross-site deployment may require a deliberate cookie policy change.
- SQLite is suitable for local development and this assignment. For deployment, use persistent storage, backups, and a managed database appropriate to the expected write concurrency.
- Configure SMTP with a verified sender and provider-specific TLS/authentication settings. Email delivery is best-effort and is not queued for automatic retry.
- The checkout does not integrate a payment provider. Do not present it as real payment processing.

## Repository documentation

See [`frontend/README.md`](frontend/README.md) for the short frontend-specific pointer. Backend setup and API code are under `backend/`.
