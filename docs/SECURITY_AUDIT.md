# Locked In — Security Audit, Functional Test Report & SOC 2 Readiness

Date: 2026-06-09
Scope: `ryanpinnock10/Locked_In`, branch `fix/money-path-bugs` (PR #32)
Method: Live functional tests against a real PostgreSQL 17 instance using the actual Prisma schema, static review of every API route / middleware / auth boundary, and `npm audit` dependency scan.

---

## 1. Executive summary

The four money-path fixes in PR #32 **work correctly** — all 30 functional and behavioral-security assertions pass, including the hard cases (refund idempotency, anti-cheat timer authority, IDOR rejection, guest revenue path).

However, the **broader application is not production-secure and is not SOC 2 ready**. The most urgent issue is a **critical dependency vulnerability in Clerk (CVSS 9.1, middleware-based route-protection bypass)** that directly undermines this app's entire auth model, plus **multiple admin API endpoints that are protected by login only — not by an admin-role check** (privilege escalation: any signed-in user can post tweets, queue social content, and read the social queue). There is also a **publicly triggerable cron endpoint**, a **client-trusted guest-history import** that lets users fabricate session records, and a **swap file committed to the repo**.

| Severity | Count | Examples |
|---|---|---|
| Critical | 3 | Clerk middleware bypass, Clerk authz bypass, Next.js dev-server info exposure (all dependency CVEs) |
| High | 5 | Admin routes missing role check; public cron endpoint; 26 high dep CVEs |
| Medium | 6 | Client-trusted guest sync; no rate limiting; verbose error leakage; inconsistent admin auth patterns |
| Low | 4 | Committed `.swp` file; `console.log` of balances/user IDs; no security headers; weak amount validation |

Verdict: **Fixes are mergeable. The app is NOT ready for a real-money public launch or a SOC 2 audit until the items in §3 and §5 are addressed.**

---

## 2. Functional test results (PR #32 fixes)

Run against PostgreSQL 17 with the real Prisma schema. Route business logic was replicated exactly; only Clerk `auth()` and Stripe signature verification were stubbed (they are not part of the money math). Test file: `tests/audit.test.ts`.

**30 passed, 0 failed.**

| Fix | What was verified | Result |
|---|---|---|
| #3 Real cost on session | `FocusSession.cost` equals the charged stake; balance decremented; negative USAGE tx recorded | PASS |
| #1 Refund on success | Verified completion refunds the stake; wallet restored; positive BONUS tx created | PASS |
| #1b Failure forfeits | Failed session keeps the stake; no refund | PASS |
| #1c Idempotency | Re-finalizing a completed session yields **no second refund**; exactly one BONUS tx | PASS |
| #4 Timer authority | Claiming success after ~0s on a 30-min session is **forced to FAILED**; no refund | PASS |
| #4b Grace window | Finishing 57s into a 60s session (within 5s grace) is honored | PASS |
| Sec IDOR | User A cannot finalize User B's session (404); victim session stays active; no credits gained | PASS |
| Sec funds | Session start rejected (402) when balance < cost; no session row created | PASS |
| #2 Guest payment | Guest payment recorded to guest ledger; PURCHASE appears in revenue; net-zero ledger | PASS |
| #2b Authed top-up | Real user top-up still credits the wallet and is labeled correctly (not guest) | PASS |

The fixes do what they claim and resist the obvious abuse cases. No changes to PR #32 are required for correctness.

---

## 3. Security vulnerabilities (application code)

### CRITICAL / HIGH

**H-1 — Admin API endpoints lack a role check (privilege escalation).**
`src/app/api/admin/social/post/route.ts`, `.../social/queue/route.ts` only check `if (!userId)` — i.e. *any authenticated user*, not an admin. A comment even admits it: "Ideally check if userId is admin, but for now assuming authenticated user… is sufficient." The `/admin` *page* layout enforces `ADMIN_EMAILS`, but the **API routes are reachable directly** regardless of the UI. Impact: any signed-up user can post tweets to your brand account, enqueue/flush social content, and read the queue.
Fix: add a shared `requireAdmin()` guard (DB `role === "ADMIN"` or `ADMIN_EMAILS`) to **every** `/api/admin/*` route. The codebase already has 3 different admin-check styles (`generate-report` checks `publicMetadata.role`, `threat-report` checks DB `role`, the social routes check nothing) — consolidate into one.

**H-2 — Public, unauthenticated cron endpoint.**
`src/app/api/cron/process-queue/route.ts` has no auth at all and self-documents: "we'll allow it to be triggered publicly." Anyone can `POST` it to drain and post your tweet queue on demand.
Fix: require a `CRON_SECRET` header (`Authorization: Bearer ${process.env.CRON_SECRET}`) and configure it in Vercel Cron.

**C-1 — Clerk middleware route-protection bypass (dependency CVE, CVSS 9.1).**
`@clerk/nextjs` `<6.39.2` / `@clerk/shared` are flagged in advisory GHSA-vqx2-fgx2-5wq9: middleware-based route protection can be bypassed. This app's **entire** non-public-route protection depends on `clerkMiddleware` + `auth.protect()` in `src/middleware.ts`, so this is directly exploitable here.
Fix: `npm i @clerk/nextjs@latest` (≥ 6.39.2) and re-test. Also note GHSA-w24r-5266-9c3c (authz bypass in org/billing/reverification checks).

**C-2 — Next.js dev-server information exposure (dependency CVE).**
`next` at the pinned version is flagged for dev-server origin-verification issues. Low impact in prod but should be patched.
Fix: bump `next` to the latest 15.x patch.

### MEDIUM

**M-1 — Client-trusted guest-history import.**
`src/app/api/user/sync-history/route.ts` accepts an arbitrary array of sessions (intent, duration, cost, status) from the client and writes them as the user's records with no verification that any payment ever occurred. A user can POST fabricated "completed" sessions and inflated history. It currently writes negative USAGE transactions, so it doesn't grant balance — but it does pollute analytics/history and is a trust boundary violation. (Note: status is mapped to `'active'` for completed imports, which is also a latent bug.)
Fix: only import non-financial display metadata, or verify each against a Stripe payment intent; never trust client-supplied `cost`/`status` for anything ledger-affecting.

**M-2 — No rate limiting anywhere.**
None of the routes (checkout, transaction, AI suggest, analytics, feedback) are rate-limited. The AI suggest route calls a paid LLM and the checkout route creates Stripe sessions — both are abusable for cost-inflation / DoS.
Fix: add per-user/IP rate limiting (e.g. Upstash Ratelimit) on auth'd money/LLM routes and on the public analytics/checkout routes.

**M-3 — Verbose error leakage.**
`stripe/checkout` returns `error.message` directly to the client; several routes log user IDs and balances. Internal messages should not be returned to clients.
Fix: return generic errors to clients; log details server-side only.

**M-4 — Inconsistent / fragile admin auth.**
`generate-report` compares a single email to `process.env.ADMIN_EMAILS` with `===` (breaks the moment you have >1 admin, since the env var is comma-separated and parsed as a list elsewhere). This is a correctness + security smell.

**M-5 — Weak amount validation on checkout.**
`stripe/checkout` floors a client-supplied `amount` with only a `>= 50` cents check and no upper bound or type hardening beyond `Number()`. Combined with no rate limit, this is abusable.

**M-6 — No security headers / CSP.**
No `next.config` security headers (CSP, HSTS, X-Frame-Options, etc.).

### LOW

- **L-1 — Editor swap file committed to git:** `src/app/admin/.page.tsx.swp` is tracked. Remove it and add `*.swp`/`*.swo` to `.gitignore`. (Swap files can leak in-progress source.)
- **L-2 — PII/financial data in logs:** balances, user IDs, and emails are `console.log`'d throughout. Scrub for production.
- **L-3 — `console.log` debug noise in `LockScreen` / page.tsx** ("Lock clicked", "Security Check") ships to prod.
- **L-4 — `.env*` is correctly gitignored and no secrets are tracked** (verified) — this is a *pass*, noted for completeness.

### Dependency audit (`npm audit`)
**41 vulnerabilities: 3 critical, 26 high, 12 moderate.** The runtime-relevant ones are C-1/C-2 above. Many of the rest live in build/dev tooling (babel, capacitor CLI, prisma dev deps) — lower priority but should be triaged.
Fix: `npm audit fix`, then manually bump Clerk and Next, then re-run the build and `tests/audit.test.ts`.

---

## 4. SOC 2 readiness assessment

SOC 2 evaluates controls against the Trust Services Criteria (TSC). This is an early-stage app, so the gaps are mostly **organizational/process controls that don't exist yet**, plus the technical gaps above. Below maps current state to the relevant criteria.

| TSC | Criterion | Status | Gap / needed |
|---|---|---|---|
| **Security (CC)** | CC6.1 Logical access — least privilege | **Fail** | Admin API routes don't enforce admin role (H-1); public cron (H-2). Implement a single authz layer + deny-by-default. |
| | CC6.1 Vulnerability management | **Fail** | 3 critical CVEs unpatched (C-1/C-2). Need a documented patch cadence + automated dependency scanning (Dependabot/Renovate). |
| | CC6.6 Boundary protection | **Partial** | Stripe webhook signature verified (good); no rate limiting, no WAF, no security headers (M-2, M-6). |
| | CC6.7 Data in transit | **Partial** | HTTPS via Vercel (good); no documented encryption standard. |
| | CC7.2 Monitoring / detection | **Partial** | App has Sentry per your stack, but no documented alerting, no audit log of admin/financial actions. |
| | CC7.3 Incident response | **Fail** | No incident response plan, no breach notification process documented. |
| | CC8.1 Change management | **Partial** | You use PRs + CI (good foundation). Need documented review/approval policy, no direct-to-main, mandatory checks. |
| **Availability (A)** | A1.2 Backups / recovery | **Unknown/Fail** | No documented DB backup/restore or RTO/RPO. Supabase has backups but they must be configured + documented. |
| **Confidentiality (C)** | C1.1 Data classification | **Fail** | No data classification; PII (emails) + financial data logged in plaintext (L-2). |
| **Processing Integrity (PI)** | PI1.1 Accurate processing | **Pass (for fixes)** | The PR #32 fixes make the ledger accurate and idempotent — a genuine strength. Extend with reconciliation between Stripe and the DB ledger. |
| **Privacy (P)** | P-series | **Partial** | A `/privacy` page exists; analytics hashing is privacy-conscious (good). No DPA, no data-retention/deletion policy, no DSAR process. |

**Bottom line on SOC 2:** You cannot "ensure SOC 2 compliance" via code changes alone — SOC 2 Type II is an **independent auditor's attestation over a 3–12 month observation window** that your *documented* controls operated effectively. What this audit can do is get you **audit-ready**: close the technical gaps (§3), then stand up the organizational controls (§5). Plan on an auditor (e.g. via Vanta/Drata/Secureframe tooling) and a multi-month timeline.

---

## 5. Prioritized remediation plan

**P0 — before any real-money public launch (this week)**
1. Add `requireAdmin()` to every `/api/admin/*` route (H-1).
2. Lock the cron endpoint behind `CRON_SECRET` (H-2).
3. Upgrade Clerk to ≥ 6.39.2 and Next.js to latest patch; re-run build + tests (C-1, C-2).
4. Remove the committed `.swp` file and gitignore swap files (L-1).

**P1 — within 2 weeks**
5. Add rate limiting to checkout, AI suggest, analytics, feedback, transaction (M-2).
6. Harden `sync-history` to stop trusting client-supplied financial fields (M-1).
7. Stop returning raw error messages; scrub PII/balances from logs (M-3, L-2, L-3).
8. Add Stripe↔DB reconciliation + an immutable audit log of admin and financial actions.

**P2 — SOC 2 program (multi-month)**
9. Adopt Dependabot/Renovate + a documented patch SLA.
10. Document: access control policy, change management, incident response, backup/DR, data classification, retention/deletion, vendor management.
11. Configure + verify Supabase automated backups with a tested restore.
12. Engage a SOC 2 tooling vendor and begin the Type I → Type II observation window.

---

## Appendix — how this was tested
- PostgreSQL 17 provisioned locally; `prisma db push` applied the real schema.
- `tests/audit.test.ts` exercises legitimate + adversarial inputs (cheating, IDOR, replay, insufficient funds, guest path) through the exact transactional logic of the route handlers.
- Full Next.js build verified: `✓ Compiled successfully` + type/lint checks pass (static prerender step fails only on placeholder Clerk keys in the sandbox — unrelated to code).
- `npm audit --json` for the dependency findings.
