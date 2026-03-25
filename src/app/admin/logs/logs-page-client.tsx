"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Terminal,
  PackagePlus,
  MessageCircle,
  Webhook,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentLog, Restaurant } from "@/lib/supabase/types";

// Types pour les logs enrichis avec le nom du restaurant
type LogWithRestaurant = AgentLog & { restaurants: { name: string } | null };

// Types d'événements pour le filtre
const EVENT_TYPES = [
  { value: "all", label: "Tous les types" },
  { value: "webhook_received", label: "Webhook reçu" },
  { value: "order_created", label: "Commande créée" },
  { value: "server_tool_call", label: "Server tool call" },
  { value: "error", label: "Erreur" },
  { value: "support_message", label: "Message support" },
] as const;

// Plages de dates
const DATE_RANGES = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7days", label: "7 jours" },
  { value: "30days", label: "30 jours" },
  { value: "all", label: "Tout" },
] as const;

// Nombre de logs par page
const PAGE_SIZE = 50;

// Icônes par type d'événement
const eventIconMap: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  webhook_received: Webhook,
  server_tool_call: Terminal,
  order_created: PackagePlus,
  support_message: MessageCircle,
};

// Couleurs de bordure gauche par type
const borderColorMap: Record<string, string> = {
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  webhook_received: "border-l-blue-500",
  server_tool_call: "border-l-blue-500",
  order_created: "border-l-green-500",
  support_message: "border-l-violet-500",
};

// Couleurs d'icône par type
const iconColorMap: Record<string, string> = {
  error: "text-red-500",
  warning: "text-amber-500",
  webhook_received: "text-blue-500",
  server_tool_call: "text-blue-500",
  order_created: "text-green-500",
  support_message: "text-violet-500",
};

// Couleurs de badge par type
const badgeClassMap: Record<string, string> = {
  error: "bg-red-500/10 text-red-600 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  webhook_received: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  server_tool_call: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  order_created: "bg-green-500/10 text-green-600 border-green-500/20",
  support_message: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

// Formater le temps relatif en français
function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "il y a quelques secondes";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return "hier";
  if (diffDays < 30) return `il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
}

// Filtrer par plage de dates
function filterByDateRange(dateStr: string, range: string): boolean {
  if (range === "all") return true;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === "today") return diffDays < 1;
  if (range === "7days") return diffDays < 7;
  if (range === "30days") return diffDays < 30;
  return true;
}

// Composant pour une entrée de log individuelle
function LogEntry({
  log,
  onFilterByConversation,
}: {
  log: LogWithRestaurant;
  onFilterByConversation: (convId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const Icon = eventIconMap[log.event_type] || Terminal;
  const borderColor = borderColorMap[log.event_type] || "border-l-gray-400";
  const iconColor = iconColorMap[log.event_type] || "text-muted-foreground";
  const badgeClass = badgeClassMap[log.event_type] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`border-l-4 ${borderColor} rounded-lg bg-card border border-border p-4 hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start gap-3">
        {/* Icône */}
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Ligne du haut : restaurant + badge + timestamp */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {log.restaurants?.name && (
              <span className="text-sm font-medium text-foreground">
                {log.restaurants.name}
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] font-mono ${badgeClass}`}
            >
              {log.event_type}
            </Badge>
            <span className="text-[11px] text-muted-foreground ml-auto whitespace-nowrap">
              {relativeTime(log.created_at)}
            </span>
          </div>

          {/* Conversation ID */}
          {log.conversation_id && (
            <button
              onClick={() => onFilterByConversation(log.conversation_id!)}
              className="text-xs text-muted-foreground font-mono truncate hover:text-foreground transition-colors cursor-pointer mb-1 block"
              title="Cliquer pour filtrer par cette conversation"
            >
              conv: {log.conversation_id}
            </button>
          )}

          {/* Message d'erreur */}
          {log.error_message && (
            <p className="text-sm text-red-500 mt-1">{log.error_message}</p>
          )}

          {/* Payload expandable */}
          {log.payload && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {expanded ? "Masquer" : "Voir"} le payload
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.pre
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 p-3 bg-muted rounded-md text-[11px] font-mono overflow-x-auto max-h-60 overflow-y-auto"
                  >
                    {JSON.stringify(log.payload, null, 2)}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function LogsPageClient({
  logs,
  restaurants,
}: {
  logs: LogWithRestaurant[];
  restaurants: Pick<Restaurant, "id" | "name">[];
}) {
  // Filtres
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Logs filtrés
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtre par restaurant
      if (restaurantFilter !== "all" && log.restaurant_id !== restaurantFilter)
        return false;

      // Filtre par type d'événement
      if (eventTypeFilter !== "all" && log.event_type !== eventTypeFilter)
        return false;

      // Filtre par plage de dates
      if (!filterByDateRange(log.created_at, dateRange)) return false;

      // Recherche par conversation_id ou error_message
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchConv = log.conversation_id?.toLowerCase().includes(q);
        const matchError = log.error_message?.toLowerCase().includes(q);
        if (!matchConv && !matchError) return false;
      }

      return true;
    });
  }, [logs, restaurantFilter, eventTypeFilter, dateRange, searchQuery]);

  // Logs visibles (pagination client)
  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLogs.length;

  // Remettre la pagination à zéro quand les filtres changent
  const resetPagination = () => setVisibleCount(PAGE_SIZE);

  // Clic sur un conversation_id pour filtrer
  const handleFilterByConversation = (convId: string) => {
    setSearchQuery(convId);
    resetPagination();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-6 lg:p-8"
    >
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Logs agents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historique des événements des agents vocaux
        </p>
      </div>

      {/* Barre de filtres */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtre restaurant */}
            <Select
              value={restaurantFilter}
              onValueChange={(v) => {
                setRestaurantFilter(v ?? "all");
                resetPagination();
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les restaurants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les restaurants</SelectItem>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre type d'événement */}
            <Select
              value={eventTypeFilter}
              onValueChange={(v) => {
                setEventTypeFilter(v ?? "all");
                resetPagination();
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre plage de dates */}
            <div className="flex items-center gap-1">
              {DATE_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={dateRange === range.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateRange(range.value);
                    resetPagination();
                  }}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Recherche */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par conversation ID ou erreur..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  resetPagination();
                }}
                className="pl-8"
              />
            </div>
          </div>

          {/* Compteur de résultats */}
          <div className="mt-3 text-xs text-muted-foreground">
            {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}{" "}
            trouvé{filteredLogs.length !== 1 ? "s" : ""}
            {filteredLogs.length !== logs.length && ` sur ${logs.length}`}
          </div>
        </CardContent>
      </Card>

      {/* Liste de logs ou état vide */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Aucun log trouvé</p>
            <p className="text-sm mt-1">
              Essayez de modifier vos filtres pour voir plus de résultats.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleLogs.map((log) => (
              <LogEntry
                key={log.id}
                log={log}
                onFilterByConversation={handleFilterByConversation}
              />
            ))}
          </AnimatePresence>

          {/* Bouton "Voir plus" */}
          {hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-4"
            >
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Voir plus ({filteredLogs.length - visibleCount} restant
                {filteredLogs.length - visibleCount !== 1 ? "s" : ""})
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
