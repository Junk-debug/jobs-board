import {
  type JobDetails,
  type JobSummary,
  jobDetailsSchema,
  jobSummarySchema,
} from "@/entities/job";
import { apiClient } from "../client";
import { parseResponse, tolerantArray } from "../parse-response";
import { jobsPageDtoSchema } from "./jobs.schema";

export const JOBS_PAGE_SIZE = 100;

const JOBS_PATH = "/work-assignments/public-jobs";

const jobSummaryListSchema = tolerantArray(jobSummarySchema);

export type JobsPage = {
  pageNum: number;
  items: JobSummary[];
  receivedCount: number;
  total: number;
};

async function getPage(
  pageNum: number,
  signal?: AbortSignal
): Promise<JobsPage> {
  const query = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(JOBS_PAGE_SIZE),
  });
  const data = await apiClient.get(`${JOBS_PATH}/list?${query}`, { signal });
  const page = parseResponse(jobsPageDtoSchema, data);

  return {
    pageNum,
    items: parseResponse(jobSummaryListSchema, page.items),
    receivedCount: page.items.length,
    total: page.total,
  };
}

async function getById(id: string, signal?: AbortSignal): Promise<JobDetails> {
  const data = await apiClient.get(`${JOBS_PATH}/${encodeURIComponent(id)}`, {
    signal,
  });

  return parseResponse(jobDetailsSchema, data);
}

export const jobsApi = { getPage, getById };

export function hasMoreJobs(page: JobsPage): boolean {
  const loadedUpToHere = (page.pageNum + 1) * JOBS_PAGE_SIZE;
  return page.receivedCount === JOBS_PAGE_SIZE && loadedUpToHere < page.total;
}
