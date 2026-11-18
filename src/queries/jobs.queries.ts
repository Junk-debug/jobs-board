import {
  type InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { isApiError } from "@/api/errors";
import { hasMoreJobs, type JobsPage, jobsApi } from "@/api/jobs/jobs.api";
import type { JobDetails } from "@/entities/job";
import { matchesTitle } from "@/lib/search";

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
  refetchOnMount: false,
});

type JobsInfiniteQuery = Pick<
  UseInfiniteQueryResult,
  "isFetchingNextPage" | "isFetchNextPageError" | "fetchNextPage"
>;

function toPagination(query: JobsInfiniteQuery, hasMore: boolean): Pagination {
  return {
    hasMore,
    isLoading: query.isFetchingNextPage,
    isError: query.isFetchNextPageError,
    loadMore: () => query.fetchNextPage(),
  };
}

export function useJobs() {
  const { data, ...query } = useInfiniteQuery({
    ...jobsQueryOptions,
    select: selectJobs,
  });

  return {
    jobs: data?.jobs ?? [],
    total: data?.total,
    status: data ? "success" : query.status,
    error: query.error,
    refetch: query.refetch,
    pagination: toPagination(query, query.hasNextPage),
  };
}

export function useJobSearch(query: string) {
  const selectMatches = useCallback(
    (data: InfiniteData<JobsPage, number>) => ({
      jobs: selectJobs(data).jobs.filter((job) =>
        matchesTitle(job.title, query)
      ),
    }),
    [query]
  );
  const { data, ...search } = useInfiniteQuery({
    ...jobsQueryOptions,
    select: selectMatches,
  });

  return {
    jobs: data?.jobs ?? [],
    status: data ? "success" : search.status,
    error: search.error,
    refetch: search.refetch,
    pagination: toPagination(search, search.hasNextPage),
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

export type FavouriteJob =
  | { id: string; status: "pending" | "not_found" | "error" }
  | { id: string; status: "success"; job: JobDetails };

function toFavouriteJob(
  id: string,
  result: UseQueryResult<JobDetails>
): FavouriteJob {
  if (result.data) {
    return { id, status: "success", job: result.data };
  }
  if (result.error) {
    return { id, status: isNotFound(result.error) ? "not_found" : "error" };
  }
  return { id, status: "pending" };
}

export function useFavouriteJobs(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => jobQueryOptions(id)),
    combine: (results) => {
      const failed = results.filter(
        (result) => result.error && !isNotFound(result.error)
      );

      return {
        jobs: results.map((result, index) =>
          toFavouriteJob(ids[index], result)
        ),
        error: failed[0]?.error ?? null,
        retry: () => {
          for (const result of failed) {
            result.refetch();
          }
        },
      };
    },
  });
}
