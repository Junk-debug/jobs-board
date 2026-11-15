import { expect, test } from "@playwright/test";
import { jobDetails, jobsPage, mockApi } from "./support/mock-api";

test("opens a job from the list", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page
    .getByRole("link", { name: jobsPage.data.items[0].workAssignmentName })
    .click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: jobDetails.data.workAssignmentName,
    })
  ).toBeVisible();
  await expect(page.getByText("Description")).toBeVisible();
});

test("opens a job directly from a link", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/job/${jobDetails.data.workAssignmentId}`);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: jobDetails.data.workAssignmentName,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Apply on Coople/ })
  ).toBeVisible();
});

test("shows not found for a malformed id without calling the API", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/job/not-a-uuid");

  await expect(page.getByText("Not found", { exact: true })).toBeVisible();
  expect(calls.details).toEqual([]);
});

test("shows not found for an unknown job", async ({ page }) => {
  await mockApi(page);
  await page.goto("/job/00000000-0000-4000-8000-000000000000");

  await expect(page.getByText("Not found", { exact: true })).toBeVisible();
});

test("shows not found for an unknown route", async ({ page }) => {
  await mockApi(page);
  await page.goto("/nope");

  await expect(page.getByText("Not found", { exact: true })).toBeVisible();
});
