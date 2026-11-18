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

export const PAGE_SIZE = 100;

export const LIST_TOTAL = 250;

const templates = jobsPage.data.items;

function jobAt(index: number) {
  const template = templates[index % templates.length];
  if (index < templates.length) {
    return template;
  }
  return {
    ...template,
    workAssignmentId: `${template.workAssignmentId}-${index}`,
    workAssignmentName: `${template.workAssignmentName} (${index})`,
  };
}

export function fakeTitles(total: number) {
  return Array.from(
    { length: total },
    (_, index) => jobAt(index).workAssignmentName
  );
}

function listPageResponse(
  pageNum: number,
  pageSize: number,
  total: number
): JobsPageFixture {
  const start = pageNum * pageSize;
  const count = Math.max(0, Math.min(pageSize, total - start));

  return {
    ...jobsPage,
    data: {
      total,
      items: Array.from({ length: count }, (_, offset) =>
        jobAt(start + offset)
      ),
    },
  };
}

type MockApiOptions = {
  failListPage?: { pageNum: number; times: number };
  listDelayMs?: number;
  total?: number;
};

type ApiCalls = {
  listPages: number[];
  listPageSizes: number[];
  details: string[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockApi(
  page: Page,
  { failListPage, listDelayMs = 0, total = LIST_TOTAL }: MockApiOptions = {}
): Promise<ApiCalls> {
  const calls: ApiCalls = { listPages: [], listPageSizes: [], details: [] };
  let failuresLeft = failListPage?.times ?? 0;

  await page.route(
    "**/api/work-assignments/public-jobs/**",
    async (route: Route) => {
      const url = new URL(route.request().url());
      const lastSegment = url.pathname.split("/").at(-1) ?? "";

      if (lastSegment === "list") {
        const pageNum = Number(url.searchParams.get("pageNum"));
        const pageSize = Number(url.searchParams.get("pageSize"));
        calls.listPages.push(pageNum);
        calls.listPageSizes.push(pageSize);
        await delay(listDelayMs);

        if (pageNum === failListPage?.pageNum && failuresLeft > 0) {
          failuresLeft -= 1;
          await route.fulfill({ status: 503, body: "" });
          return;
        }

        await route.fulfill({
          json: listPageResponse(pageNum, pageSize, total),
        });
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
