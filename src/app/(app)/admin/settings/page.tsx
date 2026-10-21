import { getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { AccountsCard } from "./accounts-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, accounts] = await Promise.all([
    getSettings(),
    prisma.user.findMany({
      // Admin first. Placeholder accounts without a real email are hidden below.
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Recipient payment details, payslip delivery and FX.</p>
      </div>
      <SettingsForm settings={settings} emailConfigured={emailConfigured} />
      <AccountsCard accounts={accounts.filter((a) => a.email.includes("@"))} />
    </div>
  );
}
