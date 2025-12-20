# Locked In

## Getting Started

### 1. Environment Setup
The application is configured to run on port **3004** to match the Stripe webhook configuration.

### 2. Run the Development Server
You must explicitly specify the port when starting the server:

```bash
npm run dev -- -p 3004
```

- App will be running at [http://localhost:3004](http://localhost:3004)

### 3. Stripe Webhook Setup (Required for Wallet)
To test wallet deposits locally, you need to forward Stripe events to your local server.

1.  **Install Stripe CLI** (if not already installed).
2.  **Start Listener**:
    Open a *separate* terminal window and run:
    ```bash
    stripe listen --forward-to localhost:3004/api/stripe/webhook
    ```
3.  **Update Secret**:
    The command above will output a secret starting with `whsec_`.
    - Copy this secret.
    - Paste it into your `.env.local` file as `STRIPE_WEBHOOK_SECRET`.
    - **Restart** your Next.js server if you changed the .env file.

### 4. Database Management
To view or manage the local database:

```bash
npx prisma studio
```

## Troubleshooting

- **Balance not updating?**
  - Ensure `npm run dev` is strictly using `-p 3004`.
  - Ensure `stripe listen` is running and pointing to `localhost:3004`.
  - Check that the `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the one shown in your `stripe listen` terminal.
