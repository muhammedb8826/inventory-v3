import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
test("item packaging settings save independently and stack on mobile", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inventory/stock-a/edit");
  await expect(
    page.getByRole("heading", { name: "Units and conversions" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Add alternative unit" }).click();
  await page
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .last()
    .click();
  await page.getByRole("option", { name: /Box/ }).click();
  await page.getByLabel("Conversion factor", { exact: true }).fill("12");
  await page.getByLabel("Default purchase unit", { exact: true }).check();
  const pending = page.waitForRequest(
    (r) =>
      r.url().includes("/api/backend/units/items/") && r.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save unit settings" }).click();
  expect((await pending).postDataJSON()).toEqual({
    conversions: [
      {
        unitId: "10000000-0000-4000-8000-000000000011",
        factor: 12,
        purchaseDefault: true,
      },
    ],
  });
  await expect(
    page.getByText("Unit conversions saved", { exact: true }),
  ).toBeVisible();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/conversion-settings-mobile.png",
    fullPage: true,
  });
});
test("purchase unit selection previews stock quantity and adjusts the suggested rate", async ({
  page,
}) => {
  await login(page);
  await page.route(/\/api\/backend\/inventory(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data[0].itemId = "20000000-0000-4000-8000-000000000001";
    body.data[0].item.id = body.data[0].itemId;
    await route.fulfill({ json: body });
  });
  const pcs = {
    id: "10000000-0000-4000-8000-000000000001",
    code: "PCS",
    name: "Piece",
    symbol: "pcs",
    category: "COUNT",
    decimalPlaces: 0,
    isActive: true,
    requiresReview: false,
  };
  const box = {
    ...pcs,
    id: "10000000-0000-4000-8000-000000000011",
    code: "BOX",
    name: "Box",
    symbol: "box",
  };
  await page.route("**/api/backend/units/items/*", (route) =>
    route.fulfill({
      json: {
        baseUnit: pcs,
        conversions: [],
        options: [
          { unit: pcs, factor: "1" },
          { unit: box, factor: "12" },
        ],
      },
    }),
  );
  await page.goto("/purchases/new");
  await page.getByRole("combobox", { name: "Location", exact: true }).click();
  await page
    .getByRole("button", { name: /Main warehouse/ })
    .last()
    .click();
  await page.getByRole("combobox", { name: "Item", exact: true }).click();
  await page.getByRole("button", { name: /Oak writing desk/ }).click();
  const selector = page.getByRole("combobox", {
    name: "Transaction unit",
    exact: true,
  });
  await expect(selector).toContainText("Piece");
  await page.getByLabel("Unit price", { exact: true }).fill("10");
  await selector.click();
  await page.getByRole("option", { name: "Box (box)", exact: true }).click();
  await expect(page.getByLabel("Unit price", { exact: true })).toHaveValue(
    "120",
  );
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(
    page.getByText("36 pcs in stock units", { exact: true }),
  ).toBeVisible();
  for (const width of [1280, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/conversion-purchase-mobile.png",
    fullPage: true,
  });
});

test("fabric area calculator fills quantity and retains dimensions in the purchase request", async ({
  page,
}) => {
  await login(page);
  const itemId = "20000000-0000-4000-8000-000000000001";
  const unit = {
    id: "10000000-0000-4000-8000-000000000006",
    code: "M2",
    name: "Square metre",
    symbol: "m2",
    category: "AREA",
    decimalPlaces: 3,
    isActive: true,
    requiresReview: false,
  };
  await page.route(/\/api\/backend\/inventory(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data[0].itemId = itemId;
    body.data[0].item.id = itemId;
    await route.fulfill({ json: body });
  });
  await page.route("**/api/backend/units/items/*", (route) =>
    route.fulfill({
      json: {
        baseUnit: unit,
        conversions: [],
        options: [{ unit, factor: "1" }],
      },
    }),
  );
  await page.route("**/api/backend/purchases", (route) =>
    route.fulfill({ status: 201, json: { id: "area-test" } }),
  );
  await page.goto("/purchases/new");
  await page.getByRole("combobox", { name: "Supplier", exact: true }).click();
  await page
    .getByRole("button", { name: "Acacia supplies", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Location", exact: true }).click();
  await page
    .getByRole("button", { name: /Main warehouse/ })
    .last()
    .click();
  await page.getByRole("combobox", { name: "Item", exact: true }).click();
  await page.getByRole("button", { name: /Oak writing desk/ }).click();
  await page
    .getByRole("button", { name: "Calculate width x length", exact: true })
    .click();
  await page.getByLabel("Width (m)", { exact: true }).fill("1.5");
  await page.getByLabel("Length (m)", { exact: true }).fill("2");
  await page.getByLabel("Number of pieces", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Use calculated area", exact: true })
    .click();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("6");
  await page.getByLabel("Unit price", { exact: true }).fill("15");
  await page
    .getByRole("combobox", { name: "Payment method", exact: true })
    .click();
  await page.getByRole("button", { name: "Credit", exact: true }).click();
  const pending = page.waitForRequest(
    (r) => r.url().endsWith("/api/backend/purchases") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await pending).postDataJSON().lines[0]).toMatchObject({
    itemId,
    unitId: unit.id,
    quantity: 6,
    unitPrice: 15,
    dimensions: { widthMetres: 1.5, lengthMetres: 2, count: 2 },
  });
});

test("fixed piece-to-area ratios preview quantity and cost without rounded reciprocal inputs", async ({
  page,
}) => {
  await login(page);
  const pcs = {
    id: "10000000-0000-4000-8000-000000000001",
    code: "PCS",
    name: "Piece",
    symbol: "pcs",
    category: "COUNT",
    decimalPlaces: 0,
    isActive: true,
    requiresReview: false,
  };
  const area = {
    ...pcs,
    id: "10000000-0000-4000-8000-000000000006",
    code: "M2",
    name: "Square metre",
    symbol: "m2",
    category: "AREA",
    decimalPlaces: 3,
  };
  let conversions: Record<string, unknown>[] = [];
  await page.route("**/api/backend/units/items/*", async (route) => {
    if (route.request().method() === "PATCH")
      conversions = route
        .request()
        .postDataJSON()
        .conversions.map((c: Record<string, unknown>) => ({
          ...c,
          factor: String(Number(c.stockQuantity) / Number(c.unitQuantity)),
        }));
    await route.fulfill({
      json: {
        baseUnit: pcs,
        canChangeBaseUnit: false,
        baseUnitLockReason: "Stock unit is protected by stock history.",
        conversions,
        options: [
          { unit: pcs, factor: "1", isStandard: true },
          ...conversions.map((c) => ({ ...c, unit: area, isStandard: false })),
        ],
      },
    });
  });
  await page.goto("/inventory/stock-a/edit");
  await expect(
    page.getByText("Stock unit is protected by stock history.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("combobox", { name: "Stock unit", exact: true }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Add alternative unit" }).click();
  await page
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .last()
    .click();
  await page.getByRole("option", { name: /Square metre/ }).click();
  await page.getByLabel("Stock reference quantity", { exact: true }).fill("1");
  await page
    .getByLabel("Alternative reference quantity", { exact: true })
    .fill("3");
  await page.getByText("Preview quantity and cost", { exact: true }).click();
  await page.getByLabel("Preview quantity", { exact: true }).fill("6");
  await page.getByLabel("Preview unit price", { exact: true }).fill("30");
  await expect(page.getByText("6 m2 = 2 pcs", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Stock unit cost: 90 per pcs. Total: 180.", { exact: true }),
  ).toBeVisible();
  const pending = page.waitForRequest(
    (r) =>
      r.url().includes("/api/backend/units/items/") && r.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save unit settings" }).click();
  expect((await pending).postDataJSON()).toEqual({
    conversions: [{ unitId: area.id, stockQuantity: 1, unitQuantity: 3 }],
  });
  await expect(
    page.getByText("Unit conversions saved", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Preview quantity", { exact: true }).fill("1");
  await expect(page.getByText(/This quantity does not fit/)).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole("button", { name: "Save unit settings" })
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("unused items allow base-unit correction with an explicit cost review", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inventory/stock-unused/edit");
  const selector = page
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .first();
  await expect(selector).toBeEnabled({ timeout: 15000 });
  await selector.click();
  await page.getByRole("option", { name: /Square metre/ }).click();
  await expect(
    page.getByText(
      "Save the corrected stock unit before configuring alternative units.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel(/Purchase price per/).fill("30");
  const pending = page.waitForRequest(
    (r) =>
      r.url().endsWith("/api/backend/inventory/stock-unused") &&
      r.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await pending).postDataJSON()).toMatchObject({
    unitId: "10000000-0000-4000-8000-000000000006",
    purchasePrice: 30,
  });
});


test("custom conversions can use units from a different measurement category", async ({ page }) => {
  await login(page);
  await page.goto("/inventory/stock-a/edit");
  await expect(page.getByRole("heading", { name: "Units and conversions" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Add alternative unit" }).click();
  await page.getByRole("combobox", { name: "Stock unit", exact: true }).last().click();
  await page.getByRole("option", { name: /Kilogram/ }).click();
  await page.getByLabel("Conversion factor", { exact: true }).last().fill("5");
  const pending = page.waitForRequest(r => r.url().includes("/api/backend/units/items/") && r.method() === "PATCH");
  await page.getByRole("button", { name: "Save unit settings" }).click();
  expect((await pending).postDataJSON().conversions.at(-1).factor).toBe(5);
  await expect(page.getByText("Unit conversions saved", { exact: true })).toBeVisible();
});
