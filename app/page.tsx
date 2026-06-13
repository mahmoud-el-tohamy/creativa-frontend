"use client";

import { useEffect, useRef, useState, memo } from "react";
import Link from "next/link";
import { BlacklistEntry } from "@/lib/blacklist";
import api, { ChartDataBucket, hoursAPI, TrainingDashboardStats, createCancelToken, instructorsAPI } from "@/lib/api";
import { PeriodType, AccountantDashboardData } from "@/lib/types/instructors";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ADDED: Time Range Selector
export type TimeRange = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

function getCurrentFiscalYear() {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  if (m >= 4) return `FY${y}-${y + 1}`;
  return `FY${y - 1}-${y}`;
}

const PROGRAM_COLORS: Record<string, string> = {
  "Entrepreneurship": "#1D9E75",
  "Career Development": "#7C3AED",
  "Freelancing": "#F59E0B",
  "Acceleration program": "#6B7280",
  "Hackathons / Competitions": "#EF4444",
  "Awareness event": "#EAB308",
  "Incubation": "#9333EA",
  "Tech": "#0284C7",
  "Consultation & Mentorship": "#db2777"
};



// Removed client-side buildChartData logic. Server now handles it via /api/dashboard/stats

function buildTracksChartData(entries: BlacklistEntry[]) {
  const trackCounts: Record<string, number> = {};
  entries.forEach(entry => {
    const uniqueTracks = new Set<string>();
    if (entry.absences) {
      entry.absences.forEach(a => {
        if (a.track && a.track !== "غير محدد" && a.track !== "إضافة يدوية") {
          uniqueTracks.add(a.track);
        }
      });
    }
    uniqueTracks.forEach(t => {
      if (!trackCounts[t]) trackCounts[t] = 0;
      trackCounts[t]++;
    });
  });

  return Object.keys(trackCounts)
    .map(t => ({ name: t, value: trackCounts[t] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // top 5 tracks
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
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return null; // Prevent UI leak for unauthenticated users

  if (user.role === "accountant") {
    return <AccountantDashboard />;
  }

  return <AdminEmployeeDashboard />;
}

function AdminEmployeeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "employee";
  
  const [data, setData] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  
  // States to keep track of counts
  const [totalCount, setTotalCount] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);

  
  // Data for the charts
  const [chartData, setChartData] = useState<ChartDataBucket[]>([]);
  const [tracksData, setTracksData] = useState<{ name: string; value: number }[]>([]);
  const [warningsTrackData, setWarningsTrackData] = useState<{ name: string; value: number }[]>([]);
  const [blacklistTrackData, setBlacklistTrackData] = useState<{ name: string; value: number }[]>([]);

  const [trainingStats, setTrainingStats] = useState<TrainingDashboardStats | null>(null);
  const [trainingStatsLoading, setTrainingStatsLoading] = useState(true);
  const [selectedFY, setSelectedFY] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [fiscalYears, setFiscalYears] = useState<string[]>([]);
  const [trainingTimeRange, setTrainingTimeRange] = useState<TimeRange>("monthly");

  // Helper: Filter data by time range for the Blacklist section
  const filterEntriesByTimeRange = (entries: BlacklistEntry[], range: TimeRange) => {
    const now = new Date().getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    let daysToKeep = 0;
    if (range === "daily") daysToKeep = 14;
    else if (range === "weekly") daysToKeep = 8 * 7;
    else if (range === "monthly") daysToKeep = 6 * 30;
    else if (range === "quarterly") daysToKeep = 4 * 90;
    else if (range === "yearly") daysToKeep = 3 * 365;

    if (daysToKeep === 0) return entries; // Fallback

    const threshold = now - (daysToKeep * msPerDay);
    return entries.filter(e => new Date(e.addedAt).getTime() >= threshold);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // PERF: Unified API call fetching everything in one round-trip (with cache buster for PWA)
        const { signal } = createCancelToken();
        const { data: statsResponse } = await api.get(`/dashboard/stats?range=monthly&_t=${Date.now()}`, { signal });
        
        if (statsResponse.success) {
          console.log("DASHBOARD STATS RESPONSE:", statsResponse);
          setChartData(statsResponse.data);
          
          const sortedData = statsResponse.blacklist || [];
          setData(sortedData);

          setTotalCount(sortedData.length);
          setWarningsCount(sortedData.filter((e: BlacklistEntry) => e.status === "warning").length);
          
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();

          setThisMonthCount(sortedData.filter((entry: BlacklistEntry) => {
            const d = new Date(entry.addedAt);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length);

          const initialFiltered = filterEntriesByTimeRange(sortedData, "monthly");
          setTracksData(buildTracksChartData(initialFiltered));
          setWarningsTrackData(buildTracksChartData(sortedData.filter((e: BlacklistEntry) => e.status === "warning")));
          setBlacklistTrackData(buildTracksChartData(sortedData.filter((e: BlacklistEntry) => e.status === "blacklisted")));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const { cancel } = createCancelToken();
    fetchData();
    
    return () => cancel();
  }, []);

  // ━━━ ADDED: Fetch Fiscal Years & Default Selection ━━━
  useEffect(() => {
    hoursAPI.getFiscalYears().then((res) => {
      if (res.data.success && res.data.data.length > 0) {
        setFiscalYears(res.data.data);
        setSelectedFY(res.data.data[0]);
      } else {
        setFiscalYears([getCurrentFiscalYear()]);
        setSelectedFY(getCurrentFiscalYear());
      }
    }).catch(() => {
      setFiscalYears([getCurrentFiscalYear()]);
      setSelectedFY(getCurrentFiscalYear());
    });
  }, []);

  // ━━━ ADDED: Fetch Training Stats ━━━
  useEffect(() => {
    if (!selectedFY) return;
    const fetchStats = async () => {
      setTrainingStatsLoading(true);
      try {
        const res = await hoursAPI.getDashboardStats(selectedFY, selectedQuarter);
        setTrainingStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setTrainingStatsLoading(false);
      }
    };
    void fetchStats();
  }, [selectedFY, selectedQuarter]);

  const handleRangeChange = async (range: TimeRange) => {
    setTimeRange(range);
    try {
      // PERF: Update just the chart data (with cache buster)
      const { data: statsResponse } = await api.get(`/dashboard/stats?range=${range}&_t=${Date.now()}`);
      if (statsResponse.success) {
        setChartData(statsResponse.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (date: string | Date) => {
    const d = new Date(date);
    const diffTime = new Date().getTime() - d.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 90;
  };

  const downloadExcel = async (key: string) => {
    let filteredEntries = data;
    let filename = "Blacklist_All.xlsx";
    let sheetName = "البلاك ليست كاملة";

    if (key !== "all") {
      const bucket = chartData.find((m) => m.key === key);
      if (!bucket) return;

      filteredEntries = data.filter((e) => {
        const d = new Date(e.addedAt);
        let entryKey = "";
        
        // Let's just use the start dates to filter for excel export if we have to, 
        // but wait, since we removed getWeekNumber, let's just do a simpler filter or allow downloading everything.
        // For now, if they want excel for a specific bucket, we match the year/month loosely.
        if (timeRange === "daily") entryKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        else if (timeRange === "monthly") entryKey = `${d.getFullYear()}-${d.getMonth()}`;
        else if (timeRange === "quarterly") entryKey = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`;
        else if (timeRange === "yearly") entryKey = `${d.getFullYear()}`;
        else if (timeRange === "weekly") {
           // Fallback for weekly export matching - not perfect but avoids shipping getWeekNumber client-side
           // Usually users just export All anyway.
           return d >= new Date(bucket.rawDate) && d <= new Date(new Date(bucket.rawDate).getTime() + 7 * 86400000);
        }
        
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

  const recentEntries = [...data]
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
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

      <div className="mb-6 h-[344px] sm:mb-8 sm:h-[200px] lg:h-14 overflow-hidden">
      {authLoading ? (
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : canWrite ? (
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/attendance"
            className="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            رصد حضور جديد
          </Link>
          <Link
            href="/multi-day-attendance"
            className="h-14 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m3 6V7m3 10v-4m5 8H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>
            حضور متعدد الأيام
          </Link>
          <Link
            href="/filter"
            className="h-14 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            فلتر قائمة جديدة
          </Link>
          <Link
            href="/certificates"
            className="h-14 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            توليد الشهادات
          </Link>
          <div className="flex h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500 transition-all">
            <label htmlFor="dashboard-export-range" className="sr-only">تصدير بيانات إكسيل</label>
            <select
              id="dashboard-export-range"
              name="dashboard-export-range"
              className="h-full bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none px-4 flex-1 border-l border-gray-100 dark:border-gray-700 appearance-none cursor-pointer"
              onChange={(e) => { if (e.target.value) { void downloadExcel(e.target.value); e.target.value = ""; } }}
              defaultValue=""
            >
              <option value="" disabled>تصدير إكسيل...</option>
              <option value="all">تصدير الكل</option>
              {chartData.map((m, i) => (<option key={`export-${i}-${m.key}`} value={m.key}>{m.label} ({m.additions})</option>))}
            </select>
            <div className="w-14 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 pointer-events-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
          </div>
        </div>
      ) : null}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="إجمالي المدرجين" value={totalCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/20" border="border-indigo-100 dark:border-indigo-900/30" href="/blacklist?tab=blacklisted" />
        <StatCard title="الإنذارات النشطة" value={warningsCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-100 dark:border-amber-900/30" href="/blacklist?tab=warnings" />
        <StatCard title="مسجلين بالبلاك ليست" value={totalCount - warningsCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" border="border-red-100 dark:border-red-900/30" href="/blacklist?tab=blacklisted" />
        <StatCard title="إضافات هذا الشهر" value={thisMonthCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-900/30" href="/blacklist?tab=blacklisted" />
      </section>

      {/* ━━━ ADDED: Fiscal Year Selector ━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">تحليلات التدريب</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">تتبع الأداء وتوزيع الجلسات التدريبية</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              id="fiscal-year-selector"
              name="fiscal-year-selector"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-10 pr-4 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer min-w-[140px]"
            >
              <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">كل السنوات</option>
              {fiscalYears.map(fy => (
                <option key={fy} value={fy} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{fy}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          
          <div className="relative">
            <select
              id="quarter-selector"
              name="quarter-selector"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-10 pr-4 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer min-w-[140px]"
            >
              <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">كل الأرباع</option>
              <option value="Q1" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">الربع الأول (مايو - يوليو)</option>
              <option value="Q2" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">الربع الثاني (أغسطس - أكتوبر)</option>
              <option value="Q3" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">الربع الثالث (نوفمبر - يناير)</option>
              <option value="Q4" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">الربع الرابع (فبراير - أبريل)</option>
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ ADDED: Training Stats Cards Row ━━━ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="إجمالي أيام التدريب" value={trainingStats?.totalTrainingDays || 0} loading={trainingStatsLoading} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} color="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-900/20" border="border-teal-100 dark:border-teal-900/30" href="/hours" />
        <StatCard title="إجمالي الجلسات" value={trainingStats?.totalSessions || 0} loading={trainingStatsLoading} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-900/30" href="/hours" />
        <StatCard title="إجمالي المتدربين" value={trainingStats?.totalAttendees || 0} loading={trainingStatsLoading} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" border="border-purple-100 dark:border-purple-900/30" href="/hours" />
        <StatCard title="إجمالي الساعات" value={trainingStatsLoading ? 0 : `${trainingStats?.totalHours || 0} س`} loading={trainingStatsLoading} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" border="border-green-100 dark:border-green-900/30" href="/hours" />
      </section>

      {/* ━━━ ADDED: Charts Row 1: Program Performance ━━━ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">أيام التدريب حسب البرنامج</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">إجمالي أيام التدريب موزعة على البرامج</p>
          <div className="w-full" style={{ height: Math.max(250, (trainingStats?.programDays?.length || 0) * 50 + 50) }} dir="ltr">
            <ChartContainer loading={trainingStatsLoading}>
              {({ height }) => (
                <ResponsiveContainer width="100%" height={height}>
                  <BarChart data={trainingStats?.programDays || []} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} />
                    <YAxis dataKey="program" type="category" width={160} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="totalDays" name="أيام التدريب" radius={[0, 4, 4, 0]} maxBarSize={45}>
                      {trainingStats?.programDays.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[entry.program as string] || "#94a3b8"} />
                      ))}
                      <LabelList dataKey="totalDays" position="right" fill="#9ca3af" fontSize={14} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">توزيع طرق التدريب</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">أونلاين مقابل أوفلاين</p>
          <div className="w-full h-[300px] relative" dir="ltr">
            <ChartContainer loading={trainingStatsLoading}>
              {({ height }) => {
                const modeData = [
                  { name: "أونلاين", value: trainingStats?.modeBreakdown.online || 0, fill: "#1D9E75", pct: trainingStats?.modeBreakdown.onlinePct || 0 },
                  { name: "أوفلاين", value: trainingStats?.modeBreakdown.offline || 0, fill: "#64748b", pct: trainingStats?.modeBreakdown.offlinePct || 0 },
                ];
                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                      <Pie data={modeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" labelLine={false} label={(props) => {
                        const { cx, cy, midAngle, outerRadius, fill, pct } = props as unknown as { cx: number; cy: number; midAngle: number; outerRadius: number; fill: string; pct: number };
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 12;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        if (pct < 5) return null;
                        return (
                          <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={14} fontWeight="bold">
                            {`${pct}%`}
                          </text>
                        );
                      }}>
                        {modeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>

            {!trainingStatsLoading && (
              <div className="absolute inset-0 pb-[36px] pointer-events-none flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none">
                  {trainingStats?.totalSessions || 0}
                </span>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                  جلسة
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ ADDED: Charts Row 2: Activity Over Time ━━━ */}
      <section className="grid grid-cols-1 gap-8 mb-8">
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 flex flex-col">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">النشاط الشهري للتدريب</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">مقارنة بين الجلسات، أيام التدريب، والحضور</p>
            </div>
            <div className="relative">
              <select id="training-time-range" name="training-time-range" value={trainingTimeRange} onChange={(e) => setTrainingTimeRange(e.target.value as TimeRange)} className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-10 pr-6 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm font-semibold cursor-pointer w-full sm:w-auto min-w-[160px]">
                <option value="daily" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">يومياً (تاريخ الجلسة)</option>
                <option value="monthly" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">شهرياً</option>
              </select>
            </div>
          </div>
          <div className="w-full relative h-[300px] sm:h-[350px]">
            <ChartContainer loading={trainingStatsLoading}>
              {({ height }) => {
                const timelineData = trainingTimeRange === "daily" ? trainingStats?.dailyActivity : trainingStats?.monthlyActivity;
                const xAxisKey = trainingTimeRange === "daily" ? "date" : "month";
                
                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={(timelineData as unknown[]) || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} className="dir-ltr">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} tickCount={6} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#ef4444', fontSize: 13, fontWeight: 600 }} tickCount={6} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar yAxisId="left" dataKey="days" name="أيام التدريب" fill="#1D9E75" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar yAxisId="left" dataKey="sessions" name="الجلسات" fill="#7C3AED" fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Line yAxisId="right" type="monotone" dataKey="attendees" name="المتدربون" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4, fill: '#F59E0B' }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>
          </div>
        </div>
      </section>

      {/* ━━━ ADDED: Charts Row 3: Instructors + Type ━━━ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">أكثر المدربين نشاطاً</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">أعلى 5 مدربين تقديماً للجلسات</p>
          <div className="w-full" style={{ height: Math.max(250, (trainingStats?.topInstructors?.length || 0) * 50 + 50) }} dir="ltr">
            <ChartContainer loading={trainingStatsLoading}>
              {({ height }) => {
                if (trainingStats && trainingStats.topInstructors.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">لم يتم تسجيل مدربين بعد</p>
                    </div>
                  );
                }
                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={trainingStats?.topInstructors || []} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="instructorGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#2dd4bf" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} />
                      <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 14, fontWeight: 700 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="sessions" name="الجلسات" fill="url(#instructorGrad)" radius={[0, 4, 4, 0]} maxBarSize={45}>
                        <LabelList dataKey="sessions" position="right" fill="#9ca3af" fontSize={14} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">توزيع نوع التدريب</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">التدريب مقابل فعاليات الوعي</p>
          <div className="w-full h-[300px]" dir="ltr">
            <ChartContainer loading={trainingStatsLoading}>
              {({ height }) => {
                const RADIAN = Math.PI / 180;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const renderCustomizedLabel = ({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, fill }: any) => {
                  const radius = outerRadius + 20;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  if (percent < 0.01) return null;
                  return (
                    <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={16} fontWeight="bold">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                };
                
                const typeData = trainingStats?.typeBreakdown.map(t => ({
                  ...t,
                  name: t.type,
                  fill: t.type === "Training" || t.type === "تدريب" ? "#1D9E75" : t.type === "Awareness Event" ? "#F59E0B" : t.type === "Incubation" ? "#9333EA" : "#0284C7"
                })) || [];

                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="name" stroke="none" labelLine={false} label={renderCustomizedLabel}>
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>
          </div>
        </div>
      </section>

      {/* ━━━ VISUAL SEPARATOR ━━━ */}
      <div className="py-8">
        <hr className="border-t border-gray-200 dark:border-gray-800" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">تحليلات البلاك ليست</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">تتبع نشاط البلاك ليست والإنذارات</p>
        </div>
        <div className="relative">
          <select id="blacklist-time-range" name="blacklist-time-range" value={timeRange} onChange={(e) => handleRangeChange(e.target.value as TimeRange)} className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-10 pr-4 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer min-w-[180px]">
            <option value="daily" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">يومياً (آخر 14 يوم)</option>
            <option value="weekly" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">أسبوعياً (آخر 8 أسابيع)</option>
            <option value="monthly" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">شهرياً (آخر 6 شهور)</option>
            <option value="quarterly" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">ربع سنوي (آخر 4 أرباع)</option>
            <option value="yearly" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">سنوياً (آخر 3 سنوات)</option>
          </select>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 flex flex-col min-h-[450px]">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">معدل الإضافات (زمني)</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">مقارنة بين الإضافات الجديدة والإجمالي التراكمي</p>
            </div>
          </div>
          <div className="flex-1 w-full relative min-h-[300px]">
            <ChartContainer loading={loading}>
              {({ width, height }) => (
                <LineChart width={width} height={height} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} className="dir-ltr">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} tickCount={6} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#ef4444', fontSize: 12, fontWeight: 600 }} tickCount={6} domain={[0, 'auto']} hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f3f4f6', strokeWidth: 2, className: 'dark:stroke-gray-700' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="cumulative" name="الإجمالي التراكمي" stroke="#0d9488" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#0d9488' }} />
                  <Line yAxisId="right" type="stepAfter" dataKey="additions" name="الإضافات الجديدة" stroke="#ef4444" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5, strokeWidth: 0, fill: '#ef4444' }} />
                </LineChart>
              )}
            </ChartContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">أكثر التراكات غياباً</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">توزيع المتغيبين على أعلى التراكات</p>
          <div className="flex-1 w-full min-h-[300px]" dir="ltr">
            <ChartContainer loading={loading}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie data={tracksData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" labelLine={false}>
                    {tracksData.map((entry, index) => {
                      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} متدرب`, name]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', flexWrap: 'wrap', display: 'flex', justifyContent: 'center' }} />
                </PieChart>
              )}
            </ChartContainer>
          </div>
        </div>
      </section>

      {/* Blacklist and Warnings Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" dir="ltr">
        
        {/* Warnings Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-800/30 p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6" dir="rtl">
            <div>
              <h2 className="text-2xl font-black text-amber-800 dark:text-amber-400 mb-1">الإنذارات الحالية</h2>
              <p className="text-amber-600 dark:text-amber-500/80 font-medium">المتدربون في فترة الإنذار</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 text-3xl font-black px-6 py-3 rounded-2xl shadow-sm">
              {warningsCount}
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-900/40 rounded-2xl p-4 flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-4 text-center">التراكات الأكثر إنذاراً</h3>
            <div className="flex-1 w-full min-h-[200px]">
              <ChartContainer loading={loading}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={warningsTrackData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#92400e', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} content={<CustomTooltip />} />
                    <Bar dataKey="value" name="عدد الإنذارات" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="value" position="top" fill="#d97706" fontSize={12} fontWeight={700} />
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Blacklist Card */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-3xl shadow-sm border border-red-100 dark:border-red-800/30 p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6" dir="rtl">
            <div>
              <h2 className="text-2xl font-black text-red-800 dark:text-red-400 mb-1">البلاك ليست</h2>
              <p className="text-red-600 dark:text-red-500/80 font-medium">متدربون استنفذوا مرات الغياب</p>
            </div>
            <div className="bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 text-3xl font-black px-6 py-3 rounded-2xl shadow-sm">
              {totalCount - warningsCount}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-900/40 rounded-2xl p-4 flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-red-700 dark:text-red-500 mb-4 text-center">التراكات الأكثر فصلاً</h3>
            <div className="flex-1 w-full min-h-[200px]">
              <ChartContainer loading={loading}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={blacklistTrackData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#991b1b', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }} content={<CustomTooltip />} />
                    <Bar dataKey="value" name="مضافين للبلاك ليست" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="value" position="top" fill="#dc2626" fontSize={12} fontWeight={700} />
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          </div>
        </div>

      </section>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col w-full min-w-0 h-[508px]">
        <div className="h-[72px] shrink-0 px-4 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">أحدث الإضافات</h2>
          <Link href="/blacklist" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">عرض الكل &rarr;</Link>
        </div>
        <div className="overflow-x-auto w-full h-[436px]">
          {loading ? <DashboardTableSkeleton /> : (
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
                {recentEntries.map((person) => (
                  <tr key={person._id || person.nationalId} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{person.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{person.nationalId}</td>
                    <td className="px-6 py-4"><span className="text-gray-600 dark:text-gray-400">{formatDate(person.addedAt)}</span></td>
                    <td className="px-6 py-4">{isExpiringSoon(person.addedAt) ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">سيُحذف قريباً</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">نشط</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

// ─── ACCOUNTANT DASHBOARD ─────────────────────────────────────────────────────

const AccountantDashboard = memo(() => {
  const [data, setData] = useState<AccountantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("year");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [exportingSessions, setExportingSessions] = useState(false);
  const [exportingProfiles, setExportingProfiles] = useState(false);

  const handleExportSessions = async () => {
    try {
      setExportingSessions(true);
      const res = await instructorsAPI.exportAccountantSessions(period, startDate, endDate);
      const contentType = (res.headers["content-type"] as string) || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `All_Instructors_${period}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تعذر تصدير جلسات الفترة" }));
    } finally {
      setExportingSessions(false);
    }
  };

  const handleExportProfiles = async () => {
    try {
      setExportingProfiles(true);
      const res = await instructorsAPI.exportAccountantProfiles();
      const contentType = (res.headers["content-type"] as string) || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `All_Profiles.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تعذر تصدير بيانات المدربين" }));
    } finally {
      setExportingProfiles(false);
    }
  };

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return;
    let isMounted = true;
    instructorsAPI.getAccountantDashboard(period, startDate, endDate)
      .then((res) => {
        if (isMounted) setData(res.data.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => {
      isMounted = false;
    };
  }, [period, startDate, endDate]);

  const formatCurrency = (n: number) => n.toLocaleString("en-US") + " ج.م";

  const renderTableRows = () => {
    if (!data || data.instructorSummaries.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            لا توجد جلسات مسجلة للمدربين في هذه الفترة
            <br />
            <Link href="/instructors" className="text-teal-600 dark:text-teal-400 font-bold hover:underline mt-2 inline-block">
              الذهاب إلى المدربين
            </Link>
          </td>
        </tr>
      );
    }

    return data.instructorSummaries.map((i) => (
      <tr key={i.instructorId} className={`border-b border-gray-50 last:border-0 dark:border-gray-700/50 ${!i.hasRates ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
        <td className="px-6 py-4">
          <Link href={`/instructors/${i.instructorId}`} className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            {i.instructorName}
          </Link>
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-md">
            {i.totalSessions}
          </span>
        </td>
        <td className="px-6 py-4">{i.totalHours}س</td>
        <td className="px-6 py-4">{i.totalDays}</td>
        <td className="px-6 py-4">{formatCurrency(i.trainingAmount)}</td>
        <td className="px-6 py-4">{i.consultationAmount > 0 ? formatCurrency(i.consultationAmount) : "—"}</td>
        <td className="px-6 py-4 font-bold text-teal-600 dark:text-teal-400">{formatCurrency(i.totalAmount)}</td>
        <td className="px-6 py-4">
          {!i.hasRates ? (
            <span className="inline-flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-md">
              بدون أسعار
            </span>
          ) : (
            <span className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-md">
              محسوب
            </span>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-12 font-sans text-gray-900 dark:text-gray-100 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* SECTION 1 — Page Header + Period Selector */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">
            لوحة التحكم المالية
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mt-2">
            نظرة عامة على استحقاقات المدربين
          </p>
        </div>
      </header>

      {/* SECTION 2 — Alert Banner */}
      {!loading && data?.instructorsWithoutRates && data.instructorsWithoutRates.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl dark:bg-amber-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                ⚠ {data.instructorsWithoutRates.length} مدرب/مدربين لم يتم تحديد أسعارهم — الاستحقاقات غير دقيقة
              </p>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                <Link href="/instructors" className="font-bold underline">عرض المدربين</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 — Top Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي الاستحقاقات" 
          value={loading ? 0 : formatCurrency(data?.totalPayable || 0)} 
          loading={loading} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />} 
          color="text-teal-600 dark:text-teal-400" 
          bg="bg-teal-50 dark:bg-teal-900/20" 
          border="border-teal-100 dark:border-teal-900/30"
        />
        <StatCard 
          title="استحقاقات التدريب" 
          value={loading ? 0 : formatCurrency(data?.trainingPayable || 0)} 
          loading={loading} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />} 
          color="text-blue-600 dark:text-blue-400" 
          bg="bg-blue-50 dark:bg-blue-900/20" 
          border="border-blue-100 dark:border-blue-900/30"
        />
        <StatCard 
          title="استحقاقات الاستشارات" 
          value={loading ? 0 : formatCurrency(data?.consultationPayable || 0)} 
          loading={loading} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />} 
          color="text-purple-600 dark:text-purple-400" 
          bg="bg-purple-50 dark:bg-purple-900/20" 
          border="border-purple-100 dark:border-purple-900/30"
        />
        <StatCard 
          title="إجمالي الجلسات" 
          value={loading ? 0 : `${data?.totalSessions || 0} جلسة`} 
          loading={loading} 
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />} 
          color="text-amber-600 dark:text-amber-400" 
          bg="bg-amber-50 dark:bg-amber-900/20" 
          border="border-amber-100 dark:border-amber-900/30"
        />

        {/* TIME FILTER WIDGET */}
        <div className="lg:col-span-2 col-span-1 sm:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col justify-center gap-4 min-h-[112px] sm:min-h-[128px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-300">تحديد فترة البيانات</h3>
            <div className="relative flex-1 sm:max-w-[200px]">
              <select
                value={period}
                onChange={(e) => {
                  setLoading(true);
                  setPeriod(e.target.value as PeriodType);
                  if (e.target.value !== "custom") {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 pl-10 pr-4 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="month">آخر شهر</option>
                <option value="3months">آخر ربع سنة</option>
                <option value="6months">آخر نص سنة</option>
                <option value="year">آخر سنة</option>
                <option value="custom">مخصص (تحديد تواريخ)</option>
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {period === "custom" && (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex-1 relative">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setLoading(true);
                    setStartDate(e.target.value);
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex-1 relative">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">إلى تاريخ</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setLoading(true);
                    setEndDate(e.target.value);
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>
        {/* SECTION 3.5 (Moved up into the grid) — Actions and Breakdown */}
        {loading ? (
          <div className="lg:col-span-2 col-span-1 sm:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col justify-center min-h-[112px] sm:min-h-[128px]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full animate-pulse">
              <div className="w-full sm:w-[45%] space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-2"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div>
              </div>
              <div className="hidden sm:block w-px h-16 bg-gray-200 dark:bg-gray-700"></div>
              <div className="w-full sm:w-[45%] flex flex-col gap-3">
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
              </div>
            </div>
          </div>
        ) : data && data.totalSessions > 0 ? (
          <div className="lg:col-span-2 col-span-1 sm:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col justify-center min-h-[112px] sm:min-h-[128px]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
              {/* Online/Offline */}
              <div className="w-full sm:w-[45%]">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1 font-bold">
                      <span className="text-teal-700 dark:text-teal-400">أونلاين</span>
                      <span className="text-teal-700 dark:text-teal-400">
                        {Math.round((data.onlineCount / data.totalSessions) * 100)}% <span className="text-[10px] sm:text-xs text-gray-500">({data.onlineCount})</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                      <div className="bg-teal-500 h-1.5 sm:h-2 rounded-full" style={{ width: `${(data.onlineCount / data.totalSessions) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1 font-bold">
                      <span className="text-gray-700 dark:text-gray-300">أوفلاين</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {Math.round((data.offlineCount / data.totalSessions) * 100)}% <span className="text-[10px] sm:text-xs text-gray-500">({data.offlineCount})</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                      <div className="bg-gray-400 h-1.5 sm:h-2 rounded-full" style={{ width: `${(data.offlineCount / data.totalSessions) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider for desktop */}
              <div className="hidden sm:block w-px h-16 bg-gray-200 dark:bg-gray-700"></div>

              {/* Export Reports */}
              <div className="w-full sm:w-[45%] flex flex-col gap-2.5">
                <button
                  onClick={handleExportSessions}
                  disabled={exportingSessions}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:translate-y-0 disabled:opacity-70 dark:shadow-none w-full"
                >
                  {exportingSessions ? (
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  جلسات الفترة
                </button>
                <button
                  onClick={handleExportProfiles}
                  disabled={exportingProfiles}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 disabled:opacity-70 w-full"
                >
                  {exportingProfiles ? (
                    <svg className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  ملفات المدربين
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* SECTION 4 — Charts Row */}
      <section className="grid grid-cols-1 gap-8">
        {/* CHART A: Monthly Trend */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">الاستحقاق الشهري</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">مقارنة بين الساعات والمبالغ</p>
          <div className="w-full relative h-[300px]" dir="ltr">
            <ChartContainer loading={loading}>
              {({ height }) => {
                if (!data || data.monthlyTrend.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-400 font-medium">لا توجد بيانات في هذه الفترة</p>
                    </div>
                  );
                }
                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={data.monthlyTrend} margin={{ top: 20, right: 30, left: 30, bottom: 20 }} className="dir-ltr">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis dataKey="month" interval={0} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} dy={10} />
                      <YAxis yAxisId="left" tickMargin={10} width={50} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} tickCount={6} />
                      <YAxis yAxisId="right" tickMargin={10} width={60} orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#14b8a6', fontSize: 13, fontWeight: 600 }} tickCount={6} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '10px' }} />
                      <Bar yAxisId="left" dataKey="totalHours" name="الساعات" fill="#3b82f6" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar yAxisId="right" dataKey="totalAmount" name="المبلغ (ج.م)" fill="#14b8a6" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </ComposedChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>
          </div>
        </div>

        {/* CHART B: Program Breakdown */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">توزيع الساعات حسب البرنامج</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">إجمالي الساعات للبرامج التدريبية</p>
          <div className="w-full h-[300px]" dir="ltr">
            <ChartContainer loading={loading}>
              {({ height }) => {
                if (!data || data.programBreakdown.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-400 font-medium">لا توجد بيانات في هذه الفترة</p>
                    </div>
                  );
                }
                const pieData = data.programBreakdown.map(p => ({
                  name: p.program,
                  value: p.totalHours,
                  fill: PROGRAM_COLORS[p.program] || "#64748b",
                  sessions: p.totalSessions
                }));
                return (
                  <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                );
              }}
            </ChartContainer>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Instructor Financial Table */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">تفصيل استحقاقات المدربين</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{data?.period.label}</p>
        </div>
        
        {loading ? (
          <DashboardTableSkeleton />
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 font-bold">المدرب</th>
                  <th className="px-6 py-4 font-bold">الجلسات</th>
                  <th className="px-6 py-4 font-bold">الساعات</th>
                  <th className="px-6 py-4 font-bold">الأيام</th>
                  <th className="px-6 py-4 font-bold">التدريب</th>
                  <th className="px-6 py-4 font-bold">الاستشارات</th>
                  <th className="px-6 py-4 font-bold text-teal-600 dark:text-teal-400">الإجمالي</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {renderTableRows()}
              </tbody>
              {data && data.instructorSummaries.length > 0 && (
                <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold text-gray-900 dark:text-gray-100">
                  <tr>
                    <td className="px-6 py-4 text-left">الإجمالي:</td>
                    <td className="px-6 py-4">{data.totalSessions}</td>
                    <td className="px-6 py-4">{data.totalHours}س</td>
                    <td className="px-6 py-4">{data.instructorSummaries.reduce((sum, i) => sum + i.totalDays, 0)}</td>
                    <td className="px-6 py-4">{formatCurrency(data.trainingPayable)}</td>
                    <td className="px-6 py-4">{formatCurrency(data.consultationPayable)}</td>
                    <td className="px-6 py-4 text-lg text-teal-600 dark:text-teal-400">{formatCurrency(data.totalPayable)}</td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </main>
  );
});
AccountantDashboard.displayName = "AccountantDashboard";

// Reusable Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  bg,
  border,
  loading = false,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  loading?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex min-h-[112px] sm:min-h-[128px] items-center justify-between gap-4 w-full min-w-0 overflow-hidden contain-layout ${href ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300" : ""}`}
    >
      <div className="space-y-2 min-w-0">
        <p className="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400 truncate">
          {title}
        </p>
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 sm:h-9" />
        ) : (
          <p className={`text-2xl sm:text-3xl lg:text-xl xl:text-3xl font-extrabold ${color} tabular-nums leading-tight`}>
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

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {content}
      </Link>
    );
  }

  return content;
}
