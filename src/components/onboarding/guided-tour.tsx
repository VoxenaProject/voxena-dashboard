"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";

interface TourStep {
  target: string;
  title: string;
  description: string;
  page: string; // sur quelle page est l'élément
}

const tourSteps: TourStep[] = [
  {
    target: "sidebar-nav",
    title: "Votre espace de travail",
    description:
      "Naviguez entre le tableau de bord, les commandes, votre menu et les paramètres.",
    page: "/",
  },
  {
    target: "toggle-voxena",
    title: "Contrôlez votre agent vocal",
    description:
      "Activez ou désactivez Voxena à tout moment. Quand il est actif, les appels sont pris en charge automatiquement 24h/24.",
    page: "/",
  },
  {
    target: "kpi-cards",
    title: "Vos chiffres clés",
    description:
      "Commandes, revenus, panier moyen — tout est mis à jour en direct avec les tendances par rapport à hier.",
    page: "/",
  },
  {
    target: "recent-orders",
    title: "Commandes en temps réel",
    description:
      "Quand un client appelle, sa commande apparaît ici instantanément. Vous recevez aussi une alerte sonore.",
    page: "/",
  },
  {
    target: "orders-pipeline",
    title: "Gérez le flux de commandes",
    description:
      "Acceptez, préparez et terminez chaque commande en un clic. Le type (livraison ou à emporter) et l'heure estimée sont toujours visibles.",
    page: "/orders",
  },
  {
    target: "menu-categories",
    title: "Configurez votre menu",
    description:
      "Ajoutez vos catégories et articles. Vous pouvez aussi importer un menu depuis un PDF. L'agent vocal l'utilisera pour prendre les commandes.",
    page: "/menu",
  },
  {
    target: "support-btn",
    title: "On est là pour vous",
    description:
      "Une question ? Un souci ? Envoyez-nous un message, on répond rapidement.",
    page: "/menu",
  },
];

export function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Restaurer l'état du tour depuis localStorage (survit aux navigations)
  useEffect(() => {
    const done = localStorage.getItem("voxena-tour-done");
    if (done) return;

    const savedStep = localStorage.getItem("voxena-tour-step");
    if (savedStep !== null) {
      // Tour en cours — reprendre
      setStep(parseInt(savedStep));
      setActive(true);
    } else {
      // Premier lancement — démarrer après un délai
      const timer = setTimeout(() => {
        localStorage.setItem("voxena-tour-step", "0");
        setActive(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Trouver l'élément et scroll vers lui
  const findAndScrollToTarget = useCallback(() => {
    if (!active) return;
    const current = tourSteps[step];
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      // Scroll l'élément dans le viewport
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      // Attendre le scroll puis calculer le rect
      setTimeout(() => {
        setRect(el.getBoundingClientRect());
      }, 350);
    } else {
      setRect(null);
    }
  }, [active, step]);

  // Naviguer vers la bonne page si nécessaire, puis trouver l'élément avec retry
  useEffect(() => {
    if (!active) return;
    const current = tourSteps[step];

    if (pathname !== current.page) {
      router.push(current.page);
    }

    // Retry jusqu'à trouver l'élément (max 3s)
    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        clearInterval(interval);
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        setTimeout(() => {
          setRect(el.getBoundingClientRect());
        }, 300);
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [active, step, pathname, router]);

  // Recalculer au resize
  useEffect(() => {
    if (!active) return;
    const handleResize = () => findAndScrollToTarget();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, findAndScrollToTarget]);

  function goToStep(newStep: number) {
    setStep(newStep);
    localStorage.setItem("voxena-tour-step", String(newStep));
  }

  function handleNext() {
    if (step < tourSteps.length - 1) {
      goToStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handlePrev() {
    if (step > 0) goToStep(step - 1);
  }

  function handleFinish() {
    localStorage.setItem("voxena-tour-done", "true");
    localStorage.removeItem("voxena-tour-step");
    setActive(false);
    // Revenir au dashboard
    if (pathname !== "/") router.push("/");
  }

  if (!active || !rect) return null;

  const current = tourSteps[step];
  const padding = 8;
  const bubbleW = 340;
  const bubbleH = 190; // hauteur estimée
  const gap = 14;

  // Déterminer la meilleure position pour la bulle (auto)
  const spaceBelow = window.innerHeight - (rect.bottom + padding);
  const spaceAbove = rect.top - padding;
  const spaceRight = window.innerWidth - (rect.right + padding);
  const showBelow = spaceBelow > bubbleH + gap;
  const showAbove = spaceAbove > bubbleH + gap;
  const showRight = spaceRight > bubbleW + gap && !showBelow && !showAbove;

  let bubbleTop: number;
  let bubbleLeft: number;
  let arrowSide: "top" | "bottom" | "left";

  if (showBelow) {
    bubbleTop = rect.bottom + padding + gap;
    bubbleLeft = rect.left + rect.width / 2 - bubbleW / 2;
    arrowSide = "top";
  } else if (showAbove) {
    bubbleTop = rect.top - padding - gap - bubbleH;
    bubbleLeft = rect.left + rect.width / 2 - bubbleW / 2;
    arrowSide = "bottom";
  } else {
    // Right
    bubbleTop = rect.top + rect.height / 2 - bubbleH / 2;
    bubbleLeft = rect.right + padding + gap;
    arrowSide = "left";
  }

  // Clamper dans le viewport
  bubbleLeft = Math.max(12, Math.min(bubbleLeft, window.innerWidth - bubbleW - 12));
  bubbleTop = Math.max(12, Math.min(bubbleTop, window.innerHeight - bubbleH - 12));

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Overlay avec trou découpé */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleFinish}
        />
      </svg>

      {/* Glow ring */}
      <div
        className="absolute rounded-xl ring-2 ring-violet/50 pointer-events-none transition-all duration-500"
        style={{
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />

      {/* Bulle */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: arrowSide === "bottom" ? -8 : 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute z-10"
          style={{ top: bubbleTop, left: bubbleLeft, width: bubbleW }}
        >
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden relative">
            {/* Arrow */}
            {arrowSide === "top" && (
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-border rotate-45" />
            )}
            {arrowSide === "bottom" && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
            )}
            {arrowSide === "left" && (
              <div className="absolute -left-1.5 top-8 w-3 h-3 bg-card border-l border-b border-border rotate-45" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet/10 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-violet" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {step + 1} sur {tourSteps.length}
                </span>
              </div>
              <button
                onClick={handleFinish}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu */}
            <div className="px-5 py-3">
              <h3 className="font-heading font-semibold text-[15px] mb-1">
                {current.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <div className="flex gap-1">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-5 bg-violet"
                        : i < step
                        ? "w-1.5 bg-violet/30"
                        : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handlePrev}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" className="h-8 gap-1" onClick={handleNext}>
                  {step < tourSteps.length - 1 ? (
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
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
