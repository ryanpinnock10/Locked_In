# Public Launch Guide: Locked In 🚀

Follow these steps to move your app from local development to a public production environment.

## 1. Hosting (Vercel)
- **Repo Connection**: Push your code to GitHub and connect the repository to a new project on [Vercel](https://vercel.com).
- **Environment Variables**: Add all variables from your `.env.local` to the Vercel Project Settings. 
    > [!IMPORTANT]
    > Change `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://locked-in.vercel.app`).

## 2. Authentication (Clerk)
- **Production Instance**: In Clerk, go to your project dashboard and switch to the **Production Instance**.
- **Keys**: Copy the production `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to Vercel.
- **Redirects**: Ensure your Clerk settings allow redirects to your `locked-in.vercel.app` domain.

## 3. Payments (Stripe)
- **Live Mode**: Toggle the "Live Mode" switch in your Stripe Dashboard.
- **REST Keys**: Get your Live `STRIPE_SECRET_KEY` and add it to Vercel.
- **Webhooks**: 
    1. Go to "Developers" -> "Webhooks" in Stripe.
    2. Add an endpoint: `https://your-domain.com/api/stripe/webhook`.
    3. Select event: `checkout.session.completed`.
    4. Copy the "Signing Secret" to `STRIPE_WEBHOOK_SECRET` in Vercel.

## 4. Database (Supabase)
- **Prisma Push**: Your Vercel build should automatically handle Prisma. If not, run `npx prisma db push` against your Supabase connection string to ensure tables are created.

## 5. AI Assistant
- **Credits**: Ensure your OpenAI account has a positive balance.
- **Pro Tier**: Since we labeled AI as "Standard" for now, once you have credits, the real GPT-4o-mini suggestions will start flowing automatically!

## 6. Admin Access
- **Production Admins**: Update the `ADMIN_EMAILS` environment variable in Vercel with the emails you want to allow in production.

---

### Pre-Launch Checklist
- [ ] Test the full deposit flow in Stripe Live (with a real $1 test).
- [ ] Confirm "Lock In" sessions are creating records in the database.
- [ ] Verify you can access `/admin` on the public domain.

> [!TIP]
> Use a custom domain (e.g., `lockedin.com`) for a more premium brand feel!
