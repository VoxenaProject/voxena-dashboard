"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Couleurs des confettis ──
const CONFETTI_COLORS = [
  "#4237C4", "#74a3ff", "#1a9a5a", "#34d399",
  "#f59e0b", "#fbbf24", "#7C3AED", "#ec4899",
];

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  delay: number;
  size: number;
}

// ── Hook pour utiliser l'animation de succès ──
export function useSuccessAnimation() {
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback((withConfetti = false) => {
    // Nettoyer le timeout précédent si on retrigger
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setShowConfetti(withConfetti);
    setVisible(true);

    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setShowConfetti(false);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { visible, showConfetti, trigger };
}

// ── Composant principal ──
interface SuccessAnimationProps {
  visible: boolean;
  showConfetti?: boolean;
  size?: number;
  color?: string;
  className?: string;
}

export function SuccessAnimation({
  visible,
  showConfetti = false,
  size = 48,
  color = "#1a9a5a",
  className = "",
}: SuccessAnimationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (visible && showConfetti) {
      const newParticles: ConfettiParticle[] = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 120,
        y: -(Math.random() * 40 + 20),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 0.2,
        size: Math.random() * 4 + 2,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [visible, showConfetti]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={`relative inline-flex items-center justify-center ${className}`}
        >
          {/* Checkmark SVG animé */}
          <svg
            width={size}
            height={size}
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cercle */}
            <circle
              cx="26"
              cy="26"
              r="24"
              stroke={color}
              strokeWidth="2.5"
              fill="none"
              className="success-circle"
            />
            {/* Check */}
            <path
              d="M16 26L23 33L36 20"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="success-check"
            />
          </svg>

          {/* Confettis */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0,
              }}
              animate={{
                opacity: 0,
                x: p.x,
                y: p.y + 60,
                scale: 0,
                rotate: p.rotation + 720,
              }}
              transition={{
                duration: 1,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.size > 4 ? "1px" : "50%",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Inline success (petit check qui apparaît à la place d'un bouton) ──
interface InlineSuccessProps {
  visible: boolean;
  color?: string;
}

export function InlineSuccess({ visible, color = "#1a9a5a" }: InlineSuccessProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="inline-flex items-center justify-center"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="26"
              cy="26"
              r="24"
              stroke={color}
              strokeWidth="3"
              fill="none"
              className="success-circle"
            />
            <path
              d="M16 26L23 33L36 20"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="success-check"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Flash overlay pour les cartes (confirmation/status change) ──
interface StatusFlashProps {
  active: boolean;
  color?: string;
}

export function StatusFlash({ active, color = "rgba(26, 154, 90, 0.08)" }: StatusFlashProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{ backgroundColor: color }}
        />
      )}
    </AnimatePresence>
  );
}
