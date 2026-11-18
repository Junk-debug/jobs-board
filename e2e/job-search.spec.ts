import { expect, test } from "@playwright/test";
import { jobDetails, jobsPage, mockApi, PAGE_SIZE } from "./support/mock-api";

const jobCards = "main ul > li";
const FULL_LIST_SIZE = 1000;

const kochTitles = jobsPage.data.items
  .map((item) => item.workAssignmentName)
  .filter((title) => title.toLowerCase().includes("koch"));

test("searches all jobs by title and keeps the query in the URL", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
  expect(calls.listPageSizes).not.toContain(FULL_LIST_SIZE);

  await page
    .getByRole("searchbox", { name: "Search jobs by title" })
    .fill("Koch");

  await expect(
    page.getByText(`${kochTitles.length} jobs match “Koch”`)
  ).toBeVisible();
  await expect(page.locator(jobCards)).toHaveCount(kochTitles.length);
  await expect(page).toHaveURL(/\?q=Koch$/);
  expect(calls.listPageSizes).toContain(FULL_LIST_SIZE);

  await page.reload();

  await expect(page.getByRole("searchbox")).toHaveValue("Koch");
  await expect(page.locator(jobCards)).toHaveCount(kochTitles.length);
});

test("brings back the infinite list when the search is cleared", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/?q=koch");
  await expect(page.locator(jobCards)).toHaveCount(kochTitles.length);

  await page.getByRole("button", { name: "Clear search" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/jobs on Coople/)).toBeVisible();
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
  await page.locator(jobCards).last().scrollIntoViewIfNeeded();
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE * 2);
});

test("clears the search with Escape", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?q=koch");
  await expect(page.locator(jobCards)).toHaveCount(kochTitles.length);

  await page.getByRole("searchbox").press("Escape");

  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
});

test("keeps the search when coming back from a job", async ({ page }) => {
  const title = jobDetails.data.workAssignmentName;
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("searchbox").fill("pflegefachperson");
  await expect(page.getByText(/matches? “pflegefachperson”/)).toBeVisible();
  const results = page.locator(jobCards);
  const resultCount = await results.count();

  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.goBack();

  await expect(page.getByRole("searchbox")).toHaveValue("pflegefachperson");
  await expect(results).toHaveCount(resultCount);
});

test("offers to show all jobs when nothing matches", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("searchbox").fill("astronaut");

  await expect(page.getByText("No jobs match “astronaut”")).toBeVisible();

  await page.getByRole("button", { name: "Show all jobs" }).click();

  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
  await expect(page.getByRole("searchbox")).toHaveValue("");
});
