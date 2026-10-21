import { prisma } from "./prisma";
import { getPaymentDestination, getViewerCutoff } from "./data";
import { buildPayslipPdf } from "./pdf";
import { sendPayslipEmail, type EmailResult } from "./email";
import { normalizePdfPassword } from "./utils";

async function viewerName() {
  // Skip leftover placeholder accounts (no real email) from an early deploy.
  const viewer = await prisma.user.findFirst({
    where: { role: "VIEWER", email: { contains: "@" } },
    orderBy: { createdAt: "desc" },
    select: { name: true },
  });
  return viewer?.name ?? "Recipient";
}

/** Generates the encrypted payslip PDF for a cutoff (viewer-safe data only). */
export async function generatePayslip(cutoffId: string) {
  const [cutoff, destination, settings, recipientName] = await Promise.all([
    getViewerCutoff(cutoffId),
    getPaymentDestination(),
    prisma.paymentSettings.findUnique({ where: { id: 1 }, select: { pdfPassword: true, recipientEmail: true } }),
    viewerName(),
  ]);
  if (!cutoff) throw new Error("No payslip for this entry (incentives are not shared)");
  const pdf = await buildPayslipPdf({
    cutoff,
    destination,
    recipientName,
    password: normalizePdfPassword(settings?.pdfPassword),
  });
  return { pdf, cutoff, recipientName, recipientEmail: settings?.recipientEmail ?? "" };
}

export async function emailPayslip(cutoffId: string): Promise<EmailResult> {
  const { pdf, cutoff, recipientName, recipientEmail } = await generatePayslip(cutoffId);
  const result = await sendPayslipEmail({ to: recipientEmail, recipientName, cutoff, pdf });
  if (result.sent) {
    await prisma.cutoff.update({ where: { id: cutoffId }, data: { emailSentAt: new Date() } });
  }
  return result;
}
