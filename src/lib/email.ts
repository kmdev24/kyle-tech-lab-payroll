import { Resend } from "resend";
import { PAYSLIP_TITLE } from "./constants";
import type { ViewerCutoff } from "./data";
import { formatDate, formatPhp, formatUsd } from "./utils";

export type EmailResult = { sent: true; id: string } | { sent: false; reason: string };

export async function sendPayslipEmail(opts: {
  to: string;
  recipientName: string;
  cutoff: ViewerCutoff;
  pdf: Buffer;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "RESEND_API_KEY / EMAIL_FROM not configured" };
  if (!opts.to) return { sent: false, reason: "No recipient email in Payment Settings" };

  const { cutoff } = opts;
  const period = `${formatDate(cutoff.periodStart)} - ${formatDate(cutoff.periodEnd)}`;
  const amount = cutoff.netPhp != null ? formatPhp(cutoff.netPhp) : formatUsd(cutoff.netUsd);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `${PAYSLIP_TITLE} (${period})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
        <div style="height:6px;background:#7c3aed;border-radius:3px"></div>
        <h2 style="margin:20px 0 4px">KYLE TECH LAB</h2>
        <p style="margin:0;color:#64748b">Official Payslip Statement</p>
        <p style="margin-top:24px">Hi ${escapeHtml(opts.recipientName)},</p>
        <p>Your payout for <b>${period}</b> has been received.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${
            cutoff.kind === "INCENTIVE"
              ? `<tr><td style="padding:6px 0;color:#64748b">Type</td><td style="text-align:right">Incentive</td></tr>`
              : `<tr><td style="padding:6px 0;color:#64748b">Hours Worked</td><td style="text-align:right">${cutoff.hoursWorked.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Rate</td><td style="text-align:right">${formatUsd(cutoff.rateUsd)}/hr</td></tr>`
          }
          <tr><td style="padding:6px 0;color:#64748b">Net Payout</td><td style="text-align:right"><b>${amount}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Salary Date</td><td style="text-align:right">${formatDate(cutoff.arrivalDate, { weekday: "short" })}</td></tr>
        </table>
        <p>Your payslip PDF is attached. It is password protected with the PIN you agreed on.</p>
      </div>`,
    attachments: [
      {
        filename: `KTL-Payslip-${cutoff.periodEnd.slice(0, 10)}.pdf`,
        content: opts.pdf,
      },
    ],
  });

  if (error || !data) return { sent: false, reason: error?.message ?? "Unknown Resend error" };
  return { sent: true, id: data.id };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
