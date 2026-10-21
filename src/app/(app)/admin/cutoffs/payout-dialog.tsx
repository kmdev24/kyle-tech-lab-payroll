"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { Payout } from "./cutoff-table";

export function PayoutDialog({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const rows: [string, string, string][] = [
    ["bank", "Bank / Wallet", payout.bankName],
    ["name", "Account name", payout.accountName],
    ["number", "Account number", payout.accountNumber],
    ["amount", "Amount (PHP)", payout.amount],
  ];

  return (
    <Modal title="Payout via UnionBank" onClose={onClose}>
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Send to Mom (30%)</p>
          <p className="text-3xl font-bold text-violet-300 tabular-nums">{payout.amountLabel}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={payout.qrDataUrl} alt="Payout QR" className="h-56 w-56 rounded-lg bg-white p-2" />
          <p className="text-center text-xs text-muted-foreground">
            {payout.isInstaPayQr
              ? "InstaPay QR Ph with the amount pre-filled. Scan it in the UnionBank app (Scan QR)."
              : "QR contains the transfer details as text. Add Mom's QR Ph string in Settings to get a scannable InstaPay QR."}
          </p>
        </div>

        <div className="divide-y rounded-lg border">
          {rows.map(([key, label, value]) => (
            <div key={key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="ml-auto truncate font-medium">{value || "–"}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(key, value)} disabled={!value}>
                {copied === key ? <Check className="text-emerald-400" /> : <Copy />}
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => copy("all", payout.copyText)}>
            {copied === "all" ? <Check /> : <Copy />} Copy all
          </Button>
          <Button asChild>
            <a href="https://online.unionbankph.com" target="_blank" rel="noreferrer">
              <ExternalLink /> Open UnionBank
            </a>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
