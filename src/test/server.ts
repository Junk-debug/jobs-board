import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import jobDetails from "./fixtures/job-details.json";
import jobNotFound from "./fixtures/job-not-found.json";
import jobsPage from "./fixtures/jobs-page.json";

export const JOBS_LIST_URL = "*/api/work-assignments/public-jobs/list";
export const JOB_DETAILS_URL = "*/api/work-assignments/public-jobs/:id";

export const fixtures = { jobsPage, jobDetails, jobNotFound };

const handlers = [
  http.get(JOBS_LIST_URL, () => HttpResponse.json(jobsPage)),
  http.get(JOB_DETAILS_URL, ({ params }) =>
    params.id === jobDetails.data.workAssignmentId
      ? HttpResponse.json(jobDetails)
      : HttpResponse.json(jobNotFound, { status: 404 })
  ),
];

export const server = setupServer(...handlers);
