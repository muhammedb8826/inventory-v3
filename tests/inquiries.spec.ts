import { test, expect, type Page } from "@playwright/test";
const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const m = {
  id: id(1),
  code: "M",
  name: "Metre",
  symbol: "m",
  category: "LENGTH",
  decimalPlaces: 3,
  isActive: true,
  requiresReview: false,
};
const roll = {
  ...m,
  id: id(2),
  code: "ROLL",
  name: "Roll",
  symbol: "roll",
  category: "COUNT",
  decimalPlaces: 0,
};
const m2 = {
  ...m,
  id: id(3),
  code: "M2",
  name: "Square metre",
  symbol: "m2",
  category: "AREA",
};
const cloth = {
  id: id(11),
  description: "Upholstery fabric",
  sku: "FAB-01",
  unitId: m.id,
  unit: "m",
  stockUnit: m,
  itemType: "FINISHED",
  isActive: true,
};
const panel = {
  id: id(12),
  description: "Oak tabletop",
  sku: "TOP-01",
  unitId: m2.id,
  unit: "m2",
  stockUnit: m2,
  itemType: "FINISHED",
  isActive: true,
};
const stock = [cloth, panel].map((item, i) => ({
  id: id(30 + i),
  itemId: item.id,
  item,
  quantity: "200.000",
  purchasePrice: "10",
  reserved: "0.000",
  reorderPoint: null,
  locationId: "loc-a",
  location: { id: "loc-a", name: "Main warehouse" },
}));
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
async function setup(
  page: Page,
  options: {
    existing?: boolean;
    converted?: boolean;
    failUpload?: boolean;
    currentFactor?: number;
    status?: string;
    readOnly?: boolean;
  } = {},
) {
  let posts = 0,
    uploads = 0,
    patch: Record<string, unknown> | undefined,
    submitted: Record<string, unknown> | undefined;
  let record: Record<string, unknown> = {
    id: id(100),
    contactName: "Amina",
    phone: "0911000000",
    email: null,
    subject: "Dining chairs",
    message: "Blue finish",
    status: options.status ?? (options.converted ? "CONVERTED" : "QUOTED"),
    priority: "NORMAL",
    source: "INTERNAL",
    customerId: "customer-a",
    assignmentStatus: "ACCEPTED",
    assignedToUserId: "test-admin",
    assignedTo: { id: "test-admin", fullName: "Test operator" },
    createdBy: { id: "test-admin", fullName: "Test operator" },
    customer: { id: "customer-a", name: "Acacia Studio" },
    requestedDeliveryDate: "2030-11-15",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    convertedSaleId: options.converted ? id(200) : null,
    attachments: [],
    lines: [
      {
        id: id(111),
        itemId: cloth.id,
        item: cloth,
        quantity: "100.000",
        notes: "Blue",
        unitSnapshot: {
          unitId: roll.id,
          code: roll.code,
          symbol: roll.symbol,
          category: "COUNT",
          decimalPlaces: 0,
          factor: "50",
          quantity: "2",
        },
      },
    ],
  };
  await page.route(/\/api\/backend\/inventory(?:\?|$)/, (route) =>
    route.fulfill({
      json: {
        data: stock,
        meta: { page: 1, limit: 1000, total: 2, totalPages: 1 },
      },
    }),
  );
  await page.route("**/api/backend/units/items/*", (route) => {
    const area = route.request().url().endsWith(panel.id),
      base = area ? m2 : m;
    return route.fulfill({
      json: {
        baseUnit: base,
        conversions: [],
        options: [
          { unit: base, factor: "1" },
          ...(!area
            ? [
                {
                  unit: roll,
                  factor: String(options.currentFactor ?? 50),
                  salesDefault: true,
                },
              ]
            : []),
        ],
      },
    });
  });
  if (options.readOnly) {
    const reader = {
      id: "reader",
      fullName: "Inquiry reader",
      email: "reader@example.test",
      role: {
        id: "reader-role",
        name: "Reader",
        permissions: ["inquiries.read"],
      },
    };
    await page.route("**/api/backend/auth/me", (route) =>
      page.url().endsWith("/login")
        ? route.fallback()
        : route.fulfill({ json: reader }),
    );
  }
  await page.route("**/api/backend/inquiries**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path.endsWith("/catalog"))
      return route.fulfill({
        json: {
          data: [cloth, panel],
          meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
        },
      });
    const workflowAction = path.match(
      /\/(claim|accept|decline|confirm|close)$/,
    )?.[1];
    if (workflowAction && req.method() === "POST") {
      if (workflowAction === "claim" || workflowAction === "accept")
        record = {
          ...record,
          status: "IN_PROGRESS",
          assignmentStatus: "ACCEPTED",
          assignedToUserId: "test-admin",
        };
      if (workflowAction === "decline")
        record = {
          ...record,
          assignmentStatus: "DECLINED",
          assignedToUserId: null,
        };
      if (workflowAction === "confirm")
        record = { ...record, status: "QUOTED" };
      if (workflowAction === "close") record = { ...record, status: "CLOSED" };
      return route.fulfill({ status: 201, json: record });
    }
    if (req.method() === "DELETE") {
      record = { ...record, status: "CANCELLED" };
      return route.fulfill({ json: record });
    }
    if (path.endsWith("/attachments")) {
      uploads++;
      if (options.failUpload && uploads === 1)
        return route.fulfill({
          status: 500,
          json: { message: "Upload interrupted" },
        });
      return route.fulfill({ status: 201, json: [] });
    }
    if (path.endsWith("/inquiries") && req.method() === "POST") {
      posts++;
      submitted = req.postDataJSON();
      const body = submitted as {
        lines?: {
          itemId: string;
          quantity: number;
          unitId?: string;
          dimensions?: object;
        }[];
      };
      record = {
        ...record,
        ...submitted,
        status: "NEW",
        lines:
          body.lines?.map((l, i) => {
            const item = l.itemId === panel.id ? panel : cloth,
              unit = l.unitId === roll.id ? roll : item === panel ? m2 : m,
              factor = unit.id === roll.id ? 50 : 1;
            return {
              ...l,
              id: id(110 + i),
              item,
              quantity: String(l.quantity * factor),
              unitSnapshot: {
                unitId: unit.id,
                code: unit.code,
                symbol: unit.symbol,
                decimalPlaces: unit.decimalPlaces,
                factor: String(factor),
                quantity: String(l.quantity),
                dimensions: l.dimensions,
              },
            };
          }) ?? [],
      };
      return route.fulfill({ status: 201, json: record });
    }
    if (req.method() === "PATCH") {
      patch = req.postDataJSON();
      record = { ...record, ...patch };
      return route.fulfill({ json: record });
    }
    if (path.endsWith(id(100))) return route.fulfill({ json: record });
    return route.fulfill({
      json: {
        data: options.existing || posts ? [record] : [],
        totals: {
          total: options.existing || posts ? 1 : 0,
          byStatus:
            options.existing || posts ? { [String(record.status)]: 1 } : {},
        },
        meta: {
          page: 1,
          limit: 20,
          total: options.existing || posts ? 1 : 0,
          totalPages: 1,
        },
      },
    });
  });
  return {
    get posts() {
      return posts;
    },
    get uploads() {
      return uploads;
    },
    get patch() {
      return patch;
    },
    get submitted() {
      return submitted;
    },
  };
}
async function contact(page: Page) {
  await expect(page.getByLabel("Contact name", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Phone", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Subject", { exact: true })).toHaveCount(0);
}
async function product(page: Page, name: string) {
  await page
    .getByRole("combobox", { name: "Product", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: new RegExp(name) }).click();
}

