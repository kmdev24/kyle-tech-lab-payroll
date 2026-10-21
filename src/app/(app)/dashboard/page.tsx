import { requireUser } from "@/lib/auth";
import { getAdminDashboard, getSavingsGoals, getViewerDashboard } from "@/lib/data";
import { AdminDashboard } from "./admin-dashboard";
import { ViewerDashboard } from "./viewer-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // The role decides which query runs. A VIEWER session never executes the
  // admin query, so gross/70% figures are never loaded or sent to the browser.
  if (user.role === "ADMIN") {
    const data = await getAdminDashboard();
    return <AdminDashboard data={data} goals={await getSavingsGoals(data.totals.keptPhp)} />;
  }
  return <ViewerDashboard name={user.name} data={await getViewerDashboard()} />;
}
