import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jobSummarySchema } from "@/entities/job";
import { fixtures, JOBS_LIST_URL, server } from "@/test/server";
import type { ApiError } from "../errors";
import { parseResponse, tolerantArray } from "../parse-response";
import { hasMoreJobs, jobsApi } from "./jobs.api";

const PAGE_SIZE = 30;

const firstJob = fixtures.jobsPage.data.items[0];

describe("jobsApi.getPage", () => {
  it("maps a real Coople page into the domain model", async () => {
    const page = await jobsApi.getPage(0);

    expect(page.items).toHaveLength(fixtures.jobsPage.data.items.length);
    expect(page.total).toBe(fixtures.jobsPage.data.total);
    expect(page.items[0]).toMatchObject({
      id: firstJob.workAssignmentId,
      title: firstJob.workAssignmentName,
      location: { city: firstJob.jobLocation.city },
      hourlyWage: { amount: firstJob.hourlyWage.amount, currency: "CHF" },
    });
    expect(page.items[0].startsAt).toEqual(new Date(firstJob.periodFrom));
  });

  it("asks for the requested page", async () => {
    let requested: URL | undefined;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        requested = new URL(request.url);
        return HttpResponse.json(fixtures.jobsPage);
      })
    );

    await jobsApi.getPage(3);

    expect(requested?.searchParams.get("pageNum")).toBe("3");
    expect(requested?.searchParams.get("pageSize")).toBe(String(PAGE_SIZE));
  });

  it("maps an empty job name to a missing title", async () => {
    server.use(
      http.get(JOBS_LIST_URL, () =>
        HttpResponse.json({
          ...fixtures.jobsPage,
          data: { total: 1, items: [{ ...firstJob, workAssignmentName: "" }] },
        })
      )
    );

    const page = await jobsApi.getPage(0);
    expect(page.items[0].title).toBeNull();
  });
});

describe("hasMoreJobs", () => {
  const page = {
    pageNum: 0,
    items: [],
    receivedCount: PAGE_SIZE,
    total: 100,
  };

  it("continues while full pages come back and total is not reached", () => {
    expect(hasMoreJobs(page)).toBe(true);
  });

  it("stops on a short page", () => {
    expect(hasMoreJobs({ ...page, receivedCount: 10 })).toBe(false);
  });

  it("stops when the total is reached", () => {
    expect(hasMoreJobs({ ...page, pageNum: 3, total: 120 })).toBe(false);
  });
});

describe("list validation", () => {
  const brokenItem = { ...firstJob, jobLocation: null };
  const items = [firstJob, brokenItem];

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails with the path to the broken field in development", () => {
    expect(() => parseResponse(tolerantArray(jobSummarySchema), items)).toThrow(
      /1[\s\S]*jobLocation/
    );
  });

  it("drops a broken item and warns in production", async () => {
    vi.stubEnv("DEV", false);
    vi.resetModules();
    const parse = await import("../parse-response");
    const { jobSummarySchema: summarySchema } = await import("@/entities/job");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const parsed = parse.parseResponse(
      parse.tolerantArray(summarySchema),
      items
    );

    expect(parsed).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("item 1"),
      expect.stringContaining("jobLocation")
    );
  });
});

describe("jobsApi.getById", () => {
  it("maps real job details including the Markdown description", async () => {
    const job = await jobsApi.getById(
      fixtures.jobDetails.data.workAssignmentId
    );

    expect(job).toMatchObject({
      id: fixtures.jobDetails.data.workAssignmentId,
      shiftsCount: fixtures.jobDetails.data.shiftsCount,
      workDurationMinutes: fixtures.jobDetails.data.workDuration,
    });
    expect(job.description).toContain("**");
  });

  it("fails with not_found for an unknown job", async () => {
    await expect(
      jobsApi.getById("00000000-0000-4000-8000-000000000000")
    ).rejects.toMatchObject({ kind: "not_found" } satisfies Partial<ApiError>);
  });
});
