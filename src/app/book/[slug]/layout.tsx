import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réserver une table — Voxena",
  description: "Réservez votre table en ligne",
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
