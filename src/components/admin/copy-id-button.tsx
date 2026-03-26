"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Bouton pour copier l'ID du restaurant (utilisé dans la page admin détail)
export function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer mt-0.5 group"
      title="Cliquer pour copier l'ID"
    >
      ID : {id}
      {copied ? (
        <Check className="w-3 h-3 text-green" />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
