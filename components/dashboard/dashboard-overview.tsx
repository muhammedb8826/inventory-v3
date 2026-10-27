"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/shared/metric-card";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { PageLoading } from "@/components/shared/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, isForbiddenError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyCurrencyFromResponse } from "@/lib/currency";
import { formatMoney, errorMessage } from "@/lib/format";
import { buildListPath } from "@/lib/list-query";
import type { DashboardData, ReportCashFlow } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LandmarkIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const LOCATION_COLORS = [
  "#0f766e",
  "#f07167",
  "#38bdf8",
  "#f59e0b",
  "#818cf8",
  "#94a3b8",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-3 py-2 text-xs shadow-lg">
      {label ? (
        <p className="mb-1 font-medium text-[var(--frappe-text)]">{label}</p>
      ) : null}
      {payload.map((entry) => (
        <p key={entry.name} className="tabular-nums text-[var(--frappe-text-muted)]">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.name}: {formatMoney(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [cashFlow, setCashFlow] = useState<ReportCashFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [now] = useState(() => new Date());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api<DashboardData>(
          buildListPath("/dashboard", {
            params: {
              from: from || undefined,
              to: to || undefined,
            },
          })
        );
        applyCurrencyFromResponse(res);
        setData(res);

        try {
          const flow = await api<ReportCashFlow>(
            buildListPath("/reports/cash-flow", {
              params: {
                from: from || undefined,
                to: to || undefined,
              },
            })
          );
          setCashFlow(flow);
        } catch {
          setCashFlow(null);
        }
      } catch (e) {
        if (!isForbiddenError(e)) toast.error(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  const flowSeries = useMemo(() => {
    const rows = cashFlow?.dailyBalances ?? [];
    return rows.slice(-14).map((row) => {
      const inflow = parseFloat(row.inflow ?? row.cashIn ?? "0") || 0;
      const outflow = parseFloat(row.outflow ?? row.cashOut ?? "0") || 0;
      const date = row.date?.slice(5) || row.date;
      return {
        date,
        Inflow: inflow,
        Outflow: outflow,
        Net: parseFloat(row.net ?? row.netMovement ?? String(inflow - outflow)) || 0,
      };
    });
  }, [cashFlow]);

  const locationPie = useMemo(() => {
    if (!data) return [];
    return data.stockValueByLocation
      .map((row) => ({
        name: row.locationName,
        value: parseFloat(row.value) || 0,
      }))
      .filter((row) => row.value > 0);
  }, [data]);

  const pnlBars = useMemo(() => {
    if (!data) return [];
    const pnl = data.profitAndLoss;
    return [
      { name: "Revenue", value: parseFloat(pnl.revenue) || 0, fill: "#0f766e" },
      { name: "COGS", value: parseFloat(pnl.costOfGoodsSold) || 0, fill: "#f07167" },
      { name: "Gross", value: parseFloat(pnl.grossProfit) || 0, fill: "#38bdf8" },
      { name: "Expenses", value: parseFloat(pnl.totalExpenses) || 0, fill: "#f59e0b" },
      { name: "Net", value: parseFloat(pnl.netProfit) || 0, fill: "#818cf8" },
    ];
  }, [data]);

  if (loading && !data) return <PageLoading />;
  if (!data) return null;

  const { profitAndLoss: pnl, financialOverview: fin } = data;
  const netPositive = parseFloat(pnl.netProfit) >= 0;
  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";
  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] shadow-[var(--frappe-shadow-lg)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 120% at 0% 0%, color-mix(in oklab, var(--frappe-primary) 28%, transparent), transparent 55%), radial-gradient(ellipse 60% 100% at 100% 0%, color-mix(in oklab, var(--frappe-accent-coral) 22%, transparent), transparent 50%), linear-gradient(135deg, color-mix(in oklab, var(--frappe-surface) 88%, #0f766e) 0%, var(--frappe-surface) 48%, color-mix(in oklab, var(--frappe-surface) 92%, #38bdf8) 100%)",
          }}
        />
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-300/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-4 sm:gap-6 sm:p-5 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-3 py-1 text-xs font-medium text-[var(--frappe-text)] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <SparklesIcon className="size-3.5 text-teal-600 dark:text-teal-300" />
              {dateLabel}
            </div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-[var(--frappe-text)] sm:text-2xl lg:text-3xl">
              {greeting}, {firstName}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--frappe-text-muted)] sm:text-[15px]">
              Stock, sales, and cash at a glance. Use the period filter to refine
              P&amp;L and cash movement.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
              <Button asChild className="h-9 flex-1 rounded-xl bg-teal-700 hover:bg-teal-600 sm:flex-none">
                <Link href="/sales/new">
                  <PlusIcon className="size-4" />
                  New sale
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-9 flex-1 rounded-xl bg-white/60 backdrop-blur dark:bg-white/5 sm:flex-none">
                <Link href="/purchases/new">
                  <ShoppingCartIcon className="size-4" />
                  Purchase
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-9 w-full rounded-xl bg-white/60 backdrop-blur dark:bg-white/5 sm:w-auto">
                <Link href="/inventory">
                  <PackageIcon className="size-4" />
                  Inventory
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-2.5 sm:gap-3 sm:max-w-md lg:w-[22rem]">
            <div className="rounded-2xl border border-white/50 bg-white/55 p-3.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--frappe-text-muted)]">
                Liquidity
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--frappe-text)]">
                {formatMoney(fin.totalLiquidity ?? fin.totalBankBalance)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/50 bg-white/55 p-3.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--frappe-text-muted)]">
                Stock value
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--frappe-text)]">
                {formatMoney(data.totalInventoryValue)}
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/50 bg-white/55 px-3.5 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
              <span className="text-xs text-[var(--frappe-text-muted)]">
                Period filter
              </span>
              <DateRangeFilter
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Inventory value"
          value={formatMoney(data.totalInventoryValue)}
          icon={PackageIcon}
          tone="violet"
          hint={`Across ${data.stockValueByLocation.length} location${data.stockValueByLocation.length === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Daily sales"
          value={formatMoney(data.dailySales)}
          icon={ArrowUpIcon}
          tone="coral"
          trend={{ label: "Today", positive: true }}
          hint="Gross sales posted today"
        />
        <MetricCard
          label="Daily purchases"
          value={formatMoney(data.dailyPurchases)}
          icon={ArrowDownIcon}
          tone="amber"
          hint="Stock inbound today"
        />
        <MetricCard
          label="Net profit"
          value={formatMoney(pnl.netProfit)}
          icon={TrendingUpIcon}
          tone={netPositive ? "teal" : "coral"}
          trend={{
            label: netPositive ? "In the black" : "In the red",
            positive: netPositive,
          }}
          hint={`Gross ${formatMoney(pnl.grossProfit)}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="sms-panel p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--frappe-text)]">
                Cash movement
              </h3>
              <p className="text-sm text-[var(--frappe-text-muted)]">
                Inflow vs outflow
                {flowSeries.length ? " · last 14 days in range" : ""}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full">
              Liquidity {formatMoney(fin.totalLiquidity ?? fin.totalBankBalance)}
            </Badge>
          </div>
          {flowSeries.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowSeries}>
                  <defs>
                    <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f07167" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f07167" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--frappe-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--frappe-text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--frappe-text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Inflow"
                    stroke="#0f766e"
                    fill="url(#inflowFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Outflow"
                    stroke="#f07167"
                    fill="url(#outflowFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/60 text-center">
              <WalletIcon className="mb-2 size-8 text-[var(--frappe-text-muted)]" />
              <p className="text-sm font-medium text-[var(--frappe-text)]">
                No cash-flow series yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-[var(--frappe-text-muted)]">
                Post sales, purchases, or expenses — or grant reports access — to
                populate this chart.
              </p>
            </div>
          )}
        </div>

        <div className="sms-panel p-5">
          <div className="mb-4">
            <h3 className="font-heading text-base font-semibold text-[var(--frappe-text)]">
              Stock by location
            </h3>
            <p className="text-sm text-[var(--frappe-text-muted)]">
              {data.showroomCount} showroom
              {data.showroomCount === 1 ? "" : "s"} · value mix
            </p>
          </div>
          {locationPie.length > 0 ? (
            <>
              <div className="mx-auto h-[180px] w-full max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {locationPie.map((_, i) => (
                        <Cell
                          key={i}
                          fill={LOCATION_COLORS[i % LOCATION_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {locationPie.map((row, i) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[var(--frappe-text)]">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: LOCATION_COLORS[i % LOCATION_COLORS.length],
                        }}
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--frappe-text-muted)]">
                      {formatMoney(row.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-[var(--frappe-text-muted)]">
              No stock value yet
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sms-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--frappe-text)]">
                Profit &amp; loss
              </h3>
              <p className="text-sm text-[var(--frappe-text-muted)]">
                Period composition
              </p>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlBars} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--frappe-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--frappe-text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--frappe-text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Amount" radius={[8, 8, 4, 4]}>
                  {pnlBars.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {pnlBars.map((row) => (
              <div
                key={row.name}
                className="rounded-xl bg-[var(--frappe-section-head)] px-3 py-2"
              >
                <p className="text-[11px] text-[var(--frappe-text-muted)]">
                  {row.name}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--frappe-text)]">
                  {formatMoney(row.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="sms-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--frappe-text)]">
                Cash &amp; bank
              </h3>
              <p className="text-sm text-[var(--frappe-text-muted)]">
                {fin.cashTotal != null && fin.bankTotal != null
                  ? `Cash ${formatMoney(fin.cashTotal)} · Bank ${formatMoney(fin.bankTotal)}`
                  : "Account balances"}
              </p>
            </div>
            <span className="sms-metric-icon bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <LandmarkIcon className="size-5" />
            </span>
          </div>
          <div className="space-y-2">
            {fin.bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/50 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--frappe-text)]">
                    {acc.name}
                  </p>
                  <p className="text-xs text-[var(--frappe-text-muted)]">
                    {acc.accountType ?? "BANK"}
                    {acc.bankName ? ` · ${acc.bankName}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-base font-semibold tabular-nums text-[var(--frappe-text)]">
                  {formatMoney(acc.balance)}
                </p>
              </div>
            ))}
            {fin.bankAccounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--frappe-text-muted)]">
                No bank accounts yet
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
