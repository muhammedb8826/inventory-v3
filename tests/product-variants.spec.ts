import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const FAMILY = "30000000-0000-4000-8000-000000000001";
const ATTR = "30000000-0000-4000-8000-000000000002";
const PCS = "10000000-0000-4000-8000-000000000001";
const unit = {
  id: PCS,
  name: "Piece",
  symbol: "pcs",
  code: "PCS",
  category: "COUNT",
  isActive: true,
  requiresReview: false,
  decimalPlaces: 0,
};
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
async function fixture(page: Page, existingFamily = false) {
  let attributes: Record<string, unknown>[] = existingFamily
    ? [
        {
          id: ATTR,
          name: "Finish",
          values: ["Black", "Natural"],
          isActive: true,
        },
      ]
    : [];
  let family: Record<string, unknown> | null = existingFamily
    ? {
        id: FAMILY,
        name: "Dining chair",
        itemType: "FINISHED",
        unitId: PCS,
        stockUnit: unit,
        unitGroupId: null,
        attributes: [{ attributeId: ATTR, values: ["Black", "Natural"] }],
        variants: [],
        isActive: true,
      }
    : null;
  let lastVariants: Record<string, unknown> | undefined;
  await page.route("**/api/backend/product-families**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/backend/product-families", "");
    const method = route.request().method();
    if (path === "/attributes") {
      if (method === "POST") {
        const body = route.request().postDataJSON();
        attributes = [{ ...body, id: ATTR }];
        await route.fulfill({ status: 201, json: attributes[0] });
      } else await route.fulfill({ json: attributes });
    } else if (path === "/catalog") {
      await route.fulfill({
        json: [
          {
            id: "existing-chair",
            description: "Existing chair",
            sku: "CHAIR-OLD",
            unitId: PCS,
            unitGroupId: null,
            itemType: "FINISHED",
            unitConversions: [],
          },
          {
            id: "wrong-unit",
            description: "Wrong unit item",
            unitId: "kg",
            itemType: "FINISHED",
          },
        ],
      });
    } else if (path === "") {
      if (method === "POST") {
        family = {
          ...route.request().postDataJSON(),
          id: FAMILY,
          stockUnit: unit,
          variants: [],
        };
        await route.fulfill({ status: 201, json: family });
      } else
        await route.fulfill({
          json: family
            ? [
                {
                  ...family,
                  variantCount: (family.variants as unknown[]).length,
                },
              ]
            : [],
        });
    } else if (path === `/${FAMILY}/variants` && method === "POST") {
      const body = route.request().postDataJSON();
      lastVariants = body;
      family!.variants = body.variants.map(
        (
          v: {
            values: { attributeId: string; value: string }[];
            existingItemId?: string;
            sku?: string;
          },
          index: number,
        ) => ({
          id: v.existingItemId ?? `variant-${index}`,
          description: v.existingItemId
            ? "Existing chair"
            : `Dining chair - ${v.values.map((a) => a.value).join(" / ")}`,
          sku: v.sku ?? "CHAIR-OLD",
          variantValues: v.values.map((a) => ({ ...a, name: "Finish" })),
          isActive: true,
          stocks: [
            {
              id: `variant-stock-${index}`,
              locationId: "loc-a",
              locationName: "Main warehouse",
              quantity: v.existingItemId ? "3" : "0",
              purchasePrice: v.existingItemId ? "25" : "0",
            },
          ],
        }),
      );
      await route.fulfill({ status: 201, json: family });
    } else if (path === `/${FAMILY}`) {
      if (method === "PATCH")
        family = { ...family, ...route.request().postDataJSON() };
      await route.fulfill({ json: family });
    } else await route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  return { lastVariants: () => lastVariants };
}

