import { createServiceClient } from "@/lib/supabase/server";
import { getBillingStats } from "@/lib/dashboard/billing-stats";
import { FinancesDashboardContent } from "@/components/admin/finances-dashboard-content";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const supabase = createServiceClient();
  const stats = await getBillingStats(supabase);

  return <FinancesDashboardContent stats={stats} />;
}
