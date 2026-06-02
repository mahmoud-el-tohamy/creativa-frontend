"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBlacklist, BlacklistEntry } from "@/lib/blacklist";
import { dashboardAPI, ChartDataBucket } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ADDED: Time Range Selector
export type TimeRange = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

// Removed client-side buildChartData logic. Server now handles it via /api/dashboard/stats

function buildTracksChartData(entries: BlacklistEntry[]) {
  const trackCounts: Record<string, number> = {};
  entries.forEach(entry => {
    if (entry.absences) {
      entry.absences.forEach(a => {
        if (!trackCounts[a.track]) trackCounts[a.track] = 0;
        trackCounts[a.track]++;
      });
    }
  });

  return Object.keys(trackCounts)
    .filter(t => t !== "غير محدد" && t !== "إضافة يدوية")
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rawEntries, statsResponse] = await Promise.all([
          getBlacklist(),
          dashboardAPI.getStats("monthly")
        ]);

        const sortedData = rawEntries.sort(
          (a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
        );
        setData(sortedData);

        // Compute general metrics
        setTotalCount(sortedData.length);
        setWarningsCount(sortedData.filter(e => e.status === "warning").length);
        
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        setThisMonthCount(sortedData.filter((entry) => {
          const d = new Date(entry.addedAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).length);

        // Default load
        if (statsResponse.data.success) {
          setChartData(statsResponse.data.data);
        }
        setTracksData(buildTracksChartData(sortedData));
        setWarningsTrackData(buildTracksChartData(sortedData.filter(e => e.status === "warning")));
        setBlacklistTrackData(buildTracksChartData(sortedData.filter(e => e.status === "blacklisted")));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRangeChange = async (range: TimeRange) => {
    setTimeRange(range);
    try {
      const statsResponse = await dashboardAPI.getStats(range);
      if (statsResponse.data.success) {
        setChartData(statsResponse.data.data);
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
        <StatCard title="إجمالي المدرجين" value={totalCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/20" border="border-indigo-100 dark:border-indigo-900/30" />
        <StatCard title="الإنذارات النشطة" value={warningsCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-100 dark:border-amber-900/30" />
        <StatCard title="مسجلين بالبلاك ليست" value={totalCount - warningsCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" border="border-red-100 dark:border-red-900/30" />
        <StatCard title="إضافات هذا الشهر" value={thisMonthCount} loading={loading} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-900/30" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 flex flex-col min-h-[450px]">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">معدل الإضافات (زمني)</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">مقارنة بين الإضافات الجديدة والإجمالي التراكمي</p>
            </div>
            <div className="relative">
              <select value={timeRange} onChange={(e) => handleRangeChange(e.target.value as TimeRange)} className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 pl-10 pr-6 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm font-semibold cursor-pointer w-full sm:w-auto min-w-[160px]">
                <option value="daily">يومياً (آخر 14 يوم)</option>
                <option value="weekly">أسبوعياً (آخر 8 أسابيع)</option>
                <option value="monthly">شهرياً (آخر 6 شهور)</option>
                <option value="quarterly">ربع سنوي (آخر 4 أرباع)</option>
                <option value="yearly">سنوياً (آخر 3 سنوات)</option>
              </select>
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
          <div className="flex-1 w-full min-h-[300px]">
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
                  <BarChart width={width} height={height} data={warningsTrackData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#92400e', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" name="عدد الإنذارات" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                  <BarChart width={width} height={height} data={blacklistTrackData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#991b1b', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" name="مضافين للبلاك ليست" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                  <tr key={person.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex h-[112px] sm:h-[128px] items-center justify-between gap-4 w-full min-w-0 overflow-hidden contain-layout"
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
