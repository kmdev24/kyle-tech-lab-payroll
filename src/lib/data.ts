/**
 * Role-scoped data access.
 *
 * Every read the app does goes through one of two projections:
 *  - Admin*: full figures (gross, 70/30 split).
 *  - Viewer*: only Mom's hours, $9.00/hr rate and net pay. The Prisma `select`
 *    for viewer queries never includes `baseRate` or `earnedUsd` (Mom's share of
 *    the actual amount is precomputed into `viewerEarnedUsd`), so gross revenue and Kyle's
 *    share are never loaded from the database for a VIEWER session, let alone
 *    serialized to the browser or written into a payslip.
 */
import type { CutoffStatus, EntryKind } from "@prisma/client";
import { prisma } from "./prisma";
import { applyFee, getFxQuote, type FxQuote } from "./fx";
import { DEFAULT_FX_FEE_PERCENT, HOUSE_FUND_GOAL_PHP } from "./constants";
import { round2 } from "./utils";

// ---------- Settings ----------

export async function getSettings() {
  const s = await prisma.paymentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return {
    bankName: s.bankName,
    accountName: s.accountName,
    accountNumber: s.accountNumber,
    recipientEmail: s.recipientEmail,
    pdfPassword: s.pdfPassword,
    fxFeePercent: Number(s.fxFeePercent ?? DEFAULT_FX_FEE_PERCENT),
    houseFundGoalPhp: Number(s.houseFundGoalPhp ?? HOUSE_FUND_GOAL_PHP),
    qrPhPayload: s.qrPhPayload ?? "",
  };
}
export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Payment destination only: safe to show Mom. */
export async function getPaymentDestination() {
  const s = await prisma.paymentSettings.findUnique({
    where: { id: 1 },
    select: { bankName: true, accountName: true, accountNumber: true },
  });
  return s ?? { bankName: "", accountName: "", accountNumber: "" };
}
export type PaymentDestination = Awaited<ReturnType<typeof getPaymentDestination>>;

// ---------- FX resolution ----------

/** Locked rate for received cutoffs; live rate (with current fee) for pending ones. */
function resolveRate(
  row: { fxRate: unknown; fxFeePercent: unknown },
  live: FxQuote,
): { effectiveRate: number | null; locked: boolean } {
  if (row.fxRate != null) {
    const fee = row.fxFeePercent != null ? Number(row.fxFeePercent) : live.feePercent;
    return { effectiveRate: applyFee(Number(row.fxRate), fee), locked: true };
  }
  return { effectiveRate: live.effectiveRate, locked: false };
}

const toPhp = (usd: number, rate: number | null) => (rate == null ? null : round2(usd * rate));

// ---------- Viewer (Mom) projection ----------

const viewerSelect = {
  id: true,
  kind: true,
  viewerEarnedUsd: true,
  periodStart: true,
  periodEnd: true,
  payoutDate: true,
  hoursWorked: true,
  viewerRate: true,
  status: true,
  fxRate: true,
  fxFeePercent: true,
  receivedAt: true,
} as const;

export type ViewerCutoff = {
  id: string;
  kind: EntryKind;
  periodStart: string;
  periodEnd: string;
  payoutDate: string;
  hoursWorked: number;
  rateUsd: number;
  netUsd: number;
  netPhp: number | null;
  fxLocked: boolean;
  status: CutoffStatus;
};

function toViewerCutoff(
  row: {
    id: string;
    kind: EntryKind;
    viewerEarnedUsd: unknown;
    periodStart: Date;
    periodEnd: Date;
    payoutDate: Date;
    hoursWorked: unknown;
    viewerRate: unknown;
    status: CutoffStatus;
    fxRate: unknown;
    fxFeePercent: unknown;
  },
  live: FxQuote,
): ViewerCutoff {
  const hours = Number(row.hoursWorked);
  const rate = Number(row.viewerRate);
  const netUsd = row.viewerEarnedUsd != null ? Number(row.viewerEarnedUsd) : round2(hours * rate);
  const { effectiveRate, locked } = resolveRate(row, live);
  return {
    id: row.id,
    kind: row.kind,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    payoutDate: row.payoutDate.toISOString(),
    hoursWorked: hours,
    rateUsd: rate,
    netUsd,
    netPhp: toPhp(netUsd, effectiveRate),
    fxLocked: locked,
    status: row.status,
  };
}

