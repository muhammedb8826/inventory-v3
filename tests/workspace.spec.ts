import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
test("cookie session, modern table, export and partial bulk failures", async ({
  page,
}) => {
  await login(page);
  const cookies = await page.context().cookies();
  expect(
    cookies
      .filter((c) => c.name.startsWith("inventory_"))
      .every((c) => c.httpOnly),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("stock_refresh_token")),
  ).toBeNull();
  await page.goto("/customers", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Acacia Studio", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Select all rows on this page" })
    .click();
  await expect(page.getByText("3 selected on this page")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export selected" }).click();
  expect((await download).suggestedFilename()).toContain("selected.csv");
  await page.getByRole("button", { name: "Deactivate selected" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm action" }).click();
  await expect(
    page.getByText("Customer has open documents", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("1 selected on this page")).toBeVisible();
  await page.screenshot({
    path: "test-results/customers-desktop.png",
    fullPage: true,
  });
});
test("tables support mobile width and WCAG checks", async ({ page }) => {
  await login(page);
  await page.goto("/customers", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Acacia Studio", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include("#workspace-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/customers-mobile.png",
    fullPage: true,
  });
});
test("cross-site writes are rejected by the session proxy", async ({
  request,
}) => {
  const response = await request.post("/api/backend/auth/login", {
    headers: { origin: "https://untrusted.test" },
    data: {},
  });
  expect(response.status()).toBe(403);
});

test("inventory prioritizes stock, exposes metadata and opens actions outside the menu", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inventory", { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByText("Oak writing desk", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  const headers = page.getByRole("table").getByRole("columnheader");
  expect((await headers.allTextContents())[1]).toContain("Item");
  await expect(
    page.getByRole("columnheader", { name: "Updated at" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose table columns" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Created at", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("columnheader", { name: "Created at" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for Oak writing desk", exact: true })
    .click();
  await expect(page.getByRole("menuitem", { name: "Edit item" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Adjust stock" }).click();
  await expect(
    page.getByRole("dialog", { name: "Adjust stock" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Adjust stock" })).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body).pointerEvents),
    )
    .not.toBe("none");
  await page
    .getByRole("button", { name: "Actions for Oak writing desk", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "View details" }).click();
  await expect(
    page.getByRole("dialog", { name: "Stock details" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Stock details" }),
  ).toBeHidden();
  await page.screenshot({
    path: "test-results/inventory-desktop.png",
    fullPage: true,
  });
});
test("mobile inventory cards and navigation remain readable at narrow widths", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inventory", { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByText("Oak writing desk", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "Oak writing desk" })
      .getByText("44", { exact: true }),
  ).toBeVisible();
  await page.locator("[data-slot=sidebar-trigger]").click();
  const navigation = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(navigation).toBeVisible();
  await navigation
    .getByRole("link", { name: "Customers", exact: true })
    .click();
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await page.goto("/inventory", { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByText("Oak writing desk", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/inventory-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .include("#workspace-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("workspace search and sidebar state persist between pages and refreshes", async ({
  page,
}) => {
  await login(page);
  await page.locator("[data-slot=sidebar-trigger]").click();
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", {
    name: "Go to a page",
    exact: true,
  });
  await search.getByRole("textbox", { name: "Search pages" }).fill("Customers");
  await search.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
});
test("dashboard colors and layout support desktop and dark mobile", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
  });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile-dark.png",
    fullPage: true,
  });
});
