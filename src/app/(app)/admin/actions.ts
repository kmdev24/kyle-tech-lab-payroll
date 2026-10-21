"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cutoffWeekFor, manilaToday, toDateInput } from "@/lib/cutoff";
import { fetchHistoricalUsdPhp, fetchUsdPhpRate } from "@/lib/fx";
import { getSettings } from "@/lib/data";
import { emailPayslip } from "@/lib/payslip";
import { validateQrPh } from "@/lib/qrph";
import { BASE_RATE_USD, VIEWER_RATE_USD, VIEWER_SHARE } from "@/lib/constants";
import { normalizePdfPassword, round2 } from "@/lib/utils";

export type ActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/admin/cutoffs");
}

// Hours and money are kept to 2 decimals, matching the client platform's report.
const hoursField = z.coerce.number().min(0).max(168).transform(round2);
const optionalUsd = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().min(0).max(1_000_000).transform(round2).optional(),
);

const cutoffSchema = z
  .object({
    kind: z.enum(["CONTRACT", "INCENTIVE"]).default("CONTRACT"),
    weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    hoursWorked: z.preprocess((v) => (v === "" || v == null ? 0 : v), hoursField),
    earnedUsd: optionalUsd,
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.kind === "CONTRACT" || d.earnedUsd != null, {
    message: "Enter the incentive amount (USD)",
  })
  .refine((d) => d.kind === "INCENTIVE" || d.hoursWorked > 0 || d.earnedUsd != null, {
    message: "Enter the hours worked",
  });

/**
 * Mom's 30% of an actual earned amount, stored so viewer queries never read earnedUsd.
 * Incentives are 100% Kyle's, so her share of those is zero.
 */
function earnedFields(earnedUsd: number | undefined | null, kind: "CONTRACT" | "INCENTIVE") {
  if (earnedUsd == null) return { earnedUsd: null, viewerEarnedUsd: null };
  return { earnedUsd, viewerEarnedUsd: kind === "INCENTIVE" ? 0 : round2(earnedUsd * VIEWER_SHARE) };
}

export async function createCutoff(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = cutoffSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { kind, hoursWorked, earnedUsd, notes } = parsed.data;
  const week = cutoffWeekFor(parsed.data.weekOf);

  if (kind === "CONTRACT") {
    const exists = await prisma.cutoff.findFirst({ where: { kind, periodStart: week.periodStart } });
    if (exists) return { ok: false, message: "A cutoff for that week already exists. Edit it instead." };
  }

  await prisma.cutoff.create({
    data: {
      ...week,
      kind,
      hoursWorked: kind === "INCENTIVE" ? 0 : hoursWorked,
      baseRate: BASE_RATE_USD,
      viewerRate: VIEWER_RATE_USD,
      ...earnedFields(earnedUsd, kind),
      notes: notes || null,
    },
  });
  refresh();
  return { ok: true, message: kind === "INCENTIVE" ? "Incentive added" : "Cutoff created" };
}

export async function updateCutoff(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const existing = id ? await prisma.cutoff.findUnique({ where: { id }, select: { kind: true } }) : null;
  if (!existing) return { ok: false, message: "Cutoff not found" };
  const hours = z.preprocess((v) => (v === "" || v == null ? 0 : v), hoursField).safeParse(form.get("hoursWorked"));
  const earned = optionalUsd.safeParse(form.get("earnedUsd"));
  const stripeRate = z
    .preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(1).max(1000).optional())
    .safeParse(form.get("stripeRate"));
  if (!stripeRate.success) return { ok: false, message: "Invalid Stripe rate" };
  if (!hours.success) return { ok: false, message: "Invalid hours" };
  if (!earned.success) return { ok: false, message: "Invalid earned amount" };
  if (existing.kind === "INCENTIVE" && earned.data == null) return { ok: false, message: "Enter the incentive amount (USD)" };
  const notes = String(form.get("notes") ?? "").slice(0, 500);
  await prisma.cutoff.update({
    where: { id },
    data: {
      hoursWorked: existing.kind === "INCENTIVE" ? 0 : hours.data,
      ...earnedFields(earned.data, existing.kind),
      stripeRate: stripeRate.data ?? null,
      notes: notes || null,
    },
  });
  refresh();
  return { ok: true, message: "Cutoff updated" };
}

export async function deleteCutoff(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.cutoff.delete({ where: { id } });
  refresh();
  return { ok: true, message: "Cutoff deleted" };
}

