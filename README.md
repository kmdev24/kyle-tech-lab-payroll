# KYLE TECH LAB · Payroll & Revenue Split

Next.js 15 (App Router) · Prisma · TiDB Cloud Serverless (MySQL) · NextAuth · Tailwind + shadcn/ui · Resend · PDFKit

- **Admin (Kyle):** full $30/hr gross, 70/30 split, house fund, cutoff CRUD, FX fee, recipient payment details, payout QR.
- **Viewer (Mom):** hours, $9.00/hr, net USD/PHP, status, and her own payslip downloads. Nothing else.

## How Mom's view is protected

The 70/30 split is enforced on the server, not by hiding things in the UI:

- `src/lib/data.ts` has two projections. Viewer queries use a Prisma `select` that never includes `baseRate`, so gross revenue and Kyle's share are never even read from the database for a VIEWER session.
- `/dashboard` picks the query by role on the server; the viewer component only receives viewer data.
- `/admin/*` is blocked by middleware **and** by `requireAdmin()` in the admin layout and in every server action (which re-reads the role from the DB).
- The payslip PDF/email builder only accepts the viewer projection type, so it can't include gross or 70% data.

## Business rules

| Rule | Where |
| --- | --- |
| $30.00/hr base, $9.00/hr Mom (30%) | `src/lib/constants.ts`, stored per cutoff |
| Cutoff Saturday → Friday, payout following Wednesday (+5 days) | `src/lib/cutoff.ts` |
| Live USD→PHP from open.er-api.com (cached 1h) minus Stripe FX fee (default 1.0%, calibrated from a real Stripe payout) | `src/lib/fx.ts` |
| FX rate is **locked** when a cutoff is marked Received; pending ones show a live estimate | `markReceived` in `src/app/(app)/admin/actions.ts` |
| House fund = Kyle's 70% PHP from received cutoffs, goal ₱3,000,000 (editable) | `getAdminDashboard` |

## Marking a cutoff "Received"

1. Locks the live FX rate and current fee on the cutoff.
2. Builds the AES-256 password-protected payslip PDF titled **KYLE TECH LAB - OFFICIAL PAYSLIP STATEMENT** (`src/lib/pdf.ts`), with only Mom's hours, $9/hr rate, net USD/PHP, cutoff & payout dates and payment destination.
3. Emails it to Mom via Resend (`src/lib/email.ts`). If Resend isn't configured the status still changes and the toast says why the email wasn't sent; use the ✉ button to resend.
4. Shows a **Payout via UnionBank** button with copy-ready transfer details and a QR code.

**About the InstaPay QR:** UnionBank has no public "pre-filled transfer" deep link. Instead, paste the text from Mom's own *Receive money* QR (GoTyme/GCash/Maya; scan it with any QR reader, it starts with `000201`) into Settings. The app then generates a real QR Ph code from it with the exact amount filled in (tag 54, CRC recomputed), which you scan with UnionBank's *Scan QR*. Without it, the QR just carries the transfer details as text.

## File structure

```
prisma/
  schema.prisma          User, Cutoff, PaymentSettings (MySQL / TiDB)
  seed.ts                Kyle (ADMIN), Mom (VIEWER), settings, 2 sample weeks
src/
  middleware.ts          Auth gate for /dashboard, /admin, /api/payslip
  types/next-auth.d.ts   Session role typing
  lib/
    auth.ts              NextAuth credentials + requireUser/requireAdmin
    prisma.ts            Prisma client singleton
    data.ts              Role-scoped queries (admin vs viewer projections)
    cutoff.ts            Sat–Fri week + Wednesday payout
    fx.ts                Live rate + Stripe fee
    pdf.ts               Encrypted payslip PDF (PDFKit, AES-256)
    email.ts             Resend email with PDF attachment
    payslip.ts           Generate / email payslip for a cutoff
    qrph.ts              QR Ph (EMVCo) parse, validate, set amount, CRC16
    constants.ts, utils.ts, form.ts
  app/
    login/               Login screen
    (app)/layout.tsx     Header + auth
    (app)/dashboard/     Admin & viewer dashboards
    (app)/admin/actions.ts   Server actions (all requireAdmin)
    (app)/admin/cutoffs/     Cutoff CRUD, Received flow, payout dialog
    (app)/admin/settings/    Recipient details, PDF password, FX fee, goal, QR Ph
    api/auth/[...nextauth]/  NextAuth
    api/payslip/[id]/        PDF download (Mom: received cutoffs only)
  components/            Header, stat cards, modal, shadcn/ui primitives
```

## Setup

### 1. TiDB Cloud Serverless
1. Create a Serverless cluster at https://tidbcloud.com and a database (e.g. `payroll`).
2. **Connect → Prisma** and copy the URL. It must end with `?sslaccept=strict`:
   `mysql://xxxx.root:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/payroll?sslaccept=strict`

### 2. Local
```bash
cp .env.example .env      # fill in DATABASE_URL, NEXTAUTH_SECRET, Resend, seed passwords
npm install
npx prisma db push        # creates the tables in TiDB
npm run db:seed           # creates Kyle + Mom accounts
npm run dev
```
Set `SEED_SAMPLE_CUTOFFS=true` before seeding if you want two demo weeks.

### 3. Resend
Create an API key at https://resend.com, verify your sending domain, then set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `KYLE TECH LAB <payroll@yourdomain.com>`). Set Mom's email and PDF password in **Settings**.

### 4. Vercel
1. Import the GitHub repo in Vercel (framework: Next.js). Vercel runs the `vercel-build` script, which does `prisma db push` + seed + `next build`, so the tables and logins are created on the first deploy with no local commands.
2. Add env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_VIEWER_EMAIL`, `SEED_VIEWER_PASSWORD`, `SEED_PDF_PASSWORD`, and when ready `RESEND_API_KEY`, `EMAIL_FROM`. Leave `NEXTAUTH_URL` unset on Vercel.
3. The seed never changes existing users, so leaving the SEED_* variables in place is safe.

## Notes
- The PDF password is stored in the database in plain text because it's needed to encrypt each payslip; treat it as a PIN, not a secret.
- Editing hours on an already-received cutoff keeps the locked FX rate; resend the payslip afterwards.
- Change passwords by re-hashing: `node -e "console.log(require('bcryptjs').hashSync('new-pass', 12))"` and update the `User` row.
