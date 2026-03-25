"use client";

import { useState, useMemo, useCallback } from "react";
import { formatDistanceToNow, format, subDays, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  Download,
  X,
  ShoppingBag,
  Truck,
  Phone,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import type { Order, OrderItem, OrderStatus, OrderType } from "@/lib/supabase/types";

// --- Types ---

interface AdminOrderListProps {
  orders: (Order & { restaurants: { name: string } | null })[];
  restaurants: { id: string; name: string }[];
}

// --- Constantes ---

const PAGE_SIZE = 50;

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_preparation", label: "En préparation" },
  { value: "prete", label: "Prête" },
  { value: "en_livraison", label: "En livraison" },
  { value: "livree", label: "Livrée" },
  { value: "recuperee", label: "Récupérée" },
  { value: "annulee", label: "Annulée" },
];

const TYPE_OPTIONS: { value: OrderType | ""; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "emporter", label: "À emporter" },
  { value: "livraison", label: "Livraison" },
];

type DateRange = "today" | "7d" | "30d" | "all";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "all", label: "Tout" },
];

// Couleurs par restaurant — rotation déterministe
const RESTAURANT_COLORS = [
  "bg-violet",
  "bg-blue",
  "bg-green",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function getRestaurantColor(restaurantId: string): string {
  let hash = 0;
  for (let i = 0; i < restaurantId.length; i++) {
    hash = restaurantId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return RESTAURANT_COLORS[Math.abs(hash) % RESTAURANT_COLORS.length];
}

// --- Résumé articles ---

function getItemsSummary(items: OrderItem[]): string {
  if (items.length === 0) return "Aucun article";
  const first2 = items.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`);
  const rest = items.length - 2;
  if (rest > 0) return `${first2.join(", ")} et ${rest} autre${rest > 1 ? "s" : ""}`;
  return first2.join(", ");
}

// --- Composant principal ---

export function AdminOrderList({ orders, restaurants }: AdminOrderListProps) {
  // Filtres
  const [search, setSearch] = useState("");
  const [restoFilter, setRestoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<OrderType | "">("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(0);

  // Lignes expandées
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrage combiné
  const filtered = useMemo(() => {
    let result = orders;

    // Filtre restaurant
    if (restoFilter) {
      result = result.filter((o) => o.restaurant_id === restoFilter);
    }

    // Filtre statut
    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Filtre type
    if (typeFilter) {
      result = result.filter((o) => o.order_type === typeFilter);
    }

    // Filtre date
    if (dateRange !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (dateRange) {
        case "today":
          cutoff = startOfDay(now);
          break;
        case "7d":
          cutoff = startOfDay(subDays(now, 7));
          break;
        case "30d":
          cutoff = startOfDay(subDays(now, 30));
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((o) => isAfter(new Date(o.created_at), cutoff));
    }

    // Recherche texte
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.id.slice(0, 6).toLowerCase().includes(q) ||
          o.restaurants?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, search, restoFilter, statusFilter, typeFilter, dateRange]);

  // Stats chips
  const stats = useMemo(() => {
    const nouvelle = filtered.filter((o) => o.status === "nouvelle").length;
    const enCours = filtered.filter(
      (o) => o.status === "en_preparation" || o.status === "prete" || o.status === "en_livraison"
    ).length;
    const terminees = filtered.filter(
      (o) => o.status === "livree" || o.status === "recuperee"
    ).length;
    const annulees = filtered.filter((o) => o.status === "annulee").length;
    return { total: filtered.length, nouvelle, enCours, terminees, annulees };
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page quand les filtres changent
  const resetPage = useCallback(() => setPage(0), []);

  // Export CSV
  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Aucune commande à exporter");
      return;
    }

    const rows = [
      ["Date", "Restaurant", "Client", "Téléphone", "Type", "Articles", "Total", "Statut"],
    ];

    for (const o of filtered) {
      const items = (o.items as OrderItem[])
        .map((i) => `${i.quantity}x ${i.name}`)
        .join("; ");
      rows.push([
        new Date(o.created_at).toLocaleString("fr-BE"),
        o.restaurants?.name || "",
        o.customer_name || "",
        o.customer_phone || "",
        o.order_type === "livraison" ? "Livraison" : "À emporter",
        items,
        o.total_amount != null ? Number(o.total_amount).toFixed(2) + "€" : "",
        o.status,
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxena-commandes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} commande${filtered.length > 1 ? "s" : ""} exportée${filtered.length > 1 ? "s" : ""}`);
  }

  // Toggle expansion d'une ligne
  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Style commun pour les selects natifs
  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat";

  return (
    <div>
      {/* Stats chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatChip label="Total" count={stats.total} />
        <StatChip label="Nouvelles" count={stats.nouvelle} color="green" pulsing />
        <StatChip label="En cours" count={stats.enCours} color="amber" />
        <StatChip label="Terminées" count={stats.terminees} color="muted" />
        <StatChip label="Annulées" count={stats.annulees} color="red" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Ligne 1 : recherche + selects */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nom, téléphone, ID, restaurant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  resetPage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Restaurant */}
          <select
            value={restoFilter}
            onChange={(e) => {
              setRestoFilter(e.target.value);
              resetPage();
            }}
            className={selectClass}
          >
            <option value="">Tous les restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Statut */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus | "");
              resetPage();
            }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as OrderType | "");
              resetPage();
            }}
            className={selectClass}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ligne 2 : dates + export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Boutons dates */}
          <div className="flex items-center gap-1.5">
            {DATE_RANGES.map((dr) => (
              <Button
                key={dr.value}
                variant={dateRange === dr.value ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDateRange(dr.value);
                  resetPage();
                }}
              >
                {dr.label}
              </Button>
            ))}
          </div>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Liste des commandes */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande"
          description={
            search || restoFilter || statusFilter || typeFilter || dateRange !== "all"
              ? "Aucun résultat avec ces filtres."
              : "Pas encore de commandes."
          }
        />
      ) : (
        <>
          {/* Tableau */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {/* En-tête tableau */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Restaurant</span>
              <span>Client</span>
              <span>Type</span>
              <span>Articles</span>
              <span className="text-right">Total</span>
              <span className="text-center">Statut</span>
              <span className="text-right">Date</span>
            </div>

            {/* Lignes */}
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {paginatedOrders.map((order, i) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    index={i}
                    isExpanded={expandedId === order.id}
                    onToggle={() => toggleExpand(order.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} sur {totalPages} ({filtered.length} commande
                {filtered.length > 1 ? "s" : ""})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="gap-1 text-xs"
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Sous-composants ---

/** Chip de statistique */
function StatChip({
  label,
  count,
  color,
  pulsing,
}: {
  label: string;
  count: number;
  color?: "green" | "amber" | "red" | "muted";
  pulsing?: boolean;
}) {
  const bgMap: Record<string, string> = {
    green: "bg-green/8 text-green border-green/20",
    amber: "bg-amber-500/8 text-amber-600 border-amber-500/20",
    red: "bg-red-500/8 text-red-500 border-red-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  const chipClass = color
    ? bgMap[color]
    : "bg-foreground/5 text-foreground border-border";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${chipClass}`}
    >
      {pulsing && count > 0 && <PulsingDot color="green" size="sm" />}
      {label}
      <span className="font-mono font-bold">{count}</span>
    </span>
  );
}

/** Ligne de commande dans le tableau */
function OrderRow({
  order,
  index,
  isExpanded,
  onToggle,
}: {
  order: Order & { restaurants: { name: string } | null };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const items = (order.items || []) as OrderItem[];
  const isLivraison = order.order_type === "livraison";
  const restaurantColor = getRestaurantColor(order.restaurant_id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      layout
    >
      {/* Ligne principale — cliquable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        {/* Vue desktop */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_1fr_auto_auto_auto] gap-4 items-center">
          {/* Restaurant */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${restaurantColor}`} />
            <span className="text-sm font-medium truncate">
              {order.restaurants?.name || "—"}
            </span>
          </div>

          {/* Client */}
          <div className="min-w-0">
            <span className="text-sm truncate block">
              {order.customer_name || "Client anonyme"}
            </span>
            {order.customer_phone && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {order.customer_phone}
              </span>
            )}
          </div>

          {/* Type */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              isLivraison
                ? "bg-green/10 text-green border-green/20"
                : "bg-blue/10 text-blue border-blue/20"
            }`}
          >
            {isLivraison ? (
              <Truck className="w-3 h-3" />
            ) : (
              <ShoppingBag className="w-3 h-3" />
            )}
            {isLivraison ? "Livraison" : "Emporter"}
          </span>

          {/* Articles résumé */}
          <span className="text-sm text-muted-foreground truncate">
            {getItemsSummary(items)}
          </span>

          {/* Total */}
          <span className="font-mono text-sm font-bold tabular-nums text-right whitespace-nowrap">
            {order.total_amount != null
              ? `${Number(order.total_amount).toFixed(2)}€`
              : "—"}
          </span>

          {/* Statut */}
          <OrderStatusBadge status={order.status} orderType={order.order_type} />

          {/* Date relative */}
          <div className="flex items-center gap-1.5 text-right">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(order.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Vue mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${restaurantColor}`} />
              <span className="text-sm font-medium truncate">
                {order.customer_name || "Client anonyme"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-sm font-bold tabular-nums">
                {order.total_amount != null
                  ? `${Number(order.total_amount).toFixed(2)}€`
                  : "—"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {order.restaurants?.name || "—"}
            </span>
            <OrderStatusBadge status={order.status} orderType={order.order_type} />
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isLivraison
                  ? "bg-green/10 text-green"
                  : "bg-blue/10 text-blue"
              }`}
            >
              {isLivraison ? "Livraison" : "Emporter"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(order.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      </button>

      {/* Détails expandés */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-dashed border-border/60 bg-muted/20">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {/* Articles détaillés */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Articles
                  </h4>
                  <ul className="space-y-1">
                    {items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          <span className="font-mono text-xs text-muted-foreground mr-1">
                            {item.quantity}x
                          </span>
                          {item.name}
                          {item.modifications && item.modifications.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.modifications.join(", ")})
                            </span>
                          )}
                        </span>
                        {item.price != null && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {(item.quantity * item.price).toFixed(2)}€
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Infos client / livraison */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Contact & livraison
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    {order.customer_phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {order.customer_phone}
                        </span>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{order.delivery_address}</span>
                      </div>
                    )}
                    {order.pickup_time && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          Retrait : {order.pickup_time}
                        </span>
                      </div>
                    )}
                    {order.delivery_time_estimate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          Livraison estimée : {order.delivery_time_estimate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions spéciales + méta */}
                <div>
                  {order.special_instructions && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Instructions spéciales
                      </h4>
                      <p className="text-xs text-amber-600 bg-amber-500/8 rounded-md px-3 py-2 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {order.special_instructions}
                      </p>
                    </div>
                  )}
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Détails
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      ID :{" "}
                      <span className="font-mono">
                        {order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      Créée le{" "}
                      {format(new Date(order.created_at), "d MMMM yyyy 'à' HH:mm", {
                        locale: fr,
                      })}
                    </div>
                    {order.updated_at && order.updated_at !== order.created_at && (
                      <div>
                        Modifiée le{" "}
                        {format(new Date(order.updated_at), "d MMMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
