import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  User,
  ShoppingBag,
  Truck,
  Clock,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderActions } from "@/components/orders/order-actions";
import type { Order, OrderItem, OrderEvent } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Récupérer la commande et ses événements
  const [{ data: order }, { data: events }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!order) notFound();

  const typedOrder = order as Order;
  const items = (typedOrder.items || []) as OrderItem[];
  const typedEvents = (events as OrderEvent[]) || [];

  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-4xl" style={{ animation: "fade-in 0.35s ease-out" }}>
      {/* En-tête */}
      <div className="mb-6">
        <Link
          href="/orders"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux commandes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {typedOrder.customer_name || "Client anonyme"}
              </h1>
              <OrderStatusBadge status={typedOrder.status} orderType={typedOrder.order_type} />
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(typedOrder.created_at), "EEEE d MMMM yyyy à HH:mm", {
                locale: fr,
              })}
            </p>
          </div>
          <OrderActions order={typedOrder} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Articles */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">
                        {item.quantity}x {item.name}
                      </p>
                      {item.modifications && item.modifications.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.modifications.join(", ")}
                        </p>
                      )}
                    </div>
                    {item.price != null && (
                      <span className="font-mono text-sm">
                        {(item.quantity * item.price).toFixed(2)}€
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {typedOrder.total_amount != null && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="font-heading font-bold text-lg">
                      {Number(typedOrder.total_amount).toFixed(2)}€
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Instructions spéciales */}
          {typedOrder.special_instructions && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Instructions spéciales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {typedOrder.special_instructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {typedOrder.transcript && typedOrder.transcript.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Transcription de l&apos;appel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {typedOrder.transcript.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        msg.role === "agent" ? "" : "flex-row-reverse"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                          msg.role === "agent"
                            ? "bg-violet/10 text-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-[10px] font-mono text-muted-foreground mb-0.5 uppercase">
                          {msg.role === "agent" ? "Voxena" : "Client"}
                        </p>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Infos client */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                {typedOrder.customer_name || "Non renseigné"}
              </div>
              {typedOrder.customer_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {typedOrder.customer_phone}
                </div>
              )}
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                {typedOrder.order_type === "livraison" ? (
                  <>
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Livraison
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    À emporter
                  </>
                )}
              </div>
              {typedOrder.pickup_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Retrait : {typedOrder.pickup_time}
                </div>
              )}
              {typedOrder.delivery_address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {typedOrder.delivery_address}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline events={typedEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
