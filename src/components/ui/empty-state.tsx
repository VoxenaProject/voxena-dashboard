import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className="mt-5">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
