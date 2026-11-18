import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import jobDetails from "./fixtures/job-details.json";
import jobNotFound from "./fixtures/job-not-found.json";
import jobsPage from "./fixtures/jobs-page.json";

export const JOBS_LIST_URL = "*/api/work-assignments/public-jobs/list";
export const JOB_DETAILS_URL = "*/api/work-assignments/public-jobs/:id";

export const fixtures = { jobsPage, jobDetails, jobNotFound };

const FIXTURE_JOBS_COUNT = jobsPage.data.items.length;

const DEFAULT_TOTAL = 250;

type FakeListOptions = {
  pageNum: number;
  pageSize: number;
  total?: number;
  titleAt?: (index: number) => string;
};

export function fakeListPage({
  pageNum,
  pageSize,
  total = DEFAULT_TOTAL,
  titleAt,
}: FakeListOptions) {
  const start = pageNum * pageSize;
  const count = Math.max(0, Math.min(pageSize, total - start));
  const items = Array.from({ length: count }, (_, offset) => {
    const index = start + offset;
    const template = jobsPage.data.items[index % FIXTURE_JOBS_COUNT];
    return {
      ...template,
      workAssignmentId:
        index < FIXTURE_JOBS_COUNT
          ? template.workAssignmentId
          : `${template.workAssignmentId}-${index}`,
      workAssignmentName:
        titleAt?.(index) ??
        (index < FIXTURE_JOBS_COUNT
          ? template.workAssignmentName
          : `${template.workAssignmentName} (${index})`),
    };
  });

  return { ...jobsPage, data: { ...jobsPage.data, total, items } };
}

export function listParams(request: Request) {
  const { searchParams } = new URL(request.url);
  return {
    pageNum: Number(searchParams.get("pageNum")),
    pageSize: Number(searchParams.get("pageSize")),
  };
}

const handlers = [
  http.get(JOBS_LIST_URL, ({ request }) =>
    HttpResponse.json(fakeListPage(listParams(request)))
  ),
  http.get(JOB_DETAILS_URL, ({ params }) =>
    params.id === jobDetails.data.workAssignmentId
      ? HttpResponse.json(jobDetails)
      : HttpResponse.json(jobNotFound, { status: 404 })
  ),
];

export const server = setupServer(...handlers);
