import {
  type JobDetails,
  type JobSummary,
  jobDetailsSchema,
  jobSummarySchema,
} from "@/entities/job";
import { apiClient } from "../client";
import { parseResponse, tolerantArray } from "../parse-response";
import { jobsPageDtoSchema } from "./jobs.schema";

const JOBS_PAGE_SIZE = 30;

const SEARCHABLE_JOBS_LIMIT = 1000;

const JOBS_PATH = "/work-assignments/public-jobs";

const jobSummaryListSchema = tolerantArray(jobSummarySchema);

export type JobsPage = JobList & { pageNum: number };

export type SearchableJobs = {
  items: JobSummary[];
  total: number;
  searchedCount: number;
};

type JobList = {
  items: JobSummary[];
  receivedCount: number;
  total: number;
};

async function getList(
  pageNum: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<JobList> {
  const query = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  const data = await apiClient.get(`${JOBS_PATH}/list?${query}`, { signal });
  const page = parseResponse(jobsPageDtoSchema, data);

  return {
    items: parseResponse(jobSummaryListSchema, page.items),
    receivedCount: page.items.length,
    total: page.total,
  };
}

async function getPage(
  pageNum: number,
  signal?: AbortSignal
): Promise<JobsPage> {
  const list = await getList(pageNum, JOBS_PAGE_SIZE, signal);
  return { pageNum, ...list };
}

async function getSearchable(signal?: AbortSignal): Promise<SearchableJobs> {
  const list = await getList(0, SEARCHABLE_JOBS_LIMIT, signal);

  return {
    items: list.items,
    total: list.total,
    searchedCount: Math.min(list.total, SEARCHABLE_JOBS_LIMIT),
  };
}

async function getById(id: string, signal?: AbortSignal): Promise<JobDetails> {
  const data = await apiClient.get(`${JOBS_PATH}/${encodeURIComponent(id)}`, {
    signal,
  });

  return parseResponse(jobDetailsSchema, data);
}

export const jobsApi = { getPage, getSearchable, getById };

export function hasMoreJobs(page: JobsPage): boolean {
  const loadedUpToHere = (page.pageNum + 1) * JOBS_PAGE_SIZE;
  return page.receivedCount === JOBS_PAGE_SIZE && loadedUpToHere < page.total;
}
