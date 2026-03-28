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
      {/* Icône dans un cercle simple */}
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-medium mt-4">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className="mt-4">
          <Button variant="outline" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
