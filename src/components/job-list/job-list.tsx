import { JobCard } from "@/components/job-card/job-card";
import { Button } from "@/components/ui/button";
import type { JobSummary } from "@/entities/job";
import { useLoadMoreOnScroll } from "@/hooks/use-load-more-on-scroll";
import type { Pagination } from "@/queries/jobs.queries";
import { JobListSkeleton } from "./job-list-skeleton";

const NEXT_PAGE_SKELETON_COUNT = 2;

const DEFAULT_END_MESSAGE = "You've seen all jobs.";

type ListFooterProps = {
  pagination: Pagination;
  endMessage: string | null;
};

function ListFooter({ pagination, endMessage }: ListFooterProps) {
  if (pagination.isLoading) {
    return (
      <>
        <span className="sr-only">Loading more jobs</span>
        <JobListSkeleton count={NEXT_PAGE_SKELETON_COUNT} />
      </>
    );
  }

  if (pagination.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
        <span>Couldn&apos;t load more jobs.</span>
        <Button variant="outline" size="sm" onClick={pagination.loadMore}>
          Try again
        </Button>
      </div>
    );
  }

  if (!pagination.hasMore && endMessage !== null) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {endMessage}
      </p>
    );
  }

  return null;
}

function ListPagination({ pagination, endMessage }: ListFooterProps) {
  const endMarkerRef = useLoadMoreOnScroll({
    canLoadMore:
      pagination.hasMore && !pagination.isLoading && !pagination.isError,
    onLoadMore: pagination.loadMore,
  });

  return (
    <>
      <div role="status">
        <ListFooter pagination={pagination} endMessage={endMessage} />
      </div>
      <div ref={endMarkerRef} aria-hidden />
    </>
  );
}

type JobListProps = {
  jobs: readonly JobSummary[];
  pagination?: Pagination;
  endMessage?: string | null;
};

export function JobList({
  jobs,
  pagination,
  endMessage = DEFAULT_END_MESSAGE,
}: JobListProps) {
  return (
    <div className="flex flex-col gap-3">
      {jobs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}
      {pagination && (
        <ListPagination pagination={pagination} endMessage={endMessage} />
      )}
    </div>
  );
}
