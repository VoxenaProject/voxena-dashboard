"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/**
 * Wrapper qui anime le contenu à chaque changement de route.
 * Fade-in rapide (150ms) pour donner une sensation de fluidité.
 * Mobile only — sur desktop la navigation est déjà rapide.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setVisible(false);
      // Micro délai pour le fade-out, puis fade-in
      const timer = setTimeout(() => {
        setVisible(true);
        prevPath.current = pathname;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <div
      className="transition-opacity duration-150 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
