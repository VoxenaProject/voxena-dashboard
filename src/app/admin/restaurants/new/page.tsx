"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    address: "",
    whatsapp_phone: "",
    agent_id: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Restaurant créé");
      router.push(`/admin/restaurants/${data.id}`);
    } else {
      toast.error("Erreur lors de la création");
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/admin/restaurants"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux restaurants
      </Link>

      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Nouveau restaurant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Onboarder un nouveau restaurant sur Voxena
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du restaurant *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Chez Mario"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Nom du propriétaire</Label>
              <Input
                id="owner_name"
                value={form.owner_name}
                onChange={(e) => handleChange("owner_name", e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Rue de la Loi 42, 1000 Bruxelles"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+32 2 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">Numéro WhatsApp</Label>
              <Input
                id="whatsapp_phone"
                type="tel"
                value={form.whatsapp_phone}
                onChange={(e) =>
                  handleChange("whatsapp_phone", e.target.value)
                }
                placeholder="+32..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Agent vocal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent_id">Agent ID (ElevenLabs)</Label>
              <Input
                id="agent_id"
                value={form.agent_id}
                onChange={(e) => handleChange("agent_id", e.target.value)}
                placeholder="ID de l'agent ElevenLabs"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading || !form.name.trim()} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Créer le restaurant
        </Button>
      </form>
    </div>
  );
}
