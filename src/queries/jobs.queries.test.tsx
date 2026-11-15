import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { fixtures } from "@/test/server";
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
