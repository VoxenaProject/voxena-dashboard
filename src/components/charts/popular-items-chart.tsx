"use client";

import { motion } from "framer-motion";

interface PopularItemsProps {
  items: { name: string; count: number }[];
}

export function PopularItemsChart({ items }: PopularItemsProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Pas encore de données
      </p>
    );
  }

  const maxCount = Math.max(...items.map((i) => i.count));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <span className="text-xs font-mono text-muted-foreground w-4 text-right">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">{item.name}</span>
              <span className="text-xs font-mono text-muted-foreground ml-2">
                {item.count}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    i === 0
                      ? "var(--gradient-violet)"
                      : `rgba(66, 55, 196, ${0.6 - i * 0.1})`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