test("configure reusable attributes, preview selected combinations and create stock variants", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page);
  await page.goto("/product-attributes");
  await page
    .getByRole("button", { name: "New attribute", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Attribute name", exact: true })
    .fill("Finish");
  await page
    .getByRole("textbox", { name: "Values", exact: true })
    .fill("Black, Natural");
  await page
    .getByRole("button", { name: "Save attribute", exact: true })
    .click();
  await expect(
    page.getByText("Attribute saved", { exact: true }),
  ).toBeVisible();
  await page.goto("/products/new");
  await page
    .getByRole("textbox", { name: "Family name", exact: true })
    .fill("Dining chair");
  await page.getByLabel("Black", { exact: true }).check();
  await page.getByLabel("Natural", { exact: true }).check();
  const axe = await new AxeBuilder({ page }).include(".form-page").analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Create family", exact: true })
    .click();
  await page.waitForURL(`**/products/${FAMILY}`);
  await page
    .getByRole("button", { name: "Preview combinations", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "SKU: Black", exact: true })
    .fill("CHAIR-BLACK");
  await page.getByLabel("Natural", { exact: true }).last().uncheck();
  await page
    .getByRole("button", { name: "Create selected variants", exact: true })
    .click();
  await expect
    .poll(() => state.lastVariants())
    .toMatchObject({
      locationId: "loc-a",
      variants: [
        { sku: "CHAIR-BLACK", values: [{ attributeId: ATTR, value: "Black" }] },
      ],
    });
  await expect(
    page.getByText("Variants created with zero opening stock", { exact: true }),
  ).toBeVisible();
  const actions = page.getByRole("button", {
    name: "Actions for CHAIR-BLACK",
    exact: true,
  });
  await actions.click();
  await expect(
    page.getByRole("menuitem", { name: "Create variant BOM", exact: true }),
  ).toHaveAttribute("href", "/boms/new?finishedItemId=variant-0");
  await page.keyboard.press("Escape");
  await page.goto(`/products/${FAMILY}/edit`);
  await expect(page.getByLabel("Item type", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Unit configuration", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Black", { exact: true })).toBeDisabled();
});

test("links an existing item using compatible units and retains its identity", async ({
  page,
}) => {
  const state = await fixture(page, true);
  await login(page);
  await page.goto(`/products/${FAMILY}`);
  await page
    .getByRole("button", { name: "Link existing item", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Existing item", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Wrong unit item/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Existing chair/ }).click();
  await page
    .getByRole("button", { name: "Link item as variant", exact: true })
    .click();
  await expect
    .poll(() => state.lastVariants())
    .toMatchObject({
      variants: [
        {
          existingItemId: "existing-chair",
          values: [{ attributeId: ATTR, value: "Black" }],
        },
      ],
    });
  expect((state.lastVariants()!.variants as object[])[0]).not.toHaveProperty(
    "sku",
  );
  await expect(
    page.getByText("Existing item linked; stock and costing preserved", {
      exact: true,
    }),
  ).toBeVisible();
});

test("variant configuration stays usable on narrow mobile screens", async ({
  page,
}) => {
  await fixture(page, true);
  await login(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/products/${FAMILY}`);
    await page
      .getByRole("button", { name: "Preview combinations", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "SKU: Black", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const submit = page.getByRole('button', { name: 'Create selected variants', exact: true });
    await submit.scrollIntoViewIfNeeded();
    const buttonBox = await submit.boundingBox();
    const navigationBox = await page.getByRole('navigation', { name: 'Primary', exact: true }).boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navigationBox!.y);
    if (width === 390) await page.screenshot({ path: 'test-results/product-variants-mobile.png', fullPage: true });
  }
});

test('variant BOM creation opens with the exact item selected', async ({ page }) => {
  await fixture(page, true);
  await page.route('**/api/backend/inventory?*', async route => {
    await route.fulfill({ json: { data: [{ id: 'variant-stock', itemId: 'variant-bom-item', locationId: 'loc-a', quantity: '0', purchasePrice: '0', item: { id: 'variant-bom-item', description: 'Dining chair - Black', sku: 'CHAIR-BLACK', itemType: 'FINISHED', unitId: PCS, stockUnit: unit }, location: { id: 'loc-a', name: 'Main warehouse' } }], page: 1, limit: 200, total: 1, totalPages: 1 } });
  });
  await login(page);
  await page.goto('/boms/new?finishedItemId=variant-bom-item');
  await expect(page.getByRole('combobox', { name: 'Finished item', exact: true })).toContainText('Dining chair - Black');
});
