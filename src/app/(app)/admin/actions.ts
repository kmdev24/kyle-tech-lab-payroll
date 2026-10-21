"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cutoffWeekFor } from "@/lib/cutoff";
import { fetchUsdPhpRate } from "@/lib/fx";
import { getSettings } from "@/lib/data";
import { emailPayslip } from "@/lib/payslip";
import { validateQrPh } from "@/lib/qrph";
import { BASE_RATE_USD, VIEWER_RATE_USD } from "@/lib/constants";

export type ActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/admin/cutoffs");
}

const cutoffSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  hoursWorked: z.coerce.number().min(0).max(168),
  notes: z.string().max(500).optional(),
});

export async function createCutoff(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = cutoffSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const week = cutoffWeekFor(parsed.data.weekOf);

  const exists = await prisma.cutoff.findUnique({ where: { periodStart: week.periodStart } });
  if (exists) return { ok: false, message: "A cutoff for that week already exists. Edit it instead." };

  await prisma.cutoff.create({
    data: {
      ...week,
      hoursWorked: parsed.data.hoursWorked,
      baseRate: BASE_RATE_USD,
      viewerRate: VIEWER_RATE_USD,
      notes: parsed.data.notes || null,
    },
  });
  refresh();
  return { ok: true, message: "Cutoff created" };
}

export async function updateCutoff(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const hours = z.coerce.number().min(0).max(168).safeParse(form.get("hoursWorked"));
  if (!id || !hours.success) return { ok: false, message: "Invalid hours" };
  const notes = String(form.get("notes") ?? "").slice(0, 500);
  await prisma.cutoff.update({ where: { id }, data: { hoursWorked: hours.data, notes: notes || null } });
  refresh();
  return { ok: true, message: "Cutoff updated" };
}

export async function deleteCutoff(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.cutoff.delete({ where: { id } });
  refresh();
  return { ok: true, message: "Cutoff deleted" };
}

/** Marks a cutoff RECEIVED, locks the FX rate, and emails Mom's encrypted payslip. */
export async function markReceived(id: string): Promise<ActionResult> {
  await requireAdmin();
  const settings = await getSettings();
  const live = await fetchUsdPhpRate();
  if (!live) return { ok: false, message: "Couldn't fetch the live USD→PHP rate. Try again in a minute." };

  await prisma.cutoff.update({
    where: { id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
      fxRate: live.rate,
      fxFeePercent: settings.fxFeePercent,
    },
  });

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
    data: { status: "PENDING", receivedAt: null, fxRate: null, fxFeePercent: null, emailSentAt: null },
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
  pdfPassword: z.string().max(64),
  fxFeePercent: z.coerce.number().min(0).max(20),
  houseFundGoalPhp: z.coerce.number().min(0),
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
