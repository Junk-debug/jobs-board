import { Skeleton, TextSkeleton } from "@/components/ui/skeleton";
import { JobCardLayout } from "./job-card-layout";

export function JobCardSkeleton() {
  return (
    <JobCardLayout
      title={<TextSkeleton className="w-3/4" />}
      meta={<TextSkeleton className="w-48" />}
      pay={{
        primary: <TextSkeleton className="w-24" />,
        secondary: <TextSkeleton className="w-20" />,
      }}
      action={<Skeleton className="size-10 rounded-full" />}
    />
  );
}
