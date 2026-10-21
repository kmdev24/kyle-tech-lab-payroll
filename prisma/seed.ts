import { PrismaClient, Role, CutoffStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function env(name: string, fallback: string) {
  return process.env[name] && process.env[name]!.length > 0 ? process.env[name]! : fallback;
}

// Same rules as src/lib/cutoff.ts (kept inline so the seed runs standalone).
function utcDay(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}
function weekFor(date: Date) {
  const d = utcDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const back = (d.getUTCDay() + 1) % 7; // days since Saturday
  const start = new Date(d.getTime() - back * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  const payout = new Date(end.getTime() + 5 * 86400000);
  return { start, end, payout };
}

async function main() {
  const adminEmail = env("SEED_ADMIN_EMAIL", "kyle@example.com").toLowerCase();
  const viewerEmail = env("SEED_VIEWER_EMAIL", "mom@example.com").toLowerCase();

  // Accounts are only created when their password is provided, so a deploy
  // without SEED_* variables never creates a login with a default password.
  // Existing users are never modified.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const viewerPassword = process.env.SEED_VIEWER_PASSWORD;

  if (adminPassword) await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Kyle",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  if (viewerPassword) await prisma.user.upsert({
    where: { email: viewerEmail },
    update: {},
    create: {
      email: viewerEmail,
      name: "Mom",
      role: Role.VIEWER,
      passwordHash: await bcrypt.hash(viewerPassword, 12),
    },
  });

  await prisma.paymentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bankName: "GoTyme",
      accountName: "",
      accountNumber: "",
      recipientEmail: viewerEmail,
      pdfPassword: env("SEED_PDF_PASSWORD", ""),
      fxFeePercent: 1.5,
      houseFundGoalPhp: 3000000,
    },
  });

  // Two sample weeks (opt-in): last week (received) and this week (pending).
  if (process.env.SEED_SAMPLE_CUTOFFS === "true") {
    const now = new Date();
    const thisWeek = weekFor(now);
    const lastWeek = weekFor(new Date(now.getTime() - 7 * 86400000));

    await prisma.cutoff.upsert({
      where: { periodStart: lastWeek.start },
      update: {},
      create: {
        periodStart: lastWeek.start,
        periodEnd: lastWeek.end,
        payoutDate: lastWeek.payout,
        hoursWorked: 40,
        status: CutoffStatus.RECEIVED,
        fxRate: 58.5,
        fxFeePercent: 1.5,
        receivedAt: new Date(),
      },
    });
    await prisma.cutoff.upsert({
      where: { periodStart: thisWeek.start },
      update: {},
      create: {
        periodStart: thisWeek.start,
        periodEnd: thisWeek.end,
        payoutDate: thisWeek.payout,
        hoursWorked: 32.5,
      },
    });
  }

  console.log(
    `Seed done. Admin ${adminEmail}: ${adminPassword ? "ensured" : "skipped (no SEED_ADMIN_PASSWORD)"}. ` +
      `Viewer ${viewerEmail}: ${viewerPassword ? "ensured" : "skipped (no SEED_VIEWER_PASSWORD)"}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
