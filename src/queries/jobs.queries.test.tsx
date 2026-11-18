import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { JOBS_PAGE_SIZE } from "@/api/jobs/jobs.config";
import { createQueryClient } from "@/lib/query-client";
import { fakeListPage, JOBS_LIST_URL, server } from "@/test/server";
import { useJobs } from "./jobs.queries";

function renderUseJobs() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useJobs(), { wrapper });
}

describe("useJobs", () => {
  it("removes a job that appears on two pages", async () => {
    server.use(
      http.get(JOBS_LIST_URL, () =>
        HttpResponse.json(
          fakeListPage({ pageNum: 0, pageSize: JOBS_PAGE_SIZE })
        )
      )
    );
    const { result } = renderUseJobs();
    await waitFor(() =>
      expect(result.current.jobs).toHaveLength(JOBS_PAGE_SIZE)
    );

    act(() => {
      result.current.pagination.loadMore();
    });

    await waitFor(() =>
      expect(result.current.pagination.isLoading).toBe(false)
    );
    expect(result.current.jobs).toHaveLength(JOBS_PAGE_SIZE);
  });
});
