"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="font-heading text-lg font-semibold mb-1">
            Une erreur est survenue
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            {this.state.error?.message || "Erreur inattendue"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
