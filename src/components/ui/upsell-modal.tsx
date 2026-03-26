"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

const advantages = [
  "Prise de commandes vocale intelligente",
  "Réservations avec plan de salle interactif",
  "Agent vocal multi-tâches (commandes + résas)",
  "Historique client et détection des habitués",
];

export function UpsellModal({ isOpen, onClose, feature }: UpsellModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay sombre */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Carte modale */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          >
            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Contenu */}
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block" role="img" aria-label="couronne">
                👑
              </span>
              <h2 className="font-heading text-2xl font-bold text-navy tracking-tight">
                Passez à Voxena Pro
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Débloquez <span className="font-semibold text-violet">{feature}</span> et bien plus
              </p>
            </div>

            {/* Avantages */}
            <ul className="space-y-3 mb-8">
              {advantages.map((advantage) => (
                <li key={advantage} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{advantage}</span>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full bg-violet hover:bg-violet-dark text-white font-medium"
                onClick={() => window.open("mailto:info@voxena.pro", "_blank")}
              >
                Nous contacter
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onClose}
              >
                Plus tard
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
