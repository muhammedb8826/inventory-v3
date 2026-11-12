import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "101d4fcd-b089-4729-981d-6d15df24f523";
const unit = {
  id: "10000000-0000-4000-8000-000000000005",
  code: "CM",
  name: "Centimetre",
  symbol: "cm",
  category: "LENGTH",
  decimalPlaces: 3,
  isActive: true,
  requiresReview: false,
};
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/apps");
}
for (const width of [1280, 390]) {
  test(`historical catalog item stays editable without stock at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    let item = {
      id,
      description: "Cinema Cloth (Cream)",
      sku: "CC-CRM-001",
      unitId: unit.id,
      unit: "cm",
      stockUnit: unit,
      unitGroupId: null,
      unitConversions: [],
      itemType: "RAW",
      isActive: true,
      stockUnitLocked: true,
      stock: { onHand: "0", reserved: "0", available: "0", stockValue: "0" },
      stockBalances: [],
      salesPrice: "1.0000000000",
      effectiveSalesPrice: "1.0000000000",
      imageUrl: "/uploads/items/item-101d4fcd.png",
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
    };
    let patch: unknown;
    await page.route("**/api/backend/items**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "PATCH") {
        patch = route.request().postDataJSON();
        item = {
          ...item,
          ...route.request().postDataJSON(),
          updatedAt: new Date().toISOString(),
        };
        await route.fulfill({ json: item });
      } else
        await route.fulfill({
          json: path.endsWith(id)
            ? item
            : {
                data: [item],
                meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
              },
        });
    });
    await page.route("**/api/backend/units**", (route) =>
      route.fulfill({
        json: route.request().url().includes("/groups")
          ? []
          : route.request().url().includes("/items/")
            ? {
                conversions: [],
                stockUnit: unit,
                baseUnit: unit,
                options: [{ unit, factor: "1" }],
              }
            : [unit],
      }),
    );
    await page.route("**/api/item-media/item-101d4fcd.png", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xwAAAABJRU5ErkJggg==",
          "base64",
        ),
      }),
    );
    await page.goto("/items");
    await page.waitForURL("**/inventory/products");
    await expect(
      page.getByRole("heading", { name: "Products", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Stock views" }),
    ).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Search products" })
      .fill("CC-CRM-001");
    const productRow =
      width >= 768
        ? page.getByRole("row").filter({ hasText: "Cinema Cloth (Cream)" })
        : page.getByRole("article").filter({ hasText: "Cinema Cloth (Cream)" });
    await expect(productRow.getByText("0 cm", { exact: true })).toBeVisible();
    if (width < 768) {
      await expect(
        productRow
          .locator(":scope > div")
          .first()
          .getByRole("link", { name: "Cinema Cloth (Cream)", exact: true }),
      ).toBeVisible();
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/inventory-products-${width}.png`,
      fullPage: true,
    });
    const listAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(listAudit.violations).toEqual([]);
    await productRow
      .getByRole("checkbox", { name: `Select record ${id}` })
      .check();
    await page
      .getByRole("button", { name: "Archive selected", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect.poll(() => item.isActive).toBe(false);
    await expect(
      productRow.getByText("Archived", { exact: true }),
    ).toBeVisible();
    await productRow
      .getByRole("checkbox", { name: `Select record ${id}` })
      .check();
    await page
      .getByRole("button", { name: "Restore selected", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect.poll(() => item.isActive).toBe(true);
    await page
      .getByRole("link", { name: "Cinema Cloth (Cream)", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Cinema Cloth (Cream)", exact: true }),
    ).toBeVisible();
    const image = page.getByRole("img", {
      name: "Cinema Cloth (Cream)",
      exact: true,
    });
    await expect(image).toBeVisible();
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect(
      page.getByText("No stock held at your permitted locations.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit item", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Item name", exact: true })
      .fill("Cinema Cloth – Cream");
    await page.getByRole("button", { name: "Save item", exact: true }).click();
    await expect
      .poll(() => patch)
      .toMatchObject({
        description: "Cinema Cloth – Cream",
        sku: "CC-CRM-001",
        unitId: unit.id,
      });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/catalog-item-${width}.png`,
      fullPage: true,
    });
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
  test(`sales approval and warehouse actions follow state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    const order = {
      id,
      state: "PENDING_APPROVAL",
      locationId: "location-a",
      total: "8000.00",
      createdById: "another-salesperson",
      approvedById: null,
      saleId: null,
      payload: {
        lines: [{ itemId: id, quantity: 8000, unitPrice: 1 }],
        paymentMethod: "CREDIT",
      },
      priceExceptions: ["CC-CRM-001: requested price differs from standard"],
      normalizedLines: [
        {
          itemId: id,
          quantity: 8000,
          unitPrice: 1,
          unitSnapshot: {
            unitId: unit.id,
            symbol: "cm",
            quantity: "8000",
            unitPrice: "1",
            factor: "1",
          },
        },
      ],
      items: [{ id, description: "Cinema Cloth – Cream" }],
      history: [
        {
          action: "Submitted for price approval",
          actorId: "another-salesperson",
          actorName: "Sales user",
          at: "2026-11-01T10:00:00Z",
        },
      ],
    };
    await page.route(`**/api/backend/sales-orders/${id}**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "POST") {
        if (path.endsWith("/approve")) order.state = "APPROVED";
        if (path.endsWith("/confirm")) order.state = "CONFIRMED";
        if (path.endsWith("/deliver")) order.state = "DELIVERED";
      }
      await route.fulfill({
        status: route.request().method() === "POST" ? 201 : 200,
        json: order,
      });
    });
    await page.goto(`/sales-orders/${id}`);
    await expect(
      page.getByRole("button", { name: "Confirm & reserve stock" }),
    ).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Approval decision reason" })
      .fill("Approved customer contract");
    await page
      .getByRole("button", { name: "Approve prices", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm & reserve stock" }).click();
    await page
      .getByRole("button", { name: "Validate delivery & post invoice" })
      .click();
    await expect(
      page.getByText("Delivered · invoice posted", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Validate delivery & post invoice" }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });
}

test("item images use the server backend origin and reject unsupported files", async ({
  request,
}) => {
  const response = await request.get("/api/item-media/item-proxy-test.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect((await response.body()).length).toBeGreaterThan(20);
  expect((await request.get("/api/item-media/item-script.svg")).status()).toBe(
    404,
  );
});

test("purchase and sales forms can select a catalog item with no stock row", async ({
  page,
}) => {
  await login(page);
  const item = {
    id,
    description: "Cinema Cloth (Cream)",
    sku: "CC-CRM-001",
    unitId: unit.id,
    stockUnit: unit,
    unit: "cm",
    itemType: "RAW",
    isActive: true,
    salesPrice: "1",
    effectiveSalesPrice: "1",
  };
  await page.route("**/api/backend/items?**", (route) =>
    route.fulfill({
      json: {
        data: [item],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
    }),
  );
  await page.route("**/api/backend/units/items/**", (route) =>
    route.fulfill({
      json: {
        baseUnit: unit,
        options: [
          { unit, factor: "1", salesDefault: true, purchaseDefault: true },
        ],
        conversions: [],
      },
    }),
  );
  for (const path of ["/purchases/new", "/sales/new"]) {
    await page.goto(path);
    await page.getByRole("combobox", { name: "Location", exact: true }).click();
    await page.getByRole("button", { name: /Main warehouse/ }).click();
    await page.getByRole("combobox", { name: "Item", exact: true }).click();
    await page.getByRole("button", { name: /CC-CRM-001/ }).click();
    await expect(
      page.getByRole("combobox", { name: "Item", exact: true }),
    ).toContainText("CC-CRM-001");
    if (path === "/sales/new")
      await expect(page.getByLabel("Unit price", { exact: true })).toHaveValue(
        "1",
      );
  }
});

test("delivered sales expose notes editing without commercial changes or void actions", async ({
  page,
}) => {
  await login(page);
  let patch: unknown;
  let sale = {
    id,
    status: "ACTIVE",
    commercialLocked: true,
    customerId: "customer-a",
    customer: { id: "customer-a", name: "Acacia Studio" },
    locationId: "loc-a",
    location: { id: "loc-a", name: "Main warehouse" },
    paymentMethod: "CREDIT",
    subtotal: "8000",
    total: "8000",
    notes: "",
    commissionPercent: "10",
    commissionBasis: "PROFIT",
    lines: [
      {
        id: "line-a",
        itemId: id,
        quantity: "8000",
        unitPrice: "1",
        lineTotal: "8000",
        purchaseCost: "0.5",
        item: {
          id,
          description: "Cinema Cloth (Cream)",
          unit: "cm",
          unitId: unit.id,
          stockUnit: unit,
        },
      },
    ],
  };
  await page.route(`**/api/backend/sales/${id}`, async (route) => {
    if (route.request().method() === "PATCH") {
      patch = route.request().postDataJSON();
      sale = { ...sale, ...route.request().postDataJSON() };
    }
    await route.fulfill({ json: sale });
  });
  await page.goto(`/sales/${id}`);
  await expect(
    page.getByRole("button", { name: "Void", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Edit notes", exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Delivery received by customer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() => patch)
    .toEqual({ notes: "Delivery received by customer" });
});
