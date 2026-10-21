"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Download, Loader2, Mail, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminCutoff } from "@/lib/data";
import { formatDate, formatPhp, formatUsd } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCutoff, markPending, markReceived, resendPayslip, type ActionResult } from "../actions";
import { EditCutoffDialog } from "./edit-cutoff-dialog";
import { PayoutDialog } from "./payout-dialog";

export type Payout = {
  amountLabel: string;
  amount: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  copyText: string;
  qrDataUrl: string;
  isInstaPayQr: boolean;
};

export function CutoffTable({ cutoffs, payouts }: { cutoffs: AdminCutoff[]; payouts: Record<string, Payout> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminCutoff | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  function run(key: string, fn: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(key);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      (res.ok ? toast.success : toast.error)(res.message);
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Payout</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Kyle 70%</TableHead>
            <TableHead className="text-right">Mom 30%</TableHead>
            <TableHead>FX</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cutoffs.map((c) => {
            const isBusy = busy?.startsWith(c.id);
            return (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                  {c.notes && <div className="max-w-[200px] truncate text-xs text-muted-foreground">{c.notes}</div>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.payoutDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.hoursWorked.toFixed(2)}</TableCell>
                <Money usd={c.grossUsd} php={c.grossPhp} />
                <Money usd={c.kyleUsd} php={c.kylePhp} />
                <Money usd={c.netUsd} php={c.netPhp} />
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {c.fxMidRate ? `₱${c.fxMidRate.toFixed(3)}` : "–"} −{c.fxFeePercent}%
                  <div>{c.fxLocked ? "locked" : "live"}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                  {c.emailSentAt && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> emailed
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1">
                    {c.status === "PENDING" ? (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          run(
                            `${c.id}:recv`,
                            () => markReceived(c.id),
                            "Mark as received? This locks today's FX rate and emails Mom's payslip.",
                          )
                        }
                      >
                        {busy === `${c.id}:recv` ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                        Received
                      </Button>
                    ) : (
                      <>
                        {payouts[c.id] && (
                          <Button size="sm" onClick={() => setPaying(c.id)}>
                            <Send /> Payout via UnionBank
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Resend payslip email"
                          disabled={isBusy}
                          onClick={() => run(`${c.id}:mail`, () => resendPayslip(c.id))}
                        >
                          {busy === `${c.id}:mail` ? <Loader2 className="animate-spin" /> : <Mail />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Move back to pending"
                          disabled={isBusy}
                          onClick={() =>
                            run(`${c.id}:pend`, () => markPending(c.id), "Move back to pending? The locked FX rate is cleared.")
                          }
                        >
                          <RotateCcw />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" title="Download payslip (preview)" asChild>
                      <a href={`/api/payslip/${c.id}`}>
                        <Download />
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(c)}>
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      className="text-red-400 hover:text-red-300"
                      disabled={isBusy}
                      onClick={() => run(`${c.id}:del`, () => deleteCutoff(c.id), "Delete this cutoff permanently?")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {cutoffs.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                No cutoffs yet. Add this week&apos;s above.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editing && <EditCutoffDialog cutoff={editing} onClose={() => setEditing(null)} />}
      {paying && payouts[paying] && <PayoutDialog payout={payouts[paying]} onClose={() => setPaying(null)} />}
    </>
  );
}

function Money({ usd, php }: { usd: number; php: number | null }) {
  return (
    <TableCell className="text-right tabular-nums">
      {formatUsd(usd)}
      <div className="text-xs text-muted-foreground">{php != null ? formatPhp(php) : "–"}</div>
    </TableCell>
  );
}
