export default function ReservationsLoading() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="md:hidden px-4 pt-2 pb-4 animate-pulse">
        <div className="flex items-center justify-between mb-3"><div className="h-10 w-10 bg-muted/30 rounded-xl" /><div className="h-5 w-24 bg-muted/30 rounded-lg" /><div className="h-10 w-10 bg-muted/30 rounded-xl" /></div>
        <div className="flex justify-center gap-4 mb-3"><div className="h-4 w-16 bg-muted/20 rounded" /><div className="h-4 w-16 bg-muted/20 rounded" /></div>
        <div className="flex gap-2 mb-4">{[1,2,3,4].map(i => <div key={i} className="h-9 w-24 bg-muted/20 rounded-full flex-shrink-0" />)}</div>
        <div className="space-y-2">{[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-muted/15 rounded-xl" />)}</div>
      </div>
      {/* Desktop skeleton */}
      <div className="hidden md:block p-6 lg:px-8 lg:py-6 animate-pulse">
        <div className="flex justify-between mb-8"><div><div className="h-8 w-40 bg-muted/30 rounded-lg mb-2" /><div className="h-4 w-56 bg-muted/20 rounded-lg" /></div><div className="h-10 w-32 bg-muted/20 rounded-lg" /></div>
        <div className="flex gap-2 mb-6">{[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 bg-muted/15 rounded-full" />)}</div>
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-muted/10 rounded-2xl" />)}</div>
      </div>
    </>
  );
}
