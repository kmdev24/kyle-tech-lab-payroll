import { CheckCircle2, Clock, Download, Hourglass, Wallet } from "lucide-react";
import type { getViewerDashboard } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPhp, formatUsd } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof getViewerDashboard>>;

// Only receives the viewer projection: hours, $9.00/hr rate, net USD/PHP, status.
export function ViewerDashboard({ name, data }: { name: string; data: Data }) {
  const { totals, cutoffs } = data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi {name} 👋</h1>
        <p className="text-sm text-muted-foreground">Your rate: $9.00 / hour</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Hours Worked" value={totals.hours.toFixed(2)} icon={Hourglass} />
        <StatCard
          label="Net Earnings"
          value={formatPhp(totals.netPhp)}
          sub={formatUsd(totals.netUsd)}
          icon={Wallet}
          highlight
        />
        <StatCard
          label="Received"
          value={formatPhp(totals.receivedPhp)}
          sub={`${totals.receivedCount} cutoff${totals.receivedCount === 1 ? "" : "s"}`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending"
          value={formatPhp(totals.pendingPhp)}
          sub={`${totals.pendingCount} cutoff${totals.pendingCount === 1 ? "" : "s"} · estimate at today's rate`}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My cutoffs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {cutoffs.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                    </div>
                    <div className="text-xs text-muted-foreground">Payout {formatDate(c.payoutDate)}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {c.hoursWorked.toFixed(2)} hrs × {formatUsd(c.rateUsd)}/hr = {formatUsd(c.netUsd)}
                  </div>
                  <div className="text-right font-semibold tabular-nums">
                    {c.netPhp != null ? formatPhp(c.netPhp) : "–"}
                    {!c.fxLocked && <div className="text-xs font-normal text-muted-foreground">estimate</div>}
                  </div>
                </div>
                {c.status === "RECEIVED" && (
                  <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href={`/api/payslip/${c.id}`}>
                      <Download /> Payslip
                    </a>
                  </Button>
                )}
              </div>
            ))}
            {cutoffs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No cutoffs yet.</p>}
          </div>
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cutoff (Sat – Fri)</TableHead>
                <TableHead>Payout date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Net USD</TableHead>
                <TableHead className="text-right">Net PHP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cutoffs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">
                    {c.kind === "INCENTIVE" && <Badge className="mr-2">Incentive</Badge>}
                    {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(c.payoutDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.kind === "INCENTIVE" ? "–" : c.hoursWorked.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.kind === "INCENTIVE" ? "–" : `${formatUsd(c.rateUsd)}/hr`}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(c.netUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {c.netPhp != null ? formatPhp(c.netPhp) : "–"}
                    {!c.fxLocked && <div className="text-xs font-normal text-muted-foreground">estimate</div>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === "RECEIVED" && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/api/payslip/${c.id}`}>
                          <Download /> Payslip
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {cutoffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No cutoffs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
