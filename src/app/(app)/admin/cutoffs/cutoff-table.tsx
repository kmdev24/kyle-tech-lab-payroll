"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Download, Loader2, Mail, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminCutoff } from "@/lib/data";
import { formatDate, formatPhp, formatUsd } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
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

  function actions(c: AdminCutoff) {
    const isBusy = busy?.startsWith(c.id);
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        {c.status === "PENDING" ? (
          <Button
            size="sm"
            disabled={isBusy}
            onClick={() =>
              run(
                `${c.id}:recv`,
                () => markReceived(c.id),
                c.kind === "INCENTIVE"
                  ? "Mark this incentive as received? It's 100% yours; nothing is sent to Mom."
                  : "Mark as received? This locks the payout date's FX rate and emails Mom's payslip.",
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
            {c.kind === "CONTRACT" && (
              <Button
                size="icon"
                variant="ghost"
                title="Resend payslip email"
                disabled={isBusy}
                onClick={() => run(`${c.id}:mail`, () => resendPayslip(c.id))}
              >
                {busy === `${c.id}:mail` ? <Loader2 className="animate-spin" /> : <Mail />}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              title="Move back to pending"
              disabled={isBusy}
              onClick={() => run(`${c.id}:pend`, () => markPending(c.id), "Move back to pending?")}
            >
              <RotateCcw />
            </Button>
          </>
        )}
        {c.kind === "CONTRACT" && (
          <Button size="icon" variant="ghost" title="Download payslip (preview)" asChild>
            <a href={`/api/payslip/${c.id}`}>
              <Download />
            </a>
          </Button>
        )}
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
    );
  }

  return (
    <>
      {/* Phones: one card per cutoff */}
      <div className="space-y-3 lg:hidden">
        {cutoffs.map((c) => (
          <div key={c.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">
                  {c.kind === "INCENTIVE" && <Badge className="mr-2">Incentive</Badge>}
                  {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Payout {formatDate(c.payoutDate)}
                  {c.kind === "CONTRACT" && ` · ${c.hoursWorked.toFixed(2)} hrs`}
                </div>
                {c.notes && <div className="truncate text-xs text-muted-foreground">{c.notes}</div>}
              </div>
              <div className="shrink-0 text-right">
                <StatusBadge status={c.status} />
                {c.emailSentAt && <div className="mt-1 text-xs text-muted-foreground">emailed</div>}
              </div>
            </div>
            <div className="grid gap-1 text-sm sm:grid-cols-3 sm:gap-3">
              <MoneyBlock label={c.earnedUsd != null && c.kind === "CONTRACT" ? "Gross (actual)" : "Gross"} usd={c.grossUsd} php={c.grossPhp} />
              <MoneyBlock label="Kyle 70%" usd={c.kyleUsd} php={c.kylePhp} />
              <MoneyBlock label="Mom 30%" usd={c.netUsd} php={c.netPhp} />
            </div>
            <div className="text-xs text-muted-foreground">
              <FxInfo c={c} inline />
            </div>
            {actions(c)}
          </div>
        ))}
        {cutoffs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No cutoffs yet. Add this week&apos;s above.</p>
        )}
      </div>

      {/* Larger screens: table */}
      <div className="hidden lg:block">
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
            {cutoffs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap">
                  {c.kind === "INCENTIVE" && <Badge className="mr-2">Incentive</Badge>}
                  {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                  {c.notes && <div className="max-w-[200px] truncate text-xs text-muted-foreground">{c.notes}</div>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.payoutDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.kind === "INCENTIVE" ? "–" : c.hoursWorked.toFixed(2)}</TableCell>
                <Money usd={c.grossUsd} php={c.grossPhp} note={c.earnedUsd != null && c.kind === "CONTRACT" ? "actual" : undefined} />
                <Money usd={c.kyleUsd} php={c.kylePhp} />
                <Money usd={c.netUsd} php={c.netPhp} />
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  <FxInfo c={c} />
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
                  {actions(c)}
                </TableCell>
              </TableRow>
            ))}
            {cutoffs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No cutoffs yet. Add this week&apos;s above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editing && <EditCutoffDialog cutoff={editing} onClose={() => setEditing(null)} />}
      {paying && payouts[paying] && <PayoutDialog payout={payouts[paying]} onClose={() => setPaying(null)} />}
    </>
  );
}

function FxInfo({ c, inline }: { c: AdminCutoff; inline?: boolean }) {
  const Wrap = inline ? "span" : "div";
  if (c.fxSource === "receipt") {
    return (
      <>
        ₱{c.stripeRate!.toFixed(4)} <Wrap className="text-emerald-300">Stripe receipt</Wrap>
      </>
    );
  }
  return (
    <>
      {c.fxMidRate ? `₱${c.fxMidRate.toFixed(3)}` : "–"} −{c.fxFeePercent}%{" "}
      <Wrap>{c.fxSource === "payout-date" ? "payout date" : "live estimate"}</Wrap>
    </>
  );
}

function MoneyBlock({ label, usd, php }: { label: string; usd: number; php: number | null }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-right tabular-nums sm:text-left">
        <span className="font-medium">{formatUsd(usd)}</span>
        <span className="ml-2 text-xs text-muted-foreground sm:ml-0 sm:block">{php != null ? formatPhp(php) : "–"}</span>
      </div>
    </div>
  );
}

function Money({ usd, php, note }: { usd: number; php: number | null; note?: string }) {
  return (
    <TableCell className="text-right tabular-nums">
      {note && <span className="mr-1 text-[10px] uppercase text-violet-300">{note}</span>}
      {formatUsd(usd)}
      <div className="text-xs text-muted-foreground">{php != null ? formatPhp(php) : "–"}</div>
    </TableCell>
  );
}
