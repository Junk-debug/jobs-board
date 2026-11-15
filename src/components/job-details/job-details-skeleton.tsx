import { Skeleton } from "@/components/ui/skeleton";

const FACT_COUNT = 6;
const DESCRIPTION_LINE_COUNT = 6;

export function JobDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="size-10 rounded-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: FACT_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: DESCRIPTION_LINE_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
