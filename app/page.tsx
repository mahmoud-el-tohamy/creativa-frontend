"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { getBlacklist, BlacklistEntry } from "@/lib/blacklist";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ADDED: Time Range Selector
export type TimeRange = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

function getWeekNumber(d: Date) {
  const dObj = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dObj.getUTCDay() || 7;
  dObj.setUTCDate(dObj.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dObj.getUTCFullYear(), 0, 1));
  return Math.ceil((((dObj.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getISOWeekBounds(d: Date) {
  const day = d.getDay() || 7; // 1-7 (Mon-Sun)
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { monday, sunday };
}

function buildChartData(
  entries: BlacklistEntry[],
  range: TimeRange
): { label: string; fullLabel?: string; additions: number; cumulative: number; key: string; rawDate: Date }[] {
  const now = new Date();
  const buckets: { label: string; fullLabel?: string; key: string; date: Date }[] = [];

  if (range === "daily") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const fullLabel = `اليوم: ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      buckets.push({ label, fullLabel, key, date: d });
    }
  } else if (range === "weekly") {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
      const weekNum = getWeekNumber(d);
      const { monday, sunday } = getISOWeekBounds(d);
      
      const key = `${d.getFullYear()}-W${weekNum}`;
      const label = `أسبوع ${weekNum}`;
      
      const startStr = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}/${monday.getFullYear()}`;
      const endStr = `${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}/${sunday.getFullYear()}`;
      const fullLabel = `الأسبوع ${weekNum} من ${startStr} إلى ${endStr}`;
      
      buckets.push({ label, fullLabel, key, date: d });
    }
  } else if (range === "monthly") {
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = monthNames[d.getMonth()];
      const fullLabel = `شهر ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      buckets.push({ label, fullLabel, key, date: d });
    }
  } else if (range === "quarterly") {
    const currentQ = Math.floor(now.getMonth() / 3);
    for (let i = 3; i >= 0; i--) {
      let y = now.getFullYear();
      let q = currentQ - i;
      if (q < 0) {
        y -= 1;
        q += 4;
      }
      const d = new Date(y, q * 3, 1);
      const key = `${y}-Q${q}`;
      const label = `ر${q + 1} ${y}`;
      const fullLabel = `الربع ${q + 1} عام ${y}`;
      buckets.push({ label, fullLabel, key, date: d });
    }
  } else if (range === "yearly") {
    for (let i = 2; i >= 0; i--) {
      const y = now.getFullYear() - i;
      const d = new Date(y, 0, 1);
      const key = `${y}`;
      const label = `${y}`;
      const fullLabel = `عام ${y}`;
      buckets.push({ label, fullLabel, key, date: d });
    }
  }

  const countsMap = new Map<string, number>();
  buckets.forEach(b => countsMap.set(b.key, 0));

  const startDate = buckets[0].date;
  let baseCumulative = 0;

  entries.forEach(entry => {
    const d = entry.addedAt;
    if (d < startDate) {
      baseCumulative++;
      return;
    }

    let key = "";
    if (range === "daily") key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    else if (range === "weekly") key = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    else if (range === "monthly") key = `${d.getFullYear()}-${d.getMonth()}`;
    else if (range === "quarterly") key = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`;
    else if (range === "yearly") key = `${d.getFullYear()}`;

    if (countsMap.has(key)) {
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    } else if (d < startDate) {
      // Fallback: If logic mismatch assigns it an older week
      baseCumulative++;
    }
  });

  const result = [];
  let cumulative = baseCumulative;
  for (const b of buckets) {
    const additions = countsMap.get(b.key) || 0;
    cumulative += additions;
    result.push({
      label: b.label,
      fullLabel: b.fullLabel,
      additions: additions,
      cumulative: cumulative,
      key: b.key,
      rawDate: b.date
    });
  }

  return result;
}

// ADDED: Custom Tooltip for charts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      fullLabel?: string;
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className=" dir-rtl bg-white dark:bg-gray-800/95 backdrop-blur-sm p-3 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl border-l-4 border-l-teal-500 min-w-[140px]">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 text-right border-b border-gray-100 dark:border-gray-700 pb-1">
          {data.fullLabel || label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 flex-row-reverse mt-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{entry.name}:</span>
            <span className="text-sm font-black text-gray-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ChartContainer({
  children,
  loading = false,
}: {
  children: (size: { width: number; height: number }) => React.ReactNode;
  loading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[220px] w-full min-w-0 flex-1 overflow-hidden"
    >
      {loading ? (
        <DashboardChartSkeleton />
      ) : size.width > 0 && size.height > 0 ? (
        children(size)
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40" />
      )}
    </div>
  );
}

