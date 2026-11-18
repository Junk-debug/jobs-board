import { ErrorState } from "@/components/error-state";
import { JobList } from "@/components/job-list/job-list";
import { JobListSkeleton } from "@/components/job-list/job-list-skeleton";
import { JobSearch } from "@/components/job-search";
import { MessageState } from "@/components/message-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import { useJobSearch, useJobs } from "@/queries/jobs.queries";

const numberFormat = new Intl.NumberFormat("en-CH");

const INITIAL_SKELETON_COUNT = 6;

const SEARCH_PARAM = "q";

const SEARCH_DEBOUNCE_MS = 250;

type JobsQuery = ReturnType<typeof useJobs>;

type JobSearchQuery = ReturnType<typeof useJobSearch>;

type JobsHeaderProps = {
  summary: string | null;
  isLoading: boolean;
};

function JobsHeader({ summary, isLoading }: JobsHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Open jobs
      </h1>
      <div
        aria-live="polite"
        className="min-h-[1lh] text-sm text-muted-foreground"
      >
        {isLoading && <Skeleton className="my-[0.125lh] h-[0.75lh] w-32" />}
        {summary}
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

type SearchContentProps = {
  query: string;
  searchQuery: JobSearchQuery;
  onClear: () => void;
};

function SearchContent({ query, searchQuery, onClear }: SearchContentProps) {
  if (searchQuery.status === "pending") {
    return (
      <div role="status" aria-label="Searching jobs">
        <JobListSkeleton count={INITIAL_SKELETON_COUNT} />
      </div>
    );
  }

  if (searchQuery.status === "error") {
    return (
      <ErrorState
        error={searchQuery.error}
        onRetry={() => searchQuery.refetch()}
      />
    );
  }

  const { jobs, pagination } = searchQuery;
  const isSearchFinished = !pagination.hasMore;

  return (
    <div className="flex flex-col gap-3">
      {jobs.length === 0 && isSearchFinished && (
        <MessageState
          title={`No jobs match “${query}”`}
          description="Check the spelling or try a shorter part of the title."
          action={
            <Button variant="outline" size="sm" onClick={onClear}>
              Show all jobs
            </Button>
          }
        />
      )}
      {jobs.length === 0 && !isSearchFinished && !pagination.isError && (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}
      <JobList jobs={jobs} pagination={pagination} endMessage={null} />
    </div>
  );
}

function describeJobs(total: number | undefined): string | null {
  return total === undefined
    ? null
    : `${numberFormat.format(total)} jobs on Coople`;
}

function describeMatches(
  count: number,
  isComplete: boolean,
  query: string
): string | null {
  if (count === 0 && !isComplete) {
    return null;
  }
  const jobs = count === 1 && isComplete ? "job matches" : "jobs match";
  const amount = `${numberFormat.format(count)}${isComplete ? "" : "+"}`;
  return `${amount} ${jobs} “${query}”`;
}

export function JobsPage() {
  const search = useDebouncedSearchParam(SEARCH_PARAM, SEARCH_DEBOUNCE_MS);
  const query = search.value.trim();
  const isSearching = query !== "";
  const jobsQuery = useJobs();
  const searchQuery = useJobSearch(query);

  const header = isSearching
    ? {
        isLoading: searchQuery.status === "pending",
        summary:
          searchQuery.status === "success"
            ? describeMatches(
                searchQuery.jobs.length,
                !searchQuery.pagination.hasMore,
                query
              )
            : null,
      }
    : {
        isLoading: jobsQuery.status === "pending",
        summary: describeJobs(jobsQuery.total),
      };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <JobsHeader isLoading={header.isLoading} summary={header.summary} />
        <JobSearch
          value={search.input}
          onChange={search.changeInput}
          onClear={search.clear}
        />
      </div>
      {isSearching ? (
        <SearchContent
          query={query}
          searchQuery={searchQuery}
          onClear={search.clear}
        />
      ) : (
        <JobsContent jobsQuery={jobsQuery} />
      )}
    </section>
  );
}
