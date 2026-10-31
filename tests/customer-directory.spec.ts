import { expect, test, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL("**/dashboard");
}
async function directory(page: Page, newestFirst = false) {
  const customers = Array.from({ length: 25 }, (_, i) => ({
    id: `directory-${i}`,
    name: i === 24 ? "Zulu Existing" : `Original ${String(i).padStart(2, "0")}`,
    phone: `254700${String(i).padStart(6, "0")}`,
    isActive: true,
  }));
  const pages: number[] = [];
  let creates = 0;
  await page.route("**/api/backend/customers**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (req.method() === "POST") {
      creates++;
      const body = req.postDataJSON();
      const customer = {
        ...body,
        id: "new-directory-customer",
        isActive: true,
      };
      if (newestFirst) customers.unshift(customer);
      else customers.push(customer);
      await route.fulfill({ status: 201, json: customer });
      return;
    }
    const number = Number(url.searchParams.get("page") ?? 1),
      search = url.searchParams.get("search")?.toLowerCase() ?? "";
    pages.push(number);
    const filtered = customers.filter((c) =>
      `${c.name} ${c.phone}`.toLowerCase().includes(search),
    );
    // Simulate a server returning ten rows per page, even when a picker requests more.
    await route.fulfill({
      json: {
        data: filtered.slice((number - 1) * 10, number * 10),
        meta: {
          page: number,
          limit: 10,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / 10)),
        },
      },
    });
  });
  return { pages, creates: () => creates };
}
test("inquiry finds customers beyond page one and retains newly created selections after reload", async ({
  page,
}) => {
  const state = await directory(page);
  await login(page);
  await page.goto("/inquiries/new");
  const picker = page.getByRole("combobox", { name: "Customer", exact: true });
  await expect.poll(() => state.pages.includes(3)).toBe(true);
  await picker.click();
  await page
    .getByRole("textbox", { name: /Search customer/ })
    .fill("Zulu Existing");
  await page.getByRole("button", { name: /Zulu Existing/ }).click();
  await expect(picker).toContainText("Zulu Existing");
  await page.getByRole("button", { name: "New customer", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "New customer",
    exact: true,
  });
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Zulu Newly Added");
  await expect(
    dialog.getByRole("textbox", { name: "Phone", exact: true }),
  ).not.toHaveAttribute("required", "");
  const lastPage = page.waitForResponse(
    (r) =>
      r.url().includes("/api/backend/customers?") &&
      new URL(r.url()).searchParams.get("page") === "3",
  );
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await lastPage;
  await expect(dialog).not.toBeVisible();
  await expect(picker).toContainText("Zulu Newly Added");
  await picker.click();
  await page
    .getByRole("textbox", { name: /Search customer/ })
    .fill("Zulu Newly Added");
  await expect(
    page.getByRole("button", { name: /Zulu Newly Added/ }),
  ).toBeVisible();
});
test("customer list allows an optional phone and shows the newly created customer after clearing a search", async ({
  page,
}) => {
  await directory(page, true);
  await login(page);
  await page.goto("/customers");
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  await search.fill("Original 01");
  await expect(
    page.getByRole("cell", { name: "Original 01", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "New Customers",
    exact: true,
  });
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Fresh customer");
  const phone = dialog.getByRole("textbox", { name: "Phone", exact: true });
  await expect(phone).not.toHaveAttribute("required", "");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("cell", { name: "Fresh customer", exact: true }),
  ).toBeVisible();
});
