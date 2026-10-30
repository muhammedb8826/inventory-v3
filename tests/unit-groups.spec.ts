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
