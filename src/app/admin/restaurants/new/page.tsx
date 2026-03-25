"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Mail, User, AlertTriangle } from "lucide-react";
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
    // Champs invitation proprietaire
    owner_email: "",
    owner_full_name: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_email.trim() || !form.owner_full_name.trim()) return;

    setLoading(true);

    // 1. Creer le restaurant
    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        owner_name: form.owner_name,
        phone: form.phone,
        address: form.address,
        whatsapp_phone: form.whatsapp_phone,
        agent_id: form.agent_id,
      }),
    });

    if (!res.ok) {
      toast.error("Erreur lors de la creation du restaurant");
      setLoading(false);
      return;
    }

    const restaurant = await res.json();

    // 2. Envoyer l'invitation au proprietaire
    let inviteSuccess = false;
    try {
      const inviteRes = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.owner_email,
          full_name: form.owner_full_name,
          restaurant_id: restaurant.id,
        }),
      });

      if (inviteRes.ok) {
        inviteSuccess = true;
      } else {
        const inviteData = await inviteRes.json();
        console.error("Erreur invitation:", inviteData.error);
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'invitation:", err);
    }

    // 3. Afficher le resultat
    if (inviteSuccess) {
      toast.success(`Restaurant cree ! Invitation envoyee a ${form.owner_email}`);
    } else {
      toast.warning(
        "Restaurant cree mais l'invitation n'a pas pu etre envoyee. Vous pouvez inviter le proprietaire manuellement.",
        { duration: 6000 }
      );
    }

    router.push(`/admin/restaurants/${restaurant.id}`);
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
              <Label htmlFor="owner_name">Nom du proprietaire</Label>
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

        {/* Invitation proprietaire */}
        <Card className="border-violet/20">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet" />
              Invitation proprietaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground -mt-2 mb-2">
              Un compte sera cree et un email d&apos;invitation sera envoye au proprietaire du restaurant.
            </p>
            <div className="space-y-2">
              <Label htmlFor="owner_email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email du proprietaire *
              </Label>
              <Input
                id="owner_email"
                type="email"
                value={form.owner_email}
                onChange={(e) => handleChange("owner_email", e.target.value)}
                placeholder="mario@chezmario.be"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_full_name" className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Nom complet du proprietaire *
              </Label>
              <Input
                id="owner_full_name"
                value={form.owner_full_name}
                onChange={(e) => handleChange("owner_full_name", e.target.value)}
                placeholder="Mario Rossi"
                required
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600">
                Le proprietaire recevra un email avec un mot de passe temporaire pour se connecter au dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+32 2 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">Numero WhatsApp</Label>
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

        <Button
          type="submit"
          disabled={loading || !form.name.trim() || !form.owner_email.trim() || !form.owner_full_name.trim()}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Creation en cours..." : "Creer le restaurant et inviter"}
        </Button>
      </form>
    </div>
  );
}
