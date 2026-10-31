import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
async function expectActionsBelowContent(
  page: import("@playwright/test").Page,
) {
  const content = await page.locator(".form-layout").boundingBox();
  const actions = await page.locator(".form-actions").boundingBox();
  expect(content).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(actions!.y).toBeGreaterThanOrEqual(content!.y + content!.height);
}
test("product form has a live side summary, connected labels and accessible fields", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/inventory/new");
  const name = page.getByRole("textbox", { name: "Product name", exact: true });
  await expect(name).toBeVisible({ timeout: 15000 });
  await name.fill("Oak dining chair");
  await page.getByLabel("SKU", { exact: true }).fill("CHAIR-01");
  await page
    .getByRole("spinbutton", { name: "Opening quantity", exact: true })
    .fill("12");
  await page.getByLabel(/Opening unit cost per/).fill("30");
  const summary = page.getByRole("region", { name: "Quick summary" });
  await expect(summary).toContainText("Oak dining chair");
  await expect(summary).toContainText("360.00");
  const main = await page.locator(".form-main").boundingBox();
  const aside = await page.locator(".form-aside").boundingBox();
  expect(aside!.x).toBeGreaterThan(main!.x + main!.width);
  await expectActionsBelowContent(page);
  const hint = await page
    .getByLabel("SKU", { exact: true })
    .getAttribute("aria-describedby");
  expect(hint).toBeTruthy();
  await expect(page.locator(`[id="${hint}"]`)).toContainText("unique");
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  expect(duplicates).toEqual([]);
  const axe = await new AxeBuilder({ page })
    .include("#workspace-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/forms-product-desktop.png",
    fullPage: true,
  });
});
test("product form stacks cleanly at 390 and 320 pixels", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inventory/new");
  await expect(
    page.getByRole("textbox", { name: "Product name", exact: true }),
  ).toBeVisible({
    timeout: 15000,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const main = await page.locator(".form-main").boundingBox();
    const aside = await page.locator(".form-aside").boundingBox();
    expect(aside!.y).toBeGreaterThan(main!.y);
    await expectActionsBelowContent(page);
    await page.locator(".form-actions").scrollIntoViewIfNeeded();
    await expectActionsBelowContent(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/forms-product-mobile.png",
    fullPage: true,
  });
});
test("transaction and settings forms share sections, summaries and action bars", async ({
  page,
}) => {
  test.setTimeout(180000); // Nine cold Next.js dev routes compile on the first visit.
  await login(page);
  for (const route of [
    "/sales/new",
    "/purchases/new",
    "/expenses/new",
    "/stock-transfers/new",
    "/boms/new",
    "/production-orders/new",
    "/inquiries/new",
    "/account",
    "/settings/branding",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".form-page").first(), route).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator(".form-section").first(), route).toBeVisible();
    await expect(page.locator(".form-actions").first(), route).toBeAttached();
  }
  await page.goto("/purchases/new");
  await expect(page.locator(".form-line-row").first()).toBeVisible({
    timeout: 15000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Quantity", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Unit price", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("quick-create dialogs retain independent labels and the unit picker", async ({
  page,
}) => {
  await login(page);
  await page.goto("/stock-transfers/new");
  const source = page.getByRole("combobox", { name: "From", exact: true });
  await expect(source).toBeVisible({ timeout: 15000 });
  await source.click();
  await page.getByRole("option", { name: /Main warehouse/ }).click();
  await page.getByRole("button", { name: "New item", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("Product name", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Stock unit", exact: true }),
  ).toContainText("Piece");
  const ids = await dialog
    .locator("[id]")
    .evaluateAll((els) => els.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body).pointerEvents),
    )
    .not.toBe("none");
});

test("product submission preserves its API fields and shows connected validation errors", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inventory/new", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("textbox", { name: "Product name", exact: true })
    .fill("Form verification chair");
  await expect(
    page.getByRole("combobox", { name: "Stock unit", exact: true }),
  ).toContainText("Piece");
  const sku = page.getByLabel("SKU", { exact: true });
  await sku.fill("DUPLICATE");
  await page
    .getByRole("spinbutton", { name: "Opening quantity", exact: true })
    .fill("5");
  await page.getByLabel(/Opening unit cost per/).fill("10");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(sku).toHaveAttribute("aria-invalid", "true");
  const field = page.locator(".form-field").filter({ has: sku });
  await expect(field.getByRole("alert")).toContainText("SKU");
  await sku.fill("VERIFIED-SKU");
  const pending = page.waitForRequest(
    (r) => r.url().endsWith("/api/backend/inventory") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  expect((await pending).postDataJSON()).toMatchObject({
    description: "Form verification chair",
    sku: "VERIFIED-SKU",
    quantity: 5,
    purchasePrice: 10,
    unitId: "10000000-0000-4000-8000-000000000001",
  });
  await page.waitForURL("**/inventory");
});


test("new products can start at zero without entering a purchase price", async ({ page }) => {
  await login(page);
  await page.goto("/inventory/new");
  await page.getByRole("textbox", { name: "Product name", exact: true }).fill("New finished product");
  await page.getByRole("combobox", { name: "Item type", exact: true }).click();
  await page.getByRole("option", { name: "Finished good", exact: true }).click();
  await expect(page.getByText("Final product sold to customers.", { exact: false })).toBeVisible();
  await expect(page.getByLabel(/Opening unit cost per/)).toBeDisabled();
  const pending = page.waitForRequest(r => r.url().endsWith("/api/backend/inventory") && r.method() === "POST");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  expect((await pending).postDataJSON()).toMatchObject({ quantity: 0, purchasePrice: 0, itemType: "FINISHED" });
  await page.waitForURL("**/inventory");
});
