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

// Same rule as normalizePdfPassword in src/lib/utils.ts.
function seedPdfPassword() {
  return (process.env.SEED_PDF_PASSWORD ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
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
      pdfPassword: seedPdfPassword(),
      fxFeePercent: 1.0,
      fxFeeCalibrated: true,
      houseFundGoalPhp: 3000000,
    },
  });

  // One-time: turn the old single "house fund" setting into a savings goal.
  // The flag makes sure deleting every goal later doesn't bring it back on the next deploy.
  const settings = await prisma.paymentSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (!settings.goalsInitialized) {
    if ((await prisma.savingsGoal.count()) === 0) {
      await prisma.savingsGoal.create({
        data: { name: "House Fund", targetPhp: settings.houseFundGoalPhp, priority: 1 },
      });
    }
    await prisma.paymentSettings.update({ where: { id: 1 }, data: { goalsInitialized: true } });
  }

  // Fill in the payslip password from SEED_PDF_PASSWORD if none is set yet.
  // A password chosen in Settings is never overwritten.
  if (!settings.pdfPassword.trim() && seedPdfPassword()) {
    await prisma.paymentSettings.update({ where: { id: 1 }, data: { pdfPassword: seedPdfPassword() } });
  }

  // One-time: move the old 1.5% placeholder fee to the calibrated 1.0%.
  // Only touches the untouched default; a fee Kyle set himself is kept.
  if (!settings.fxFeeCalibrated) {
    await prisma.paymentSettings.update({
      where: { id: 1 },
      data: {
        fxFeeCalibrated: true,
        ...(Number(settings.fxFeePercent) === 1.5 ? { fxFeePercent: 1.0 } : {}),
      },
    });
  }

  // Two sample weeks (opt-in): last week (received) and this week (pending).
  if (process.env.SEED_SAMPLE_CUTOFFS === "true") {
    const now = new Date();
    const thisWeek = weekFor(now);
    const lastWeek = weekFor(new Date(now.getTime() - 7 * 86400000));

    const existing = await prisma.cutoff.count({ where: { kind: "CONTRACT", periodStart: { in: [lastWeek.start, thisWeek.start] } } });
    if (existing === 0) await prisma.cutoff.createMany({ data: [{
        periodStart: lastWeek.start,
        periodEnd: lastWeek.end,
        payoutDate: lastWeek.payout,
        hoursWorked: 40,
        status: CutoffStatus.RECEIVED,
        fxRate: 58.5,
        fxFeePercent: 1.5,
        receivedAt: new Date(),
      }, {
        periodStart: thisWeek.start,
        periodEnd: thisWeek.end,
        payoutDate: thisWeek.payout,
        hoursWorked: 32.5,
      }] });
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
