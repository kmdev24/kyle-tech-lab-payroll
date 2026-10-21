import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FxCard({
  midRate,
  feePercent,
  effectiveRate,
  updatedAt,
}: {
  midRate: number | null;
  feePercent: number;
  effectiveRate: number | null;
  updatedAt: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-violet-400" /> USD → PHP
        </CardTitle>
        <CardDescription>Stripe → UnionBank payout rate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Live mid-market</span>
          <span className="tabular-nums">{midRate ? `₱${midRate.toFixed(4)}` : "unavailable"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stripe FX fee</span>
          <span className="tabular-nums">−{feePercent.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Effective</span>
          <span className="tabular-nums text-violet-300">{effectiveRate ? `₱${effectiveRate.toFixed(4)}` : "–"}</span>
        </div>
        {updatedAt && <p className="pt-1 text-xs text-muted-foreground">Updated {updatedAt}</p>}
      </CardContent>
    </Card>
  );
}
