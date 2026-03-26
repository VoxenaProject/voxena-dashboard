import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { CopyIdButton } from "@/components/admin/copy-id-button";
import { Badge } from "@/components/ui/badge";
import { RestaurantAdminActions } from "@/components/admin/restaurant-admin-actions";
import { RestaurantTabs } from "@/components/admin/restaurant-tabs";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { Restaurant, Order, UsageRecord } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminRestaurantDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    { data: restaurant },
    { data: orders },
    { data: menus },
    { data: logs },
    usageResult,
  ] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", id).single(),
    supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("menus")
      .select("name, menu_items(name, price, is_available)")
      .eq("restaurant_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("agent_logs")
      .select("id, event_type, error_message, created_at, conversation_id, payload")
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Récupérer les 12 derniers mois d'usage (table peut ne pas exister)
    supabase
      .from("usage_records")
      .select("*")
      .eq("restaurant_id", id)
      .order("month", { ascending: false })
      .limit(12)
      .then((res) => {
        // Si la table n'existe pas, retourner un tableau vide
        if (res.error) return { data: [] };
        return res;
      }),
  ]);

  const usageRecords = usageResult.data;

  if (!restaurant) notFound();

  const resto = restaurant as Restaurant;

  return (
    <PageWrapper>
      <Link
        href="/admin/restaurants"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux restaurants
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {resto.name}
            </h1>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                resto.agent_status === "active"
                  ? "bg-green"
                  : resto.agent_status === "error"
                  ? "bg-red-500"
                  : "bg-amber-500"
              }`}
            />
            <Badge variant="outline" className="text-xs capitalize">
              {resto.agent_status}
            </Badge>
            <SubscriptionBadge status={resto.subscription_status} />
            {resto.telnyx_phone && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {resto.telnyx_phone}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Créé le {format(new Date(resto.created_at), "d MMMM yyyy", { locale: fr })}
          </p>
          <CopyIdButton id={resto.id} />
        </div>
        <RestaurantAdminActions restaurant={resto} />
      </div>

      <RestaurantTabs
        restaurant={resto}
        orders={(orders as Order[]) || []}
        menus={(menus || []) as { name: string; menu_items: { name: string; price: number; is_available: boolean }[] }[]}
        logs={(logs || []) as { id: string; event_type: string; error_message: string | null; created_at: string; conversation_id: string | null; payload: Record<string, unknown> | null }[]}
        usageRecords={(usageRecords as UsageRecord[]) || []}
      />
    </PageWrapper>
  );
}
