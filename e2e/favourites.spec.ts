import { expect, test } from "@playwright/test";
import { jobDetails, mockApi } from "./support/mock-api";

test("a saved job stays saved in the list, on its page and after a reload", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  const firstCard = page.locator("main ul > li").first();

  await firstCard.getByRole("button", { name: /to favourites/ }).click();
  await expect(
    firstCard.getByRole("button", { name: /from favourites/ })
  ).toHaveAttribute("aria-pressed", "true");

  await firstCard.getByRole("link").click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: jobDetails.data.workAssignmentName,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /from favourites/ })
  ).toHaveAttribute("aria-pressed", "true");

  await page.reload();

  await expect(
    page.getByRole("button", { name: /from favourites/ })
  ).toHaveAttribute("aria-pressed", "true");
});
