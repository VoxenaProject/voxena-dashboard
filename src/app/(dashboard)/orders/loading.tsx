import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function OrdersLoading() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:px-8 lg:py-6">
      <div className="mb-8">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-96 rounded-lg mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 mb-2" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
