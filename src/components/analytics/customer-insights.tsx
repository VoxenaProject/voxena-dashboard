"use client";

import { motion } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import type { CustomerStats } from "@/lib/dashboard/analytics-stats";

interface Props {
  data: CustomerStats;
}

function StatBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    no_show: "bg-red-500/10 text-red-600",
    recidiviste: "bg-red-700/10 text-red-700",
    vip: "bg-amber-500/10 text-amber-600",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[tag] || "bg-muted text-muted-foreground"}`}>
      {tag}
    </span>
  );
}

export function CustomerInsightsPanel({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Total clients" value={data.totalCustomers} icon={Users} color="bg-violet/10 text-violet" />
        <StatBadge label="Nouveaux" value={data.newCustomers} icon={UserPlus} color="bg-green/10 text-green" />
        <StatBadge label="Fidèles" value={data.returningCustomers} icon={UserCheck} color="bg-blue/10 text-blue" />
      </div>

      {/* Top clients */}
      {data.topCustomers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Top clients (par dépense)</h4>
          <div className="space-y-1">
            {data.topCustomers.map((customer, i) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{customer.name || customer.phone}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {customer.visit_count} visite{customer.visit_count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {customer.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                  <span className="text-sm font-semibold tabular-nums">{customer.total_spent.toFixed(0)}€</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Clients no-show */}
      {data.noShowCustomers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <UserX className="w-3 h-3" />
            Clients no-show
          </h4>
          <div className="space-y-1">
            {data.noShowCustomers.map((customer, i) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{customer.name || customer.phone}</p>
                    <p className="text-[11px] text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {customer.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {data.totalCustomers === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun client enregistré</p>
          <p className="text-xs mt-1">Les clients seront ajoutés automatiquement via les commandes et réservations</p>
        </div>
      )}
    </div>
  );
}
