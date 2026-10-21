import QRCode from "qrcode";
import { getAdminDashboard } from "@/lib/data";
import { currentCutoffWeek, toDateInput } from "@/lib/cutoff";
import { withAmount } from "@/lib/qrph";
import { formatDate, formatPhp } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateCutoffForm } from "./create-cutoff-form";
import { CutoffTable, type Payout } from "./cutoff-table";

export const dynamic = "force-dynamic";

export default async function CutoffsPage() {
  const { cutoffs, settings } = await getAdminDashboard();
  const week = currentCutoffWeek();

  // Transfer details for every received cutoff: exact 30% PHP amount + recipient.
  const payouts: Record<string, Payout> = {};
  for (const c of cutoffs) {
    if (c.kind !== "CONTRACT" || c.status !== "RECEIVED" || c.netPhp == null) continue;
    const amount = c.netPhp;
    const copyText = [
      `Bank/Wallet: ${settings.bankName}`,
      `Account Name: ${settings.accountName}`,
      `Account Number: ${settings.accountNumber}`,
      `Amount: ${amount.toFixed(2)}`,
      `Purpose: KTL payout ${formatDate(c.periodStart)} - ${formatDate(c.periodEnd)}`,
    ].join("\n");
    // With Mom's QR Ph string configured, the QR is a real InstaPay QR with the amount
    // pre-filled; otherwise it just carries the transfer details as text.
    const instaPay = settings.qrPhPayload ? withAmount(settings.qrPhPayload, amount) : null;
    const qrDataUrl = await QRCode.toDataURL(instaPay ?? copyText, { margin: 1, width: 280 });
    payouts[c.id] = {
      amountLabel: formatPhp(amount),
      amount: amount.toFixed(2),
      bankName: settings.bankName,
      accountName: settings.accountName,
      accountNumber: settings.accountNumber,
      copyText,
      qrDataUrl,
      isInstaPayQr: Boolean(instaPay),
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cutoffs</h1>
        <p className="text-sm text-muted-foreground">
          Weekly Saturday → Friday. Payout lands the following Wednesday.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New cutoff</CardTitle>
          <CardDescription>
            Pick any day in the week; the Saturday–Friday period and payout date are calculated for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCutoffForm defaultDate={toDateInput(week.periodStart)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CutoffTable cutoffs={cutoffs} payouts={payouts} />
        </CardContent>
      </Card>
    </div>
  );
}