/** Marks a cutoff RECEIVED, locks the FX rate, and emails Mom's encrypted payslip (contracts only). */
export async function markReceived(id: string): Promise<ActionResult> {
  await requireAdmin();
  const cutoff = await prisma.cutoff.findUnique({
    where: { id },
    select: { kind: true, payoutDate: true, fxRate: true, stripeRate: true },
  });
  if (!cutoff) return { ok: false, message: "Cutoff not found" };
  const settings = await getSettings();

  // Keep a rate that's already locked (receipt or payout date). Otherwise use the
  // payout date's rate if it's published, falling back to today's live rate.
  let fx = {};
  if (cutoff.fxRate == null && cutoff.stripeRate == null) {
    const payoutDay = toDateInput(cutoff.payoutDate);
    const rate =
      (payoutDay <= manilaToday() ? await fetchHistoricalUsdPhp(payoutDay) : null) ??
      (await fetchUsdPhpRate())?.rate;
    if (rate == null) return { ok: false, message: "Couldn't fetch the USD→PHP rate. Try again in a minute." };
    fx = { fxRate: rate, fxFeePercent: settings.fxFeePercent };
  }

  await prisma.cutoff.update({
    where: { id },
    data: { status: "RECEIVED", receivedAt: new Date(), ...fx },
  });

  if (cutoff.kind === "INCENTIVE") {
    refresh();
    return { ok: true, message: "Incentive marked received (100% yours, no payslip sent)" };
  }

  const email = await emailPayslip(id).catch((e: Error) => ({ sent: false as const, reason: e.message }));
  refresh();
  return email.sent
    ? { ok: true, message: "Marked received. Payslip emailed." }
    : { ok: true, message: `Marked received. Email not sent: ${email.reason}` };
}

export async function markPending(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.cutoff.update({
    where: { id },
    // The payout-date rate stays locked (it's a fact about that date); only the
    // received status is undone.
    data: { status: "PENDING", receivedAt: null, emailSentAt: null },
  });
  refresh();
  return { ok: true, message: "Moved back to pending" };
}

export async function resendPayslip(id: string): Promise<ActionResult> {
  await requireAdmin();
  const email = await emailPayslip(id).catch((e: Error) => ({ sent: false as const, reason: e.message }));
  refresh();
  return email.sent ? { ok: true, message: "Payslip emailed" } : { ok: false, message: email.reason };
}

const settingsSchema = z.object({
  bankName: z.string().trim().min(1).max(60),
  accountName: z.string().trim().max(120),
  accountNumber: z.string().trim().max(60),
  recipientEmail: z.union([z.literal(""), z.string().trim().email()]),
  pdfPassword: z.string().max(64).transform(normalizePdfPassword),
  fxFeePercent: z.coerce.number().min(0).max(20),
  qrPhPayload: z.string().trim().max(1000).optional(),
});

export async function saveSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `${issue.path.join(".")}: ${issue.message}` };
  }
  const qr = parsed.data.qrPhPayload ?? "";
  const qrError = validateQrPh(qr);
  if (qrError) return { ok: false, message: `QR Ph payload: ${qrError}` };

  const data = { ...parsed.data, qrPhPayload: qr || null };
  await prisma.paymentSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath("/admin/settings");
  refresh();
  return { ok: true, message: "Settings saved" };
}

const goalSchema = z.object({
  name: z.string().trim().min(1, "Name the goal").max(80),
  targetPhp: z.coerce.number().positive("Target must be more than 0").max(1_000_000_000).transform(round2),
  startingPhp: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().min(0).transform(round2)),
  priority: z.preprocess((v) => (v === "" || v == null ? 1 : v), z.coerce.number().int().min(1).max(999)),
});

function refreshGoals() {
  revalidatePath("/dashboard");
  revalidatePath("/admin/goals");
}

export async function saveGoal(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const parsed = goalSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (id) await prisma.savingsGoal.update({ where: { id }, data: parsed.data });
  else await prisma.savingsGoal.create({ data: parsed.data });
  refreshGoals();
  return { ok: true, message: id ? "Goal updated" : "Goal added" };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.savingsGoal.delete({ where: { id } });
  refreshGoals();
  return { ok: true, message: "Goal deleted" };
}

const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.union([z.literal(""), z.string().min(8, "New password must be at least 8 characters").max(128)]),
});

/** Updates a login's display name, email and (optionally) password. Roles can't be changed here. */
export async function saveAccount(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = accountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, email, password } = parsed.data;
  const taken = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
  if (taken) return { ok: false, message: "Another account already uses that email" };
  await prisma.user.update({
    where: { id },
    data: { name, email, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: password ? "Account and password updated" : "Account updated" };
}
