import Link from "next/link";
import { ArrowRight, Banknote, Clock, Home, PiggyBank, TrendingUp, User, Wallet } from "lucide-react";
import type { GoalProgress, getAdminDashboard } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPhp, formatUsd } from "@/lib/utils";
import { FxCard } from "@/components/fx-card";

type Data = Awaited<ReturnType<typeof getAdminDashboard>>;

export function AdminDashboard({ data, goals }: { data: Data; goals: GoalProgress[] }) {
  const { totals, fx, cutoffs } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">$30.00/hr project rate · 70 / 30 split</p>
        </div>
        <Button asChild>
          <Link href="/admin/cutoffs">
            Manage cutoffs <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Gross"
          value={formatUsd(totals.grossUsd)}
          sub={`${formatPhp(totals.grossPhp)} · ${totals.hours.toFixed(2)} hrs`}
          icon={TrendingUp}
          highlight
        />
        <StatCard label="Kyle · 70%" value={formatUsd(totals.kyleUsd)} sub={formatPhp(totals.kylePhp)} icon={User} />
        <StatCard label="Mom · 30%" value={formatUsd(totals.momUsd)} sub={formatPhp(totals.momPhp)} icon={Wallet} />
        <StatCard
          label="Received vs Pending"
          value={`${totals.receivedCount} / ${totals.pendingCount}`}
          sub={`${formatPhp(totals.receivedGrossPhp)} received · ${formatPhp(totals.pendingGrossPhp)} pending`}
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-4 w-4 text-violet-400" /> Savings goals
              </CardTitle>
              <CardDescription>
                Your received share ({formatPhp(totals.keptPhp)}) fills goals in priority order
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/goals">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {goals.map((g) => (
              <div key={g.id} className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{formatPhp(g.savedPhp)}</span> of {formatPhp(g.targetPhp)}
                  </span>
                </div>
                <Progress value={g.percent} />
                <p className="text-xs text-muted-foreground">
                  {g.percent.toFixed(1)}% · {g.percent >= 100 ? "Reached 🎉" : `${formatPhp(Math.max(0, g.targetPhp - g.savedPhp))} to go`}
                </p>
              </div>
            ))}
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No goals yet. <Link href="/admin/goals" className="text-violet-300 underline">Add one</Link>.
              </p>
            )}
          </CardContent>
        </Card>
        <FxCard midRate={fx.midRate} feePercent={fx.feePercent} effectiveRate={fx.effectiveRate} updatedAt={fx.updatedAt} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-violet-400" /> Recent cutoffs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Kyle 70%</TableHead>
                <TableHead className="text-right">Mom 30%</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cutoffs.slice(0, 8).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">
                    {c.kind === "INCENTIVE" && <Badge className="mr-2">Incentive</Badge>}
                    {formatDate(c.periodStart, { year: undefined })} – {formatDate(c.periodEnd)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(c.payoutDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.kind === "INCENTIVE" ? "–" : c.hoursWorked.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(c.grossUsd)}
                    <div className="text-xs text-muted-foreground">{c.grossPhp != null ? formatPhp(c.grossPhp) : "–"}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(c.kyleUsd)}
                    <div className="text-xs text-muted-foreground">{c.kylePhp != null ? formatPhp(c.kylePhp) : "–"}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(c.netUsd)}
                    <div className="text-xs text-muted-foreground">{c.netPhp != null ? formatPhp(c.netPhp) : "–"}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
              {cutoffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No cutoffs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
