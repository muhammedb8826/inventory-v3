import { createServer } from "node:http";
import { spawn } from "node:child_process";
const user = {
  id: "test-admin",
  email: "test@example.test",
  fullName: "Test operator",
  role: {
    id: "admin",
    name: "Administrator",
    permissions: [
      "sales.write",
      "purchase.write",
      "locations.all",
      "inventory.write",
      "inventory.adjust",
      "inventory.delete",
      "customers.read",
      "customers.write",
      "users.read",
      "users.write",
      "inventory.read",
      "sales.read",
      "purchase.read",
      "dashboard.read",
      "reports.read",
      "locations.read",
      "bank.read",
      "credit.read",
      "expense.read",
      "bom.read",
      "production.read",
      "stock_transfer.read",
      "stocktake.read",
      "inquiries.read",
      "roles.read",
      "settings.read",
      "profit_loss.read",
      "notifications.read",
      "messages.read",
      "messages.write",
    ],
  },
};
const customers = [
  {
    id: "customer-a",
    name: "Acacia Studio",
    email: "hello@acacia.test",
    isActive: true,
  },
  {
    id: "customer-b",
    name: "Birch Workshop",
    email: "hello@birch.test",
    isActive: true,
  },
  {
    id: "customer-c",
    name: "Cedar House",
    email: "hello@cedar.test",
    isActive: true,
  },
];
for (const customer of customers)
  Object.assign(customer, {
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-28T10:30:00.000Z",
    address: "Addis Ababa",
  });
const locations = [
  { id: "loc-a", name: "Main warehouse", type: "WAREHOUSE", isActive: true },
];
const inventory = [
  {
    id: "stock-a",
    itemId: "item-a",
    locationId: "loc-a",
    quantity: "48.000",
    reserved: "4.000",
    available: "44.000",
    purchasePrice: "1200.00",
    reorderPoint: "10.000",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-28T10:30:00.000Z",
    location: locations[0],
    item: {
      id: "item-a",
      description: "Oak writing desk",
      sku: "DSK-001",
      barcode: "123456789001",
      unit: "pcs",
      itemType: "FINISHED",
    },
  },
  {
    id: "stock-b",
    itemId: "item-b",
    locationId: "loc-a",
    quantity: "6.000",
    reserved: "0.000",
    available: "6.000",
    purchasePrice: "850.00",
    reorderPoint: "8.000",
    createdAt: "2026-10-21T09:00:00.000Z",
    updatedAt: "2026-10-27T11:10:00.000Z",
    location: locations[0],
    item: {
      id: "item-b",
      description: "Linen lounge chair",
      sku: "CHR-002",
      unit: "pcs",
      itemType: "FINISHED",
    },
  },
  {
    id: "stock-c",
    itemId: "item-c",
    locationId: "loc-a",
    quantity: "0.000",
    reserved: "0.000",
    available: "0.000",
    purchasePrice: "75.00",
    reorderPoint: "5.000",
    createdAt: "2026-10-22T09:00:00.000Z",
    updatedAt: "2026-10-26T08:10:00.000Z",
    location: locations[0],
    item: {
      id: "item-c",
      description: "Brass cabinet handle",
      sku: "HDL-003",
      unit: "pcs",
      itemType: "RAW",
    },
  },
];
const token =
  "e30." +
  Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url") +
  ".test";
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const path = new URL(req.url, "http://localhost").pathname.replace(
    "/api/v1",
    "",
  );
  res.setHeader("content-type", "application/json");
  let result = {
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
  if (path === "/auth/login" || path === "/auth/refresh")
    result = { user, accessToken: token, refreshToken: token };
  else if (path === "/auth/me") {
    if (!req.headers.authorization) {
      res.statusCode = 401;
      result = { message: "Unauthorized" };
    } else result = user;
  } else if (path === "/dashboard")
    result = {
      totalInventoryValue: "62700",
      stockValueByLocation: [
        { locationId: "loc-a", locationName: "Main warehouse", value: "62700" },
      ],
      showroomCount: 0,
      dailySales: "12450",
      dailyPurchases: "4800",
      profitAndLoss: {
        revenue: "246000",
        costOfGoodsSold: "158000",
        grossProfit: "88000",
        totalExpenses: "24000",
        netProfit: "64000",
        marginPercent: "35.77",
      },
      financialOverview: {
        cashTotal: "18000",
        bankTotal: "42000",
        totalLiquidity: "60000",
        bankAccounts: [
          {
            id: "cash-a",
            name: "Main till",
            accountType: "CASH",
            balance: "18000",
          },
          {
            id: "bank-a",
            name: "Business account",
            accountType: "BANK",
            bankName: "Commercial bank",
            balance: "42000",
          },
        ],
      },
    };
  else if (path === "/reports/cash-flow")
    result = {
      dailyBalances: Array.from({ length: 14 }, (_, i) => ({
        date: `2026-10-${String(15 + i).padStart(2, "0")}`,
        inflow: String(2000 + ((i * 1700) % 7000)),
        outflow: String(1200 + ((i * 1200) % 3000)),
        net: String(800 + ((i * 500) % 4000)),
      })),
    };
  else if (path.includes("unread-count")) result = { count: 0 };
  else if (path === "/health/live")
    result = { status: "ok", currency: { code: "ETB", symbol: "Br" } };
  else if (path === "/locations")
    result = {
      data: locations,
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    };
  else if (path === "/inventory")
    result = {
      data: inventory,
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
      totals: { quantity: "54.000", inventoryValue: "62700.00" },
    };
  else if (/^\/inventory\/stock-/.test(path))
    result = inventory.find((row) => row.id === path.split("/").pop());
  else if (path === "/customers")
    result = {
      data: customers,
      meta: { page: 1, limit: 20, total: customers.length, totalPages: 1 },
    };
  else if (path.startsWith("/customers/") && req.method === "PATCH") {
    const customer = customers.find((c) => c.id === path.split("/").pop());
    if (customer?.id === "customer-b" && JSON.parse(body).isActive === false) {
      res.statusCode = 409;
      result = { message: "Customer has open documents" };
    } else {
      Object.assign(customer ?? {}, JSON.parse(body));
      result = customer;
    }
  }
  res.end(JSON.stringify(result));
});
server.listen(4321, "127.0.0.1");
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--webpack", "-p", "3123"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      INVENTORY_E2E: "true",
      API_URL: "http://127.0.0.1:4321/api/v1",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:4321/api/v1",
    },
    windowsHide: true,
  },
);
function stop() {
  child.kill();
  server.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => {
  server.close();
  process.exit(code ?? 0);
});
