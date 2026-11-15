import { expect, test } from "@playwright/test";
import { jobsPage, mockApi, PAGE_SIZE } from "./support/mock-api";

const jobCards = "main ul > li";

test("shows the jobs and their total", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Open jobs" })).toBeVisible();
  await expect(page.getByText(/jobs on Coople/)).toContainText(
    new Intl.NumberFormat("en-CH").format(jobsPage.data.total)
  );
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
});

test("loads the next page when scrolled to the end", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);

  await page.locator(jobCards).last().scrollIntoViewIfNeeded();

  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE * 2);
  expect(calls.listPages).toContain(1);
});

test("keeps loaded jobs when the next page fails and loads it on retry", async ({
  page,
}) => {
  const failuresIncludingAutomaticRetries = 3;
  await mockApi(page, {
    failListPage: { pageNum: 1, times: failuresIncludingAutomaticRetries },
  });
  await page.goto("/");
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);

  await page.locator(jobCards).last().scrollIntoViewIfNeeded();

  await expect(page.getByText("Couldn't load more jobs.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);

  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE * 2);
  await expect(page.getByText("Couldn't load more jobs.")).toBeHidden();
});

test("restores the scroll position when coming back from a job", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  const card = page.locator(jobCards).nth(12);
  await card.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/job\//);
  await page.goBack();

  await expect(page.locator(jobCards)).toHaveCount(PAGE_SIZE);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeCloseTo(scrollBefore, 0);
});
