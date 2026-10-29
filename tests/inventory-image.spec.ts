import { test, expect } from "@playwright/test";
for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`stock details preserves portrait and landscape images at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@example.test");
    await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForURL("**/dashboard");
    let width = 400,
      height = 1000;
    await page.route("**/api/backend/inventory/stock-a", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.item.imageUrl =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#eef2ff"/><rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="#4f46e5" stroke-width="10"/></svg>`,
        );
      await route.fulfill({ response, json: body });
    });
    await page.goto("/inventory", { waitUntil: "domcontentloaded" });
    for (const size of [
      { width: 400, height: 1000 },
      { width: 1200, height: 400 },
    ]) {
      width = size.width;
      height = size.height;
      await page
        .getByRole("button", {
          name: "Actions for Oak writing desk",
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "View details" }).click();
      const dialog = page.getByRole("dialog", { name: "Stock details" });
      const image = dialog.getByRole("img", {
        name: "Oak writing desk",
        exact: true,
      });
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const dimensions = await image.evaluate((img: HTMLImageElement) => ({
        fit: getComputedStyle(img).objectFit,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      expect(dimensions.fit).toBe("contain");
      expect(dimensions.naturalWidth).toBe(width);
      expect(dimensions.naturalHeight).toBe(height);
      const bounds = await dialog.boundingBox();
      expect(dimensions.width).toBeLessThanOrEqual(bounds!.width);
      expect(dimensions.height).toBeLessThanOrEqual(viewport.height * 0.5 + 1);
      if (width === 400)
        await page.screenshot({
          path: `test-results/inventory-image-${viewport.width}.png`,
          fullPage: true,
        });
      await dialog
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
      await expect(dialog).toBeHidden();
    }
  });
}