test("inquiry uses grouped sections, live unit conversion, delivery date and private uploads", async ({
  page,
}) => {
  const state = await setup(page);
  await login(page);
  await page.goto("/inquiries/new");
  await contact(page);
  await product(page, "Upholstery fabric");
  await expect(
    page.getByRole("combobox", { name: "Transaction unit" }),
  ).toContainText("Roll");
  await page.getByLabel("Quantity for product 1", { exact: true }).fill("2");
  await expect(page.getByText(/100.*m in stock units/)).toBeVisible();
  await page
    .getByLabel("Requested delivery date", { exact: true })
    .fill("2030-11-15");
  await page
    .getByLabel("Reference attachments", { exact: true })
    .setInputFiles({
      name: "reference.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nReference"),
    });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/inquiry-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/inquiry-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save inquiry", exact: true }).click();
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  expect(state.submitted).toMatchObject({
    requestedDeliveryDate: "2030-11-15",
    lines: [{ itemId: cloth.id, quantity: 2, unitId: roll.id }],
  });
  expect(state.uploads).toBe(1);
});
test("area inquiry records dimensions and calculated quantity", async ({
  page,
}) => {
  const state = await setup(page);
  await login(page);
  await page.goto("/inquiries/new");
  await contact(page);
  await product(page, "Oak tabletop");
  await page
    .getByRole("button", { name: "Calculate width x length", exact: true })
    .click();
  await page.getByLabel("Width (m)", { exact: true }).fill("1.5");
  await page.getByLabel("Length (m)", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Use calculated area", exact: true })
    .click();
  await expect(
    page.getByLabel("Quantity for product 1", { exact: true }),
  ).toHaveValue("3");
  await page.getByRole("button", { name: "Save inquiry", exact: true }).click();
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  expect(state.submitted).toMatchObject({
    lines: [
      {
        quantity: 3,
        unitId: m2.id,
        dimensions: { widthMetres: 1.5, lengthMetres: 2, count: 1 },
      },
    ],
  });
});
test("upload retry updates the saved inquiry instead of creating a duplicate", async ({
  page,
}) => {
  const state = await setup(page, { failUpload: true });
  await login(page);
  await page.goto("/inquiries/new");
  await contact(page);
  await page
    .getByLabel("Requirements / remarks", { exact: true })
    .fill("Custom upholstery consultation");
  await page
    .getByLabel("Reference attachments", { exact: true })
    .setInputFiles({
      name: "reference.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nReference"),
    });
  await page.getByRole("button", { name: "Save inquiry", exact: true }).click();
  await expect(
    page.getByText("Upload interrupted", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  expect(state.posts).toBe(1);
  expect(state.uploads).toBe(2);
});
test("metadata edits preserve the saved measurements and sale links are read-only", async ({
  page,
}) => {
  const state = await setup(page, {
    existing: true,
    converted: true,
    currentFactor: 40,
  });
  await login(page);
  await page.goto(`/inquiries/${id(100)}/edit`);
  const dialog = page.locator("main");
  await expect(dialog.getByLabel("Contact name", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByLabel("Converted sale ID", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Create sale", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByLabel("Quantity for product 1", { exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Requirements / remarks", { exact: true })
    .fill("Revised requirements");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.getByText("Inquiry updated", { exact: true }),
  ).toBeVisible();
  expect(state.patch?.lines).toBeUndefined();
  expect(state.patch?.convertedSaleId).toBeUndefined();
});
test("inquiry-to-sale prefill retains the original entered quantity and conversion", async ({
  page,
}) => {
  await setup(page, { existing: true, currentFactor: 40 });
  await login(page);
  await page.goto(`/sales/new?inquiryId=${id(100)}`);
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("2");
  await expect(
    page.getByRole("combobox", { name: "Transaction unit" }),
  ).toContainText("Roll");
  await expect(page.getByText(/100.*m in stock units/)).toBeVisible();
  await expect(
    page.getByText("Using the saved inquiry conversion for this unit.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("editing is separate from workflow actions and returns to read-only details", async ({
  page,
}) => {
  await setup(page, { existing: true });
  await login(page);
  await page.goto(`/inquiries/${id(100)}/edit`);
  await page
    .getByLabel("Requirements / remarks", { exact: true })
    .fill("Updated request");
  await expect(
    page.getByRole("button", { name: "Start production", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create sale", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  await expect(
    page.getByRole("heading", { name: "Products requested" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Requirements / remarks", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create sale", exact: true }),
  ).toBeVisible();
});

for (const existing of [false, true]) {
  test(`attachment chooser keeps the ${existing ? "inquiry edit page" : "inquiry page"} unclipped`, async ({
    page,
  }) => {
    await setup(page, { existing });
    await login(page);
    await page.goto(existing ? `/inquiries/${id(100)}/edit` : "/inquiries/new");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const picker = page.getByRole("button", {
        name: /Choose files or drag and drop/,
      });
      await picker.scrollIntoViewIfNeeded();
      await expect(picker).toBeInViewport();
      const chooserPromise = page.waitForEvent("filechooser");
      await picker.click();
      const chooser = await chooserPromise;
      await chooser.setFiles({
        name: `reference-${width}.pdf`,
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nReference"),
      });
      await expect(
        page.getByRole("button", {
          name: `Remove pending attachment reference-${width}.pdf`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(picker).toBeFocused();
      const clipped = await picker.evaluate((element) => {
        const shifted: string[] = [];
        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          if (
            ["hidden", "clip"].includes(getComputedStyle(parent).overflowY) &&
            Math.abs(parent.scrollTop) > 1
          )
            shifted.push(
              `${parent.tagName}.${parent.className}: ${parent.scrollTop}`,
            );
        }
        return shifted;
      });
      expect(clipped).toEqual([]);
      const save = page.getByRole("button", {
        name: existing ? "Save changes" : "Save inquiry",
        exact: true,
      });
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport();
      await picker.scrollIntoViewIfNeeded();
      await expect(picker).toBeInViewport();
    }
  });
}

test("list actions open pages and requirements progress through explicit actions", async ({
  page,
}) => {
  await setup(page, { existing: true, status: "NEW" });
  await login(page);
  await page.goto("/inquiries");
  await expect(
    page.getByRole("region", { name: "Inquiry overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Actions for INQ-20000000", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/inquiry-list-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const metrics = await page
    .getByRole("region", { name: "Inquiry overview" })
    .boundingBox();
  expect(metrics!.height).toBeLessThan(350);
  await page.screenshot({
    path: "test-results/inquiry-list-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page
    .getByRole("button", { name: "Actions for INQ-20000000", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "View details", exact: true })
    .click();
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Inquiry progress" }),
  ).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  await page
    .getByRole("button", { name: "Confirm requirements", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm requirements", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create sale", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Confirmed/);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/inquiry-details-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/inquiry-details-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Actions for INQ-20000000", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Close inquiry", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Close inquiry", exact: true })
    .click();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Closed/);
  await expect(
    page.getByRole("link", { name: "Edit", exact: true }),
  ).toHaveCount(0);
});

test("read-only employees can review details but cannot edit or progress an inquiry", async ({
  page,
}) => {
  await setup(page, { existing: true, readOnly: true });
  await login(page);
  await page.goto(`/inquiries/${id(100)}`);
  await expect(
    page.getByRole("heading", { name: "Products requested" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create sale", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/inquiries/${id(100)}/edit`);
  await expect(
    page.getByRole("heading", { name: /have access to this page/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toHaveCount(0);
});

test("legacy inquiry links redirect to the details page", async ({ page }) => {
  await setup(page, { existing: true });
  await login(page);
  await page.goto(`/inquiries?id=${id(100)}`);
  await page.waitForURL(new RegExp(`/inquiries/${id(100)}$`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("production uses a focused action dialog and preserves the selected inquiry line", async ({
  page,
}) => {
  await setup(page, { existing: true });
  let payload: Record<string, unknown> | undefined;
  await page.route(
    "**/api/backend/production-orders/from-inquiry",
    async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { id: id(300) } });
    },
  );
  await page.route(`**/api/backend/production-orders/${id(300)}`, (route) =>
    route.fulfill({
      json: { id: id(300), status: "DRAFT", quantityPlanned: "100", lines: [] },
    }),
  );
  await login(page);
  await page.goto(`/inquiries/${id(100)}`);
  await page
    .getByRole("button", { name: "Actions for INQ-20000000", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Start production", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Product to produce", { exact: true }),
  ).toHaveValue(cloth.id);
  await expect(
    dialog.getByLabel("Requirements / remarks", { exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Create production order", exact: true })
    .click();
  await page.waitForURL(new RegExp(`/production-orders/${id(300)}$`));
  expect(payload).toMatchObject({
    inquiryId: id(100),
    inquiryLineId: id(111),
    itemId: cloth.id,
    locationId: "loc-a",
    finishedLocationId: "loc-a",
  });
});
