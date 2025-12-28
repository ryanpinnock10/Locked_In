# Locked In 🔒

**Distract yourself, and it costs you real money.**

Locked In is an aggressive productivity tool that gamifies focus with financial stakes. Users pledge a monetary amount for a set duration. If they switch tabs, minimize the window, or quit early, they fail the session and forfeit their wager.

## 🚀 Key Features

### 💎 Pay to Commit
-   **Financial Stakes:** Users initiate sessions by paying upfront (Stripe).
-   **Success:** Complete the timer -> Credits are refunded/kept in wallet.
-   **Failure:** Distraction detected -> Credits are lost forever.

### 🎛️ Lock Modes
-   **Strict Mode ($0.10/min)**: The hardcore experience. Fails immediately on tab switch or visibility loss.
-   **Flexible Mode ($0.30/min)**: Research-friendly. Allows tab switching but costs 3x more to maintain the stakes.

### 👤 User Experience
-   **Guest Checkout:** Start a session instantly without an account (direct Stripe payment).
-   **User Accounts:** Sign up (Clerk) to track history, maintain a wallet balance, and see analytics.
-   **Deep Lock:** Fullscreen enforcement and keyboard locking (where supported) to prevent accidental exits.

---

## 🛠️ Tech Stack

-   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS + Framer Motion
-   **Database:** PostgreSQL (via [Prisma](https://www.prisma.io/))
-   **Auth:** [Clerk](https://clerk.com/)
-   **Payments:** [Stripe](https://stripe.com/)
-   **Deploy:** Vercel

---

## ⚡ Getting Started

### 1. Environment Setup
The application relies on specific ports for Webhook handling.

Create a `.env.local` file with the following keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3004
DATABASE_URL="postgresql://..."
```

### 2. Run the Development Server
**IMPORTANT:** You must run on port **3004** to match the Stripe webhook configuration.

```bash
npm run dev -- -p 3004
```

-   App will be running at [http://localhost:3004](http://localhost:3004)

### 3. Stripe Webhook Setup (Required for Wallet/Session Logic)
To test payments locally, you must forward Stripe events to your local server.

1.  **Install Stripe CLI**.
2.  **Start Listener**:
    ```bash
    stripe listen --forward-to localhost:3004/api/stripe/webhook
    ```
3.  **Update Secret**:
    Copy the `whsec_...` secret from the terminal output and paste it into your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 4. Database Management
To view or manage the local database:

```bash
npx prisma studio
```

---

## 🚢 Deployment

### Vercel
1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add all Environment Variables.
4.  **CRITICAL:** Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://lockedtin.com`).

---

## 📜 License
All rights reserved. Locked In © 2025.
