import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  helperText?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  helperText,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icône avec gradient background circle + animation flottante */}
      <div className="relative mb-5 animate-float">
        <div
          className="absolute inset-0 rounded-2xl opacity-60"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(66,55,196,0.1), rgba(116,163,255,0.05) 70%, transparent 100%)",
            transform: "scale(1.4)",
          }}
        />
        <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center relative">
          <Icon className="w-7 h-7 text-muted-foreground/60" />
        </div>
      </div>
      <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {description}
      </p>
      {helperText && (
        <p className="text-xs text-muted-foreground/50 text-center max-w-sm mt-1.5">
          {helperText}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-5 bg-violet hover:bg-violet/90 text-white shadow-sm btn-lift" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className="mt-5">
          <Button size="sm" className="bg-violet hover:bg-violet/90 text-white shadow-sm btn-lift">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