export async function getViewerDashboard() {
  const [settings, rows] = await Promise.all([
    prisma.paymentSettings.findUnique({ where: { id: 1 }, select: { fxFeePercent: true } }),
    prisma.cutoff.findMany({ select: viewerSelect, orderBy: { periodStart: "desc" } }),
  ]);
  const live = await getFxQuote(Number(settings?.fxFeePercent ?? DEFAULT_FX_FEE_PERCENT));
  const cutoffs = rows.map((r) => toViewerCutoff(r, live));

  const sum = (xs: ViewerCutoff[], f: (c: ViewerCutoff) => number | null) =>
    round2(xs.reduce((a, c) => a + (f(c) ?? 0), 0));
  const received = cutoffs.filter((c) => c.status === "RECEIVED");
  const pending = cutoffs.filter((c) => c.status === "PENDING");

  return {
    cutoffs,
    fx: { effectiveRate: live.effectiveRate, updatedAt: live.updatedAt },
    totals: {
      hours: sum(cutoffs, (c) => c.hoursWorked),
      netUsd: sum(cutoffs, (c) => c.netUsd),
      netPhp: sum(cutoffs, (c) => c.netPhp),
      receivedPhp: sum(received, (c) => c.netPhp),
      pendingPhp: sum(pending, (c) => c.netPhp),
      receivedCount: received.length,
      pendingCount: pending.length,
    },
  };
}

/** A single cutoff in the viewer projection (used for payslips: same for both roles). */
export async function getViewerCutoff(id: string) {
  const [row, settings] = await Promise.all([
    prisma.cutoff.findUnique({ where: { id }, select: viewerSelect }),
    prisma.paymentSettings.findUnique({ where: { id: 1 }, select: { fxFeePercent: true } }),
  ]);
  if (!row) return null;
  const live = await getFxQuote(Number(settings?.fxFeePercent ?? DEFAULT_FX_FEE_PERCENT));
  return toViewerCutoff(row, live);
}

// ---------- Admin (Kyle) projection ----------

export type AdminCutoff = ViewerCutoff & {
  baseRateUsd: number;
  /** Actual USD earned entered from the client platform, if any. */
  earnedUsd: number | null;
  grossUsd: number;
  grossPhp: number | null;
  kyleUsd: number;
  kylePhp: number | null;
  fxMidRate: number | null;
  fxFeePercent: number;
  emailSentAt: string | null;
  receivedAt: string | null;
  notes: string | null;
};

export async function getAdminDashboard() {
  const settings = await getSettings();
  const [rows, live] = await Promise.all([
    prisma.cutoff.findMany({ orderBy: { periodStart: "desc" } }),
    getFxQuote(settings.fxFeePercent),
  ]);

  const cutoffs: AdminCutoff[] = rows.map((r) => {
    const v = toViewerCutoff(r, live);
    const { effectiveRate } = resolveRate(r, live);
    const baseRate = Number(r.baseRate);
    const earnedUsd = r.earnedUsd != null ? Number(r.earnedUsd) : null;
    const grossUsd = earnedUsd ?? round2(v.hoursWorked * baseRate);
    const kyleUsd = round2(grossUsd - v.netUsd);
    return {
      ...v,
      baseRateUsd: baseRate,
      earnedUsd,
      grossUsd,
      grossPhp: toPhp(grossUsd, effectiveRate),
      kyleUsd,
      kylePhp: toPhp(kyleUsd, effectiveRate),
      fxMidRate: r.fxRate != null ? Number(r.fxRate) : live.midRate,
      fxFeePercent: r.fxFeePercent != null ? Number(r.fxFeePercent) : live.feePercent,
      emailSentAt: r.emailSentAt?.toISOString() ?? null,
      receivedAt: r.receivedAt?.toISOString() ?? null,
      notes: r.notes,
    };
  });

  const sum = (xs: AdminCutoff[], f: (c: AdminCutoff) => number | null) =>
    round2(xs.reduce((a, c) => a + (f(c) ?? 0), 0));
  const received = cutoffs.filter((c) => c.status === "RECEIVED");
  const pending = cutoffs.filter((c) => c.status === "PENDING");

  return {
    settings,
    fx: live,
    cutoffs,
    totals: {
      hours: sum(cutoffs, (c) => c.hoursWorked),
      grossUsd: sum(cutoffs, (c) => c.grossUsd),
      grossPhp: sum(cutoffs, (c) => c.grossPhp),
      kyleUsd: sum(cutoffs, (c) => c.kyleUsd),
      kylePhp: sum(cutoffs, (c) => c.kylePhp),
      momUsd: sum(cutoffs, (c) => c.netUsd),
      momPhp: sum(cutoffs, (c) => c.netPhp),
      receivedGrossPhp: sum(received, (c) => c.grossPhp),
      pendingGrossPhp: sum(pending, (c) => c.grossPhp),
      receivedCount: received.length,
      pendingCount: pending.length,
      // House fund = Kyle's 70% share (PHP) from cutoffs already received.
      houseFundPhp: sum(received, (c) => c.kylePhp),
    },
  };
}
