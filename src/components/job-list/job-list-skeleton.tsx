import { JobCardSkeleton } from "@/components/job-card/job-card-skeleton";

type JobListSkeletonProps = {
  count: number;
};

export function JobListSkeleton({ count }: JobListSkeletonProps) {
  return (
    <ul aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <JobCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
