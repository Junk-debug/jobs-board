import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";

type JobsPageFixture = {
  status: number;
  error: boolean;
  data: {
    total: number;
    items: { workAssignmentId: string; workAssignmentName: string }[];
  };
};

function readFixture<T>(name: string): T {
  const url = new URL(`../../src/test/fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

export const jobsPage = readFixture<JobsPageFixture>("jobs-page");
export const jobDetails = readFixture<{
  data: { workAssignmentId: string; workAssignmentName: string };
}>("job-details");
const jobNotFound = readFixture<unknown>("job-not-found");

export const PAGE_SIZE = jobsPage.data.items.length;

function jobsPageNumber(pageNum: number): JobsPageFixture {
  if (pageNum === 0) {
    return jobsPage;
  }

  return {
    ...jobsPage,
    data: {
      ...jobsPage.data,
      items: jobsPage.data.items.map((item) => ({
        ...item,
        workAssignmentId: `${item.workAssignmentId}-page-${pageNum}`,
      })),
    },
  };
}

type MockApiOptions = {
  failListPage?: { pageNum: number; times: number };
  listDelayMs?: number;
};

type ApiCalls = {
  listPages: number[];
  details: string[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockApi(
  page: Page,
  { failListPage, listDelayMs = 0 }: MockApiOptions = {}
): Promise<ApiCalls> {
  const calls: ApiCalls = { listPages: [], details: [] };
  let failuresLeft = failListPage?.times ?? 0;

  await page.route(
    "**/api/work-assignments/public-jobs/**",
    async (route: Route) => {
      const url = new URL(route.request().url());
      const lastSegment = url.pathname.split("/").at(-1) ?? "";

      if (lastSegment === "list") {
        const pageNum = Number(url.searchParams.get("pageNum"));
        calls.listPages.push(pageNum);
        await delay(listDelayMs);

        if (pageNum === failListPage?.pageNum && failuresLeft > 0) {
          failuresLeft -= 1;
          await route.fulfill({ status: 503, body: "" });
          return;
        }

        await route.fulfill({ json: jobsPageNumber(pageNum) });
        return;
      }

      calls.details.push(lastSegment);
      if (lastSegment === jobDetails.data.workAssignmentId) {
        await route.fulfill({ json: jobDetails });
        return;
      }

      await route.fulfill({ status: 404, json: jobNotFound });
    }
  );

  return calls;
}
