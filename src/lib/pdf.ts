import PDFDocument from "pdfkit";
import { randomBytes } from "crypto";
import { PAYSLIP_TITLE } from "./constants";
import type { PaymentDestination, ViewerCutoff } from "./data";
import { formatDate, formatUsd } from "./utils";

// The built-in PDF fonts have no peso sign (₱), so amounts use the "PHP" code.
const pdfPhp = (n: number) =>
  `PHP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Builds Mom's payslip. It accepts only the viewer projection (ViewerCutoff),
 * so gross revenue, the $30/hr base rate and Kyle's share cannot end up in it.
 *
 * Encrypted with AES-256 (PDF 1.7 ext 3). Opening requires `password`;
 * the owner password is random, so the document can't be edited.
 */
export function buildPayslipPdf(opts: {
  cutoff: ViewerCutoff;
  destination: PaymentDestination;
  recipientName: string;
  password: string;
}): Promise<Buffer> {
  const { cutoff, destination, recipientName, password } = opts;

  const doc = new PDFDocument({
    size: "A4",
    margin: 56,
    pdfVersion: "1.7ext3",
    userPassword: password || undefined,
    ownerPassword: randomBytes(24).toString("hex"),
    permissions: { printing: "highResolution", copying: true },
    info: { Title: PAYSLIP_TITLE, Author: "KYLE TECH LAB" },
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const accent = "#7c3aed";
  const muted = "#64748b";
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  // Header
  doc.rect(0, 0, doc.page.width, 8).fill(accent);
  doc.moveDown(0.5);
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(16).text(PAYSLIP_TITLE, { align: "left" });
  doc.moveDown(1.2);

  const row = (label: string, value: string, bold = false) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(10.5).fillColor(muted).text(label, left, y, { width: width / 2 });
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fillColor("#0f172a")
      .text(value, left + width / 2, y, { width: width / 2, align: "right" });
    doc.moveDown(0.55);
  };
  const section = (title: string) => {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(accent).text(title.toUpperCase(), left);
    const y = doc.y + 3;
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.6).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.7);
  };

  section("Employee");
  row("Name", recipientName);
  row("Statement No.", cutoff.id.slice(-8).toUpperCase());

  section("Cutoff");
  row("Cutoff Period", `${formatDate(cutoff.periodStart)} - ${formatDate(cutoff.periodEnd)}`);
  row("Payout Date", formatDate(cutoff.payoutDate));
  row("Status", cutoff.status === "RECEIVED" ? "Received" : "Pending");

  section("Earnings");
  row("Hours Worked", cutoff.hoursWorked.toFixed(2));
  row("Hourly Rate", `${formatUsd(cutoff.rateUsd)} / hr`);
  row("Net Payout (USD)", formatUsd(cutoff.netUsd), true);
  row("Net Payout (PHP)", cutoff.netPhp != null ? pdfPhp(cutoff.netPhp) : "-", true);

  section("Payment Destination");
  row("Bank / Wallet", destination.bankName || "-");
  row("Account Name", destination.accountName || "-");
  row("Account Number", destination.accountNumber || "-");

  doc.moveDown(2);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(muted)
    .text(
      `PHP amount reflects the USD to PHP conversion after transfer fees. Generated ${formatDate(new Date())}. This is a system-generated statement.`,
      left,
      doc.y,
      { width, align: "center" },
    );

  doc.end();
  return done;
}
