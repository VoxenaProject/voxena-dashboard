"use client";

import { motion } from "framer-motion";

// Variantes de stagger pour le contenu de page
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export { childVariants as pageChildVariants };

export function PageWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      {/* Gradient overlay subtil en haut de page */}
      <div
        className="absolute top-0 left-0 right-0 h-[100px] pointer-events-none z-0"
        style={{
          background: "linear-gradient(180deg, var(--background) 0%, transparent 100%)",
          opacity: 0.6,
        }}
      />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`p-6 lg:px-8 lg:py-6 relative z-[1] ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}
