import { expect, type Page, test } from "@playwright/test";
import {
  fakeTitles,
  jobDetails,
  LIST_TOTAL,
  mockApi,
  PAGE_SIZE,
} from "./support/mock-api";

const jobCards = "main ul > li";
const SEARCH_LIMIT = 500;

const kochCount = fakeTitles(LIST_TOTAL).filter((title) =>
  title.toLowerCase().includes("koch")
).length;

const uniquePages = (pages: number[]) => [...new Set(pages)];

async function scrollUntilVisible(page: Page, text: string) {
  await expect(async () => {
    await page.locator(jobCards).last().scrollIntoViewIfNeeded();
    await expect(page.getByText(text)).toBeVisible({ timeout: 300 });
  }).toPass();
}

test("searches by title in batches and keeps the query in the URL", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);

  await page
    .getByRole("searchbox", { name: "Search jobs by title" })
    .fill("Koch");

  await expect(page.getByText(/^\d+\+ jobs match “Koch”$/)).toBeVisible();
  await scrollUntilVisible(page, `${kochCount} jobs match “Koch”`);
  await expect(page.locator(jobCards)).toHaveCount(kochCount);
  await expect(page).toHaveURL(/\?q=Koch$/);
  expect(calls.listPageSizes.every((size) => size === PAGE_SIZE)).toBe(true);

  await page.reload();

  await expect(page.getByRole("searchbox")).toHaveValue("Koch");
  await scrollUntilVisible(page, `${kochCount} jobs match “Koch”`);
  await expect(page.locator(jobCards)).toHaveCount(kochCount);
});

test("brings back the loaded list without requesting it again", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/?q=koch");
  await scrollUntilVisible(page, `${kochCount} jobs match “koch”`);
  const requestsAfterSearch = calls.listPages.length;

  await page.getByRole("button", { name: "Clear search" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/jobs on Coople/)).toBeVisible();
  await expect(page.locator(jobCards)).toHaveCount(LIST_TOTAL);
  await expect(page.getByText("You've seen all jobs.")).toBeVisible();
  expect(calls.listPages).toHaveLength(requestsAfterSearch);
});

test("clears the search with Escape", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?q=koch");
  await expect(page.getByText(/jobs match “koch”/)).toBeVisible();

  await page.getByRole("searchbox").press("Escape");

  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
});

test("keeps the search when coming back from a job", async ({ page }) => {
  const title = jobDetails.data.workAssignmentName;
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("searchbox").fill("pflegefachperson");
  const results = page.locator(jobCards);
  await expect(
    page.getByText(/^\d+ jobs? match(es)? “pflegefachperson”$/)
  ).toBeVisible();
  const resultCount = await results.count();

  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true })
  ).toBeVisible();
  await page.goBack();

  await expect(page.getByRole("searchbox")).toHaveValue("pflegefachperson");
  await expect(results).toHaveCount(resultCount);
});

test("checks every batch by itself when nothing matches, then offers the full list", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/");
  await page.getByRole("searchbox").fill("astronaut");

  await expect(page.getByText("No jobs match “astronaut”")).toBeVisible();
  expect(uniquePages(calls.listPages)).toEqual([0, 1, 2]);

  await page.getByRole("button", { name: "Show all jobs" }).click();

  await expect(page.locator(jobCards)).toHaveCount(LIST_TOTAL);
  await expect(page.getByRole("searchbox")).toHaveValue("");
});

test("stops at the search limit and says how much it covered", async ({
  page,
}) => {
  const calls = await mockApi(page, { total: 900 });
  await page.goto("/?q=astronaut");

  await expect(page.getByText("No jobs match “astronaut”")).toBeVisible();
  await expect(
    page.getByText(`Search covers the first ${SEARCH_LIMIT} of 900 jobs.`)
  ).toBeVisible();
  expect(uniquePages(calls.listPages)).toEqual([0, 1, 2, 3, 4]);
});
