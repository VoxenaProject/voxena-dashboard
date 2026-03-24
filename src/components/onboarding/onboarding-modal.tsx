"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  Phone,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Sparkles,
    color: "bg-violet/10 text-violet",
    title: "Bienvenue sur Voxena !",
    description:
      "Votre agent vocal IA prend les commandes par téléphone 24h/24. Voici un tour rapide de votre dashboard.",
  },
  {
    icon: ShoppingBag,
    color: "bg-green/10 text-green",
    title: "Commandes en temps réel",
    description:
      "Suivez vos commandes en direct. Quand un client appelle, la commande apparaît instantanément avec une notification sonore.",
  },
  {
    icon: UtensilsCrossed,
    color: "bg-amber-500/10 text-amber-600",
    title: "Gérez votre menu",
    description:
      "Ajoutez vos catégories et articles. L'agent vocal utilisera votre menu pour recommander les plats et prendre les commandes.",
  },
  {
    icon: Settings,
    color: "bg-blue/10 text-blue",
    title: "Paramètres & WhatsApp",
    description:
      "Configurez vos informations et le numéro WhatsApp pour envoyer automatiquement les confirmations de commande aux clients.",
  },
  {
    icon: Phone,
    color: "bg-violet/10 text-violet",
    title: "Activez Voxena",
    description:
      "Utilisez le toggle en haut à droite pour activer ou désactiver l'agent vocal à tout moment. C'est vous qui décidez !",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Vérifier si l'onboarding a déjà été vu
    const seen = localStorage.getItem("voxena-onboarding-done");
    if (!seen) {
      // Petit délai pour laisser la page charger
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleFinish() {
    localStorage.setItem("voxena-onboarding-done", "true");
    setOpen(false);
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleFinish}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card shadow-2xl border border-border overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className={`w-16 h-16 rounded-2xl ${current.color} flex items-center justify-center mx-auto mb-6`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <h2 className="font-heading text-xl font-bold tracking-tight mb-2">
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-violet"
                    : i < step
                    ? "w-1.5 bg-violet/40"
                    : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(step - 1)}
              >
                Retour
              </Button>
            )}
            <Button className="flex-1 gap-1.5" onClick={handleNext}>
              {step < steps.length - 1 ? (
                <>
                  Suivant
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                "C'est parti !"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
