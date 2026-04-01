import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:px-8 lg:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <Skeleton className="h-7 sm:h-8 w-36 sm:w-48 mb-2" />
        <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="w-9 h-9 rounded-xl mb-3" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>

      {/* Charts — masqué sur mobile */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-8">
        <Card className="lg:col-span-2 p-6">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[240px] w-full rounded" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-3/4 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Orders list */}
      <Card className="p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
