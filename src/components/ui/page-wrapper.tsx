"use client";

import { motion } from "framer-motion";

export function PageWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={`p-6 lg:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}
