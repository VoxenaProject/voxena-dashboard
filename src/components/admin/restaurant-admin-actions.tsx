"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pause, Play, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Restaurant } from "@/lib/supabase/types";

export function RestaurantAdminActions({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggleAgent() {
    setLoading(true);
    const newStatus =
      restaurant.agent_status === "active" ? "paused" : "active";
    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, agent_status: newStatus }),
    });

    if (res.ok) {
      toast.success(
        newStatus === "active" ? "Agent activé" : "Agent mis en pause"
      );
      router.refresh();
    } else {
      toast.error("Erreur");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (
      !confirm(
        `Supprimer "${restaurant.name}" ? Cette action est irréversible.`
      )
    )
      return;

    setLoading(true);
    const res = await fetch(`/api/restaurants?id=${restaurant.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Restaurant supprimé");
      router.push("/admin/restaurants");
    } else {
      toast.error("Erreur lors de la suppression");
    }
    setLoading(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleAgent}>
          {restaurant.agent_status === "active" ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Mettre en pause l&apos;agent
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Activer l&apos;agent
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer le restaurant
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