function DashboardChartSkeleton() {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col justify-end gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900/20">
      <div className="flex h-full items-end gap-3" dir="ltr">
        {[52, 72, 44, 86, 66, 92, 58].map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="flex-1 rounded-t-lg bg-gray-200/90 dark:bg-gray-700/70"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}

function DashboardTableSkeleton() {
  return (
    <div className="min-h-[436px] overflow-hidden">
      <table className="w-full text-right text-sm">
        <thead className="border-b border-gray-100 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-6 py-4 font-semibold">الاسم</th>
            <th className="px-6 py-4 font-semibold">الرقم القومي</th>
            <th className="px-6 py-4 font-semibold">تاريخ الإضافة</th>
            <th className="px-6 py-4 font-semibold">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }).map((_, index) => (
            <tr
              key={index}
              className="border-b border-gray-50 last:border-0 dark:border-gray-700/50"
            >
              <td className="px-6 py-4">
                <div className="h-4 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              </td>
              <td className="px-6 py-4">
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "employee";
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  // ADDED: Time Range Selector
  const [selectedRange, setSelectedRange] = useState<TimeRange>("monthly");

  // Metrics
  const [totalCount, setTotalCount] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [avgMonthlyAdditions, setAvgMonthlyAdditions] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getBlacklist();
        setEntries(data);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        let currentMonthCount = 0;
        let expiringCount = 0;
        let totalLast6Months = 0;

        data.forEach((entry) => {
          const date = entry.addedAt;

          // This month count
          if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
            currentMonthCount++;
          }

          // Expiring soon: older than 3 months
          const diffTime = now.getTime() - date.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 90 && diffDays <= 120) {
            expiringCount++;
          }

          // Total additions in last 6 months for average
          if (date >= sixMonthsAgo) {
            totalLast6Months++;
          }
        });

        setTotalCount(data.length);
        setThisMonthCount(currentMonthCount);
        setExpiringSoonCount(expiringCount);
        setAvgMonthlyAdditions(Math.round(totalLast6Months / 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ADDED: Time Range Selector - Memoized dynamically derived chart data
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    return buildChartData(entries, selectedRange);
  }, [entries, selectedRange]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (date: Date) => {
    const diffTime = new Date().getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 90;
  };

  const downloadExcel = async (key: string) => {
    let filteredEntries = entries;
    let filename = "Blacklist_All.xlsx";
    let sheetName = "البلاك ليست كاملة";

    if (key !== "all") {
      const bucket = chartData.find((m) => m.key === key);
      if (!bucket) return;

      filteredEntries = entries.filter((e) => {
        const d = e.addedAt;
        let entryKey = "";
        if (selectedRange === "daily") entryKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        else if (selectedRange === "weekly") entryKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
        else if (selectedRange === "monthly") entryKey = `${d.getFullYear()}-${d.getMonth()}`;
        else if (selectedRange === "quarterly") entryKey = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`;
        else if (selectedRange === "yearly") entryKey = `${d.getFullYear()}`;
        
        return entryKey === key;
      });

      if (filteredEntries.length === 0) {
        alert("لا توجد بيانات متاحة في هذا النطاق.");
        return;
      }

      filename = `Blacklist_${bucket.label.replace(/\//g, '-')}.xlsx`;
      sheetName = bucket.label;
    }

    const rows = [
      ["الاسم", "الرقم القومي", "تاريخ الإضافة"],
      ...filteredEntries.map((e) => [
        e.name,
        e.nationalId,
        formatDate(e.addedAt),
      ]),
    ];

    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const recentEntries = [...entries]
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
    .slice(0, 10);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-12 font-sans text-gray-900 dark:text-gray-100 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">
          لوحة التحكم (Dashboard)
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mt-2">
          نظرة عامة على إحصائيات البلاك ليست ونشاطات النظام
        </p>
      </header>

      {/* Quick Actions Row — hidden for viewers */}
      {canWrite && (
        <div className="grid min-h-[280px] grid-cols-1 gap-4 sm:min-h-[120px] sm:grid-cols-2 lg:min-h-[52px] lg:grid-cols-5 mb-6 sm:mb-8">
          <Link
            href="/attendance"
            className="px-6 py-4 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            رصد حضور جديد
          </Link>
          <Link
            href="/multi-day-attendance"
            className="px-6 py-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17v-6m3 6V7m3 10v-4m5 8H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2z"
              />
            </svg>
            حضور متعدد الأيام
          </Link>
          <Link
            href="/filter"
            className="px-6 py-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            فلتر قائمة جديدة
          </Link>
          <Link
            href="/certificates"
            className="px-6 py-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            توليد الشهادات
          </Link>
          {/* Export Excel Dropdown */}
          <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500 transition-all">
            <label htmlFor="dashboard-export-range" className="sr-only">
              تصدير بيانات إكسيل
            </label>
            <select
              id="dashboard-export-range"
              name="dashboardExportRange"
              className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none px-4 py-4 sm:py-3 flex-1 border-l border-gray-100 dark:border-gray-700 appearance-none cursor-pointer"
              onChange={(e) => {
                if (e.target.value) {
                  void downloadExcel(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                تصدير إكسيل...
              </option>
              <option value="all">تصدير الكل</option>
              {chartData.map((m, i) => (
                <option key={`export-${i}-${m.key}`} value={m.key}>
                  {m.label} ({m.additions})
                </option>
              ))}
            </select>
            <div className="w-14 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 pointer-events-none">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Section 1 - Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي البلاك ليست"
          value={totalCount}
          loading={loading}
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          }
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-900/20"
          border="border-red-100 dark:border-red-900/30"
        />
        <StatCard
          title="إضافات هذا الشهر"
          value={thisMonthCount}
          loading={loading}
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          }
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/20"
          border="border-blue-100 dark:border-blue-900/30"
        />
        <StatCard
          title="سيُحذفون قريباً"
          value={expiringSoonCount}
          loading={loading}
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          }
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/20"
          border="border-amber-100 dark:border-amber-900/30"
        />
        <StatCard
          title="متوسط الإضافة الشهرية"
          value={avgMonthlyAdditions}
          loading={loading}
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          }
          color="text-teal-600 dark:text-teal-400"
          bg="bg-teal-50 dark:bg-teal-900/20"
          border="border-teal-100 dark:border-teal-900/30"
        />
      </section>

      {/* ADDED: Time Range Selector */}
      <section className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t border-gray-100 dark:border-gray-800/50 mt-4">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
          عرض البيانات حسب:
        </span>
        <div className="grid grid-cols-5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl w-full sm:w-auto shadow-sm">
          {[
            { label: "يومي", value: "daily" },
            { label: "أسبوعي", value: "weekly" },
            { label: "شهري", value: "monthly" },
            { label: "ربع سنوي", value: "quarterly" },
            { label: "سنوي", value: "yearly" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedRange(opt.value as TimeRange)}
              className={`px-1.5 sm:px-5 py-2 text-[10px] sm:text-sm font-bold rounded-lg whitespace-nowrap transition-all duration-200 ${
                selectedRange === opt.value
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-100"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-[0.98]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Section 2 - Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="ltr">
        {/* Chart A: Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col h-[300px] min-h-[300px] sm:h-96 sm:min-h-96 w-full min-w-0 overflow-hidden contain-layout">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 text-right font-sans">
            نمو البلاك ليست (التراكمي)
          </h2>
          <ChartContainer loading={loading}>
            {({ width, height }) => (
              <LineChart
                width={width}
                height={height}
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B7280", fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#1D9E75", strokeWidth: 1 }}
                />

                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="إجمالي المدرجين"
                  stroke="#1D9E75"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#1D9E75",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ChartContainer>
        </div>

        {/* Chart B: Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col h-[300px] min-h-[300px] sm:h-96 sm:min-h-96 w-full min-w-0 overflow-hidden contain-layout">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 text-right font-sans">
            الإضافات الجديدة
          </h2>
          <ChartContainer loading={loading}>
            {({ width, height }) => (
              <BarChart
                width={width}
                height={height}
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B7280", fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(29, 158, 117, 0.1)" }}
                />
                <Bar
                  dataKey="additions"
                  name="إضافات جديدة"
                  fill="#1D9E75"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ChartContainer>
        </div>
      </section>

      {/* Section 3 - Recent Blacklist Table */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col w-full min-w-0 min-h-[508px]">
        <div className="px-4 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            أحدث الإضافات
          </h2>
          <Link
            href="/blacklist"
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            عرض الكل &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto w-full min-h-[436px]">
          {loading ? (
            <DashboardTableSkeleton />
          ) : recentEntries.length === 0 ? (
            <div className="min-h-[436px] p-12 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
              لا توجد بيانات حالياً في البلاك ليست
            </div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">الاسم</th>
                  <th className="px-6 py-4 font-semibold">الرقم القومي</th>
                  <th className="px-6 py-4 font-semibold">تاريخ الإضافة</th>
                  <th className="px-6 py-4 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((person) => {
                  const expiring = isExpiringSoon(person.addedAt);
                  return (
                    <tr
                      key={person.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {person.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">
                        {person.nationalId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatDate(person.addedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {expiring ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                            سيُحذف قريباً
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            نشط
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

// Reusable Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  bg,
  border,
  loading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  loading?: boolean;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex min-h-[112px] sm:min-h-[128px] items-center justify-between gap-4 w-full min-w-0 contain-layout"
    >
      <div className="space-y-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
          {title}
        </p>
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 sm:h-9" />
        ) : (
          <p className={`text-2xl sm:text-3xl font-extrabold ${color} truncate tabular-nums`}>
            {value}
          </p>
        )}
      </div>
      <div
        className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full ${bg} ${color} flex items-center justify-center border ${border}`}
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          {icon}
        </svg>
      </div>
    </div>
  );
}
