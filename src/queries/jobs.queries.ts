import {
  type InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { isApiError } from "@/api/errors";
import { hasMoreJobs, type JobsPage, jobsApi } from "@/api/jobs/jobs.api";

export type Pagination = {
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  loadMore: () => void;
};

function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function selectJobs(data: InfiniteData<JobsPage, number>) {
  return {
    jobs: dedupeById(data.pages.flatMap((page) => page.items)),
    total: data.pages.at(-1)?.total,
  };
}

const jobsQueryOptions = infiniteQueryOptions({
  queryKey: ["jobs", "list"],
  queryFn: ({ pageParam, signal }) => jobsApi.getPage(pageParam, signal),
  initialPageParam: 0,
  getNextPageParam: (lastPage: JobsPage) =>
    hasMoreJobs(lastPage) ? lastPage.pageNum + 1 : undefined,
  select: selectJobs,
});

export function useJobs() {
  const { data, ...query } = useInfiniteQuery(jobsQueryOptions);

  const pagination: Pagination = {
    hasMore: query.hasNextPage,
    isLoading: query.isFetchingNextPage,
    isError: query.isFetchNextPageError,
    loadMore: () => query.fetchNextPage(),
  };

  return {
    jobs: data?.jobs ?? [],
    total: data?.total,
    status: data ? "success" : query.status,
    error: query.error,
    refetch: query.refetch,
    pagination,
  };
}

export const jobQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["jobs", "detail", id],
    queryFn: ({ signal }) => jobsApi.getById(id, signal),
  });

function isNotFound(error: Error) {
  return isApiError(error) && error.kind === "not_found";
}

export function useJob(id: string) {
  return useQuery({ ...jobQueryOptions(id), throwOnError: isNotFound });
}
