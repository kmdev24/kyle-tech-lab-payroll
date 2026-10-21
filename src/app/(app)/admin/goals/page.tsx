import { getAdminDashboard, getSavingsGoals } from "@/lib/data";
import { formatPhp } from "@/lib/utils";
import { GoalsManager } from "./goals-manager";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { totals } = await getAdminDashboard();
  const goals = await getSavingsGoals(totals.keptPhp);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Savings goals</h1>
        <p className="text-sm text-muted-foreground">
          Your received share so far is {formatPhp(totals.keptPhp)} (70% of contracts plus all incentives). It fills
          goals in priority order: priority 1 first, and once a goal is full the rest flows to the next.
        </p>
      </div>
      <GoalsManager goals={goals} />
    </div>
  );
}
