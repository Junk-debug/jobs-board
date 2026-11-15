import { ErrorState } from "@/components/error-state";
import { JobList } from "@/components/job-list/job-list";
import { JobListSkeleton } from "@/components/job-list/job-list-skeleton";
import { MessageState } from "@/components/message-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/queries/jobs.queries";

const numberFormat = new Intl.NumberFormat("en-CH");

const INITIAL_SKELETON_COUNT = 6;

type JobsQuery = ReturnType<typeof useJobs>;

type JobsHeaderProps = {
  total: number | undefined;
  isLoading: boolean;
};

function JobsHeader({ total, isLoading }: JobsHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Open jobs
      </h1>
      <div className="min-h-[1lh] text-sm text-muted-foreground">
        {isLoading && <Skeleton className="my-[0.125lh] h-[0.75lh] w-32" />}
        {total !== undefined && `${numberFormat.format(total)} jobs on Coople`}
      </div>
    </div>
  );
}

function JobsContent({ jobsQuery }: { jobsQuery: JobsQuery }) {
  if (jobsQuery.status === "pending") {
    return (
      <div role="status" aria-label="Loading jobs">
        <JobListSkeleton count={INITIAL_SKELETON_COUNT} />
      </div>
    );
  }

  if (jobsQuery.status === "error") {
    return (
      <ErrorState error={jobsQuery.error} onRetry={() => jobsQuery.refetch()} />
    );
  }

  if (jobsQuery.jobs.length === 0) {
    return (
      <MessageState
        title="No open jobs right now"
        description="New jobs are published every day. Check back a little later."
      />
    );
  }

  return <JobList jobs={jobsQuery.jobs} pagination={jobsQuery.pagination} />;
}

export function JobsPage() {
  const jobsQuery = useJobs();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <JobsHeader
        isLoading={jobsQuery.status === "pending"}
        total={jobsQuery.total}
      />
      <JobsContent jobsQuery={jobsQuery} />
    </section>
  );
}
