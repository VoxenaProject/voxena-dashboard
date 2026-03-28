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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-6 lg:px-10 lg:py-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}
