# Locked In 🔒

**"Pay to Focus"** - A high-stakes productivity app that forces you to lock in on your goals.

## 🚀 The Concept
Locked In is a productivity tool with a twist: **It costs money to focus.**
- **Lock In**: Commit to a session (e.g., 30 mins).
- **Pay Up**: Each session costs real money (e.g., $0.50).
- **Stay Focused**: If you leave the tab, an alarm sounds and you are shamed.
- **No Refunds**: Once you lock in, the money is committed.

## ✨ Features
- **High-Stakes Timer**: A visual countdown that represents your financial commitment.
- **Focus Guard**: Detects tab switching and plays an annoying alarm to force you back.
- **Session Intent**: Declare your goal before every session.
- **Wallet System**: Top up your balance and spend credits on focus sessions.
- **PWA Support**: Installable on mobile and desktop for an app-like experience.
- **Dark Mode**: Premium, distraction-free UI.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Payments**: Stripe (In Progress)

## 📦 Getting Started

1.  **Clone the repo**
    ```bash
    git clone https://github.com/your-username/locked-in.git
    cd locked-in
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with:
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
    CLERK_SECRET_KEY=...
    DATABASE_URL=...
    ```

4.  **Run the app**
    ```bash
    npm run dev
    ```

## 📱 Mobile
This app is optimized as a PWA. Open it in Safari (iOS) or Chrome (Android) and "Add to Home Screen" for the best experience.
