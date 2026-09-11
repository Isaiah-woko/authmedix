import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-paper px-6 py-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}