# Locked In 🔒

**Distract yourself, and it costs you real money.**

Locked In is an aggressive productivity tool that gamifies focus with financial stakes. Users pledge a monetary amount for a set duration. Complete the session and your stake is returned to your wallet; switch tabs, minimize the window, or quit early and you forfeit the wager.

---

## 🚀 Key Features

### 💎 Pay to Commit
- **Financial stakes:** Sessions are initiated by staking real money (Stripe).
- **Success:** Complete the timer → the stake is refunded to your wallet.
- **Failure:** Distraction detected → the stake is forfeited.
- **Server-authoritative timer:** Completion is verified server-side against the recorded start time (with a small clock-skew grace window). The client cannot fast-forward the timer or fake a completion to reclaim a stake.

### 🎛️ Lock Modes
- **Strict Mode ($0.10/min):** Fails immediately on tab switch or visibility loss.
- **Flexible Mode ($0.30/min):** Research-friendly — allows tab switching at 3× the cost.

### 👤 User Experience
- **Guest checkout:** Start a session instantly without an account (direct Stripe payment).
- **User accounts (Clerk):** Track history, maintain a wallet balance, and view analytics.
- **Deep Lock:** Fullscreen enforcement and keyboard locking (where supported) to prevent accidental exits.

### 🤖 AI & Growth
- **AI session suggestions:** Google Gemini / OpenAI–powered intent, approach, and blocked-app recommendations.
- **Admin analytics & reporting:** Revenue, threat, and usage reports behind an admin guard.
- **Social automation:** Queued social posts processed by a secured cron worker.

### 📱 Cross-Platform
- Web (PWA) plus native **iOS and Android** builds via Capacitor.

---

## 🛠️ Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Framework    | [Next.js 15](https://nextjs.org/) (App Router) + React 19     |
| Language     | TypeScript                                                    |
| Styling      | Tailwind CSS + Framer Motion                                  |
| Database     | PostgreSQL via [Prisma 7](https://www.prisma.io/) (pg adapter)|
| Auth         | [Clerk 7](https://clerk.com/)                                 |
| Payments     | [Stripe](https://stripe.com/)                                 |
| AI           | Google Gemini, OpenAI (Vercel AI SDK)                         |
| Email        | [Resend](https://resend.com/)                                 |
| Mobile       | [Capacitor](https://capacitorjs.com/) (iOS / Android)         |
| Deploy       | Vercel                                                        |

---

## 🔐 Security & Reliability

This codebase has been through a security audit and money-path hardening pass. Highlights:

- **Atomic money-path:** Session start (charge) and finalize (refund) use single atomic conditional `UPDATE`s, eliminating TOCTOU races. Concurrent requests can no longer overspend a balance into the negative or refund a stake more than once. Verified by a concurrency/ledger stress test (see [`tests/stress.test.ts`](tests/stress.test.ts)).
- **Idempotent finalization:** A session can only be finalized once; concurrent finalizes refund exactly once.
- **Route-level authZ:** All `/api/admin/*` routes share a single `checkAdmin()` guard (DB role **or** `ADMIN_EMAILS` allowlist).
- **Protected cron:** `/api/cron/process-queue` requires a `CRON_SECRET` bearer token.
- **Patched CVEs:** Clerk and Next.js pinned to versions that resolve known critical advisories.
- **Webhook verification:** Stripe webhooks are signature-verified; guest payments are recorded against a reserved ledger user so revenue is never dropped.

See [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) for the full report and SOC 2 readiness notes.

---

## ⚡ Getting Started

### 1. Environment Setup

Create a `.env.local` file with the following keys:

```env
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3004
DATABASE_URL="postgresql://..."

# Admin & automation
ADMIN_EMAILS=you@example.com          # comma-separated admin allowlist
CRON_SECRET=your-long-random-secret   # bearer token for the queue worker

# AI (optional)
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENAI_API_KEY=...

# Email (optional)
RESEND_API_KEY=...
```

### 2. Install & Prepare the Database

```bash
npm install              # runs `prisma generate` via postinstall
npx prisma db push       # sync schema to your Postgres
```

### 3. Run the Development Server

> **Note:** Run on port **3004** to match the Stripe webhook configuration.

```bash
npm run dev -- -p 3004
```

App runs at [http://localhost:3004](http://localhost:3004).

### 4. Stripe Webhooks (required for wallet/session logic)

```bash
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

Copy the printed `whsec_...` secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 5. Database Tools

```bash
npx prisma studio        # browse / edit the local database
```

---

## 🧪 Testing

```bash
# Functional + security assertions (money-path correctness, IDOR, anti-cheat, guest revenue)
npx tsx tests/audit.test.ts

# Concurrency / ledger stress test (overspend race, double-refund race, mixed chaos)
npx tsx tests/stress.test.ts
```

Both suites run against a real Postgres — set `DATABASE_URL` first. The stress test fires hundreds of concurrent start/finalize operations and asserts the ledger stays consistent (`balance == initial + Σ transactions`) and business rules hold under races.

---

## 📂 API Routes

| Route                          | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `POST/PATCH /api/sessions`     | Start (charge) / finalize (refund) a focus session  |
| `GET /api/sessions/history`    | Session history for the authed user                 |
| `POST /api/stripe/checkout`    | Create a Stripe checkout session                     |
| `POST /api/stripe/webhook`     | Stripe event handler (signature-verified)            |
| `GET /api/user/balance`        | Current wallet balance                               |
| `*/api/user/transaction(s)`    | Transaction records                                  |
| `POST /api/ai/suggest`         | AI session suggestions                               |
| `POST /api/cron/process-queue` | Social queue worker (requires `CRON_SECRET`)         |
| `/api/admin/*`                 | Admin analytics, reports, social (requires admin)    |

---

## 📱 Mobile (Capacitor)

```bash
npm run build
npx cap sync
npx cap open ios       # or: npx cap open android
```

---

## 🚢 Deployment (Vercel)

1. Push to GitHub.
2. Import the project in Vercel.
3. Add **all** environment variables above — including `ADMIN_EMAILS` and `CRON_SECRET`.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain.
5. Configure the Stripe webhook endpoint to point at `https://your-domain/api/stripe/webhook`.

---

## 📜 License

All rights reserved. Locked In © 2026.
