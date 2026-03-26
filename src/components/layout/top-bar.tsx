"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { MessageCircle, X, Send, Loader2, HelpCircle, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface TopBarProps {
  restaurantId?: string | null;
  initialAgentStatus?: string;
}

export function TopBar({ restaurantId, initialAgentStatus = "active" }: TopBarProps) {
  const [agentActive, setAgentActive] = useState(initialAgentStatus === "active");
  const [chatOpen, setChatOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [iconRotating, setIconRotating] = useState(false);
  const rotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lire la préférence de thème au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("voxena-theme");
      setIsDark(saved === "dark" || document.documentElement.classList.contains("dark"));
    } catch {
      // Navigation privée
    }
  }, []);

  // Cleanup du timer de rotation
  useEffect(() => {
    return () => {
      if (rotateTimer.current) clearTimeout(rotateTimer.current);
    };
  }, []);

  // Basculer le thème clair/sombre avec animation
  function toggleTheme() {
    setIconRotating(true);
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    try {
      localStorage.setItem("voxena-theme", newDark ? "dark" : "light");
    } catch {
      // Navigation privée
    }
    rotateTimer.current = setTimeout(() => setIconRotating(false), 500);
  }

  async function handleToggle(checked: boolean) {
    setAgentActive(checked);
    const newStatus = checked ? "active" : "paused";

    if (restaurantId) {
      setToggling(true);
      const res = await fetch("/api/restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: restaurantId, agent_status: newStatus }),
      });
      setToggling(false);

      if (!res.ok) {
        setAgentActive(!checked); // rollback
        toast.error("Erreur lors de la mise à jour");
        return;
      }
    }

    toast(
      checked ? "Agent vocal activé" : "Agent vocal désactivé",
      {
        description: checked
          ? "Les appels sont pris en charge par Voxena"
          : "Les appels ne seront plus pris en charge",
      }
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-3 px-6 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        {/* Toggle Voxena */}
        <div className="flex items-center gap-2.5" data-tour="toggle-voxena">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                agentActive
                  ? "bg-green glow-green-dot"
                  : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {agentActive ? "Voxena actif" : "Voxena en pause"}
            </span>
          </div>
          <Switch
            checked={agentActive}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>

        {/* Séparateur vertical */}
        <div className="w-px h-5 bg-border/50" />

        {/* Relancer le tour */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            try {
              localStorage.removeItem("voxena-tour-done");
              localStorage.removeItem("voxena-tour-step");
            } catch { /* Navigation privée */ }
            window.location.href = "/";
          }}
          title="Relancer le tour guidé"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* Toggle dark mode avec rotation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
          onClick={toggleTheme}
          title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: iconRotating ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </span>
        </Button>

        {/* Bouton support avec pulse subtil */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-9 support-pulse"
          onClick={() => setChatOpen(true)}
          data-tour="support-btn"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Support
        </Button>
      </div>

      {/* Widget chat support */}
      <AnimatePresence>
        {chatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// ── Widget de chat support ──

function ChatWidget({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);

    // Envoyer au endpoint support
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), email: email.trim() }),
      });
      setSent(true);
      toast.success("Message envoyé à l'équipe Voxena");
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 right-6 z-50 w-[360px] rounded-2xl shadow-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-deep text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue" />
          <span className="text-sm font-medium">Support Voxena</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {sent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-5 h-5 text-green" />
            </div>
            <p className="text-sm font-medium mb-1">Message envoyé !</p>
            <p className="text-xs text-muted-foreground">
              Notre équipe vous répondra dans les plus brefs délais.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onClose}
            >
              Fermer
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Une question ? Un problème ? Envoyez-nous un message et nous vous
              répondrons rapidement.
            </p>
            <div>
              <Input
                placeholder="Votre email (optionnel)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Textarea
                placeholder="Décrivez votre question ou problème..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                required
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Envoyer
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
