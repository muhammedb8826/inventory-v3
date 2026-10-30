import { test, expect } from "@playwright/test";
test("configure a reusable group once and select it on a new item", async ({
  page,
}) => {
  let groups: Record<string, unknown>[] = [];
  await page.route("**/api/backend/units/groups", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      groups = [
        {
          ...body,
          id: "20000000-0000-4000-8000-000000000099",
          baseUnit: { id: body.baseUnitId, name: "Piece", symbol: "pcs" },
        },
      ];
      await route.fulfill({ json: groups[0] });
    } else await route.fulfill({ json: groups });
  });
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/units");
  await page.getByRole("button", { name: "New category", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Category name", { exact: true })
    .fill("Boxes of ten");
  await dialog
    .getByLabel("Measurement category", { exact: true })
    .selectOption("COUNT");
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .click();
  await page.getByRole("option", { name: /Piece/ }).click();
  await dialog.getByRole("button", { name: "Add a line", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .last()
    .click();
  await page.getByRole("option", { name: /Box/ }).click();
  await dialog.getByLabel("Conversion ratio", { exact: true }).fill("10");
  await dialog
    .getByText("Purchasing and sales defaults", { exact: true })
    .click();
  await dialog
    .getByLabel("Default purchase unit", { exact: true })
    .selectOption("10000000-0000-4000-8000-000000000011");
  await dialog
    .getByRole("button", { name: "Save category", exact: true })
    .click();
  await expect(page.getByText("Category saved", { exact: true })).toBeVisible();
  expect(groups[0].conversions).toEqual([
    expect.objectContaining({ factor: 10, purchaseDefault: true }),
  ]);
  await page.getByRole("button", { name: "Boxes of ten", exact: true }).click();
  await expect(
    dialog.getByText("Reference unit", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    dialog.getByText("Bigger than reference", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/unit-category-details-desktop.png",
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    dialog.getByRole("button", { name: "Save category", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "test-results/unit-category-details-mobile.png",
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search categories", exact: true })
    .fill("not-a-category");
  await expect(
    page.getByText("No unit categories", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search categories", exact: true })
    .fill("Boxes");
  await expect(
    page.getByRole("button", { name: "Boxes of ten", exact: true }),
  ).toBeVisible();
  await page.goto("/inventory/new");
  await page
    .getByRole("combobox", { name: "Unit category", exact: true })
    .click();
  await page.getByRole("option", { name: /Boxes of ten/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Stock unit", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "The selected category supplies the stock unit and all conversions.",
      { exact: true },
    ),
  ).toBeVisible();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("measurement categories reject unrelated units while explicit profiles allow rolls", async ({
  page,
}) => {
  const m = {
    id: "30000000-0000-4000-8000-000000000001",
    code: "M",
    name: "Metre",
    symbol: "m",
    category: "LENGTH",
    decimalPlaces: 3,
    isActive: true,
    requiresReview: false,
  };
  const cm = {
    ...m,
    id: "30000000-0000-4000-8000-000000000002",
    code: "CM",
    name: "Centimetre",
    symbol: "cm",
  };
  const kg = {
    ...m,
    id: "30000000-0000-4000-8000-000000000003",
    code: "KG",
    name: "Kilogram",
    symbol: "kg",
    category: "MASS",
  };
  const roll = {
    ...m,
    id: "30000000-0000-4000-8000-000000000004",
    code: "ROLL",
    name: "Roll",
    symbol: "roll",
    category: "COUNT",
    decimalPlaces: 0,
  };
  await page.route("**/api/backend/units", (route) =>
    route.fulfill({ json: [m, cm, kg, roll] }),
  );
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/backend/units/groups", (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: { ...saved, id: "group", baseUnit: m },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/units");
  await page.getByRole("button", { name: "New category", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Measurement category", { exact: true })
    .selectOption("LENGTH");
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .click();
  await expect(page.getByRole("option", { name: /Kilogram/ })).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Roll/ })).toHaveCount(0);
  await page
    .getByRole("option", { name: /Metre/, exact: false })
    .filter({ hasText: "Metre (m)" })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Add a line", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .last()
    .click();
  await expect(page.getByRole("option", { name: /Kilogram/ })).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Roll/ })).toHaveCount(0);
  await page.getByRole("option", { name: /Centimetre/ }).click();
  await expect(
    dialog.getByLabel("Conversion ratio", { exact: true }),
  ).toHaveValue("0.01");
  await expect(
    dialog.getByLabel("Conversion ratio", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Packaging profiles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New packaging profile", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Profile name", { exact: true })
    .fill("Fabric roll - 50 m");
  await dialog
    .getByLabel("Measurement category", { exact: true })
    .selectOption("LENGTH");
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .click();
  await page
    .getByRole("option", { name: /Metre/ })
    .filter({ hasText: "Metre (m)" })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Add a line", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Stock unit", exact: true })
    .last()
    .click();
  await expect(page.getByRole("option", { name: /Kilogram/ })).toHaveCount(0);
  await page.getByRole("option", { name: /Roll/ }).click();
  await dialog.getByLabel("Conversion ratio", { exact: true }).fill("50");
  await dialog
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await expect(
    page.getByText("Packaging profile saved", { exact: true }),
  ).toBeVisible();
  expect(saved).toMatchObject({
    kind: "PACKAGING",
    category: "LENGTH",
    baseUnitId: m.id,
    conversions: [{ unitId: roll.id, factor: 50 }],
  });
});

test("invalid existing standard ratios require explicit review before saving", async ({
  page,
}) => {
  const m = {
    id: "40000000-0000-4000-8000-000000000001",
    code: "M",
    name: "Metre",
    symbol: "m",
    category: "LENGTH",
    decimalPlaces: 3,
    isActive: true,
    requiresReview: false,
  };
  const cm = {
    ...m,
    id: "40000000-0000-4000-8000-000000000002",
    code: "CM",
    name: "Centimetre",
    symbol: "cm",
  };
  let group = {
    id: "40000000-0000-4000-8000-000000000003",
    kind: "CATEGORY",
    name: "Legacy length",
    category: "LENGTH",
    baseUnitId: m.id,
    baseUnit: m,
    conversions: [{ unitId: cm.id, factor: "0.02" }],
    isActive: true,
    requiresReview: true,
    reviewIssues: ["A standard metre is 100 centimetres."],
  };
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/backend/units", (route) =>
    route.fulfill({ json: [m, cm] }),
  );
  await page.route("**/api/backend/units/groups**", (route) => {
    if (route.request().method() === "PATCH") {
      body = route.request().postDataJSON();
      group = {
        ...group,
        requiresReview: false,
        reviewIssues: [],
        conversions: [{ unitId: cm.id, factor: "0.01" }],
      };
      return route.fulfill({ json: group });
    }
    return route.fulfill({ json: [group] });
  });
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/units");
  await expect(
    page.getByText("Review required", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Legacy length", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "Historical stock and transactions are unchanged",
  );
  await expect(
    dialog.getByLabel("Conversion ratio", { exact: true }),
  ).toHaveValue("0.02");
  await dialog
    .getByRole("button", { name: "Apply standard ratio", exact: true })
    .click();
  await expect(
    dialog.getByLabel("Conversion ratio", { exact: true }),
  ).toHaveValue("0.01");
  await dialog
    .getByRole("button", { name: "Save category", exact: true })
    .click();
  await expect(page.getByText("Category saved", { exact: true })).toBeVisible();
  expect(body?.conversions).toEqual([
    expect.objectContaining({
      unitId: cm.id,
      stockQuantity: 1,
      unitQuantity: 100,
    }),
  ]);
});
