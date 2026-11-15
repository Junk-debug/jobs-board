import { expect, type Locator, type Page, test } from "@playwright/test";
import { mockApi } from "./support/mock-api";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 1024, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

const cards = (page: Page) => page.locator("main ul > li [data-slot=card]");

async function heights(locator: Locator) {
  const boxes = await locator.evaluateAll((elements) =>
    elements.map((element) =>
      Math.round(element.getBoundingClientRect().height)
    )
  );
  return [...new Set(boxes)];
}

async function centerY(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Element is not visible");
  }
  return box.y + box.height / 2;
}

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    });

    test("all job cards have the same height and nothing scrolls sideways", async ({
      page,
    }) => {
      await mockApi(page);
      await page.goto("/");
      await expect(cards(page).first()).toBeVisible();

      expect(await heights(cards(page))).toHaveLength(1);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflows).toBe(false);
    });

    test("the loading skeleton has the size of a job card", async ({
      page,
    }) => {
      await mockApi(page, { listDelayMs: 1500 });
      await page.goto("/");
      const skeleton = page
        .getByRole("status", { name: "Loading jobs" })
        .locator("[data-slot=card]")
        .first();
      await expect(skeleton).toBeVisible();
      const skeletonBox = await skeleton.boundingBox();

      await expect(cards(page).first()).toBeVisible();
      const cardBox = await cards(page).first().boundingBox();

      expect(skeletonBox?.height).toBeCloseTo(cardBox?.height ?? 0, 0);
      expect(skeletonBox?.width).toBeCloseTo(cardBox?.width ?? 0, 0);
    });
  });
}

test("pay and bookmark line up with the first line of the title", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  const card = cards(page).first();
  const title = card.locator("h2");
  const lineHeight = await title.evaluate((element) =>
    parseFloat(getComputedStyle(element).lineHeight)
  );
  const titleBox = await title.boundingBox();
  const firstLineCenter = (titleBox?.y ?? 0) + lineHeight / 2;

  const pay = card.getByText(/\/ h$/).last();
  const bookmark = card
    .getByRole("button", { name: /favourites/ })
    .locator("svg");

  expect(Math.abs((await centerY(pay)) - firstLineCenter)).toBeLessThanOrEqual(
    2
  );
  expect(
    Math.abs((await centerY(bookmark)) - firstLineCenter)
  ).toBeLessThanOrEqual(2);
});
