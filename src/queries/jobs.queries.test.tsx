import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { fixtures, JOBS_LIST_URL, server } from "@/test/server";
import { useJobs } from "./jobs.queries";

const pageSize = fixtures.jobsPage.data.items.length;

function renderUseJobs() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useJobs(), { wrapper });
}

describe("useJobs", () => {
  it("keeps the same list between renders", async () => {
    const { result, rerender } = renderUseJobs();
    await waitFor(() => expect(result.current.jobs).toHaveLength(pageSize));
    const jobsBefore = result.current.jobs;

    rerender();

    expect(result.current.jobs).toBe(jobsBefore);
  });

  it("keeps already loaded jobs as the same objects when the next page arrives", async () => {
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        const pageNum = new URL(request.url).searchParams.get("pageNum");
        if (pageNum === "0") {
          return HttpResponse.json(fixtures.jobsPage);
        }
        return HttpResponse.json({
          ...fixtures.jobsPage,
          data: {
            ...fixtures.jobsPage.data,
            items: fixtures.jobsPage.data.items.map((item) => ({
              ...item,
              workAssignmentId: `${item.workAssignmentId}-page-${pageNum}`,
            })),
          },
        });
      })
    );
    const { result } = renderUseJobs();
    await waitFor(() => expect(result.current.jobs).toHaveLength(pageSize));
    const firstJobBefore = result.current.jobs[0];

    act(() => {
      result.current.pagination.loadMore();
    });

    await waitFor(() => expect(result.current.jobs).toHaveLength(pageSize * 2));
    expect(result.current.jobs[0]).toBe(firstJobBefore);
  });

  it("removes a job that appears on two pages", async () => {
    const { result } = renderUseJobs();
    await waitFor(() => expect(result.current.jobs).toHaveLength(pageSize));

    act(() => {
      result.current.pagination.loadMore();
    });

    await waitFor(() =>
      expect(result.current.pagination.isLoading).toBe(false)
    );
    expect(result.current.jobs).toHaveLength(pageSize);
  });
});
