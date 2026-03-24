import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function MenuLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex justify-end mb-6">
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
