import { Store } from "lucide-react";

export function NoRestaurant() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <Store className="w-7 h-7 text-destructive" />
      </div>
      <h3 className="font-heading text-lg font-semibold mb-1">
        Aucun restaurant associé
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Votre compte n&apos;est pas encore lié à un restaurant. Contactez l&apos;équipe Voxena pour finaliser votre configuration.
      </p>
    </div>
  );
}
