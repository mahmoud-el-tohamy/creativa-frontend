"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBlacklist, BlacklistEntry } from "@/lib/blacklist";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface MonthlyData {
  name: string;
  count: number;
  cumulative: number;
  key: string;
  year: number;
  monthIndex: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "employee";
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
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

        let currentMonthCount = 0;
        let expiringCount = 0;
        
        // Month names in Arabic
        const monthNames = [
          "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
          "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];

        // Prepare last 6 months buckets
        const last6Months: { [key: string]: { count: number, name: string, monthObj: Date } } = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          last6Months[key] = { count: 0, name: monthNames[d.getMonth()], monthObj: d };
        }

        data.forEach(entry => {
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
          
          // Chart data grouping
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (last6Months[key]) {
            last6Months[key].count++;
          }
        });

        // Compute cumulative and chart data
        const sortedKeys = Object.keys(last6Months).sort((a, b) => last6Months[a].monthObj.getTime() - last6Months[b].monthObj.getTime());
        
        // To get accurate cumulative growth, we need the total entries BEFORE the 6 months period.
        let baseCumulative = data.length;
        sortedKeys.forEach(k => {
          baseCumulative -= last6Months[k].count;
        });
        
        const mData: MonthlyData[] = [];
        let currentCumulative = baseCumulative;
        let totalLast6Months = 0;
        
        sortedKeys.forEach(key => {
          const count = last6Months[key].count;
          currentCumulative += count;
          totalLast6Months += count;
          
          mData.push({
            name: last6Months[key].name,
            count: count,
            cumulative: currentCumulative,
            key: key,
            year: last6Months[key].monthObj.getFullYear(),
            monthIndex: last6Months[key].monthObj.getMonth()
          });
        });

        setTotalCount(data.length);
        setThisMonthCount(currentMonthCount);
        setExpiringSoonCount(expiringCount);
        setAvgMonthlyAdditions(Math.round(totalLast6Months / 6));
        setMonthlyData(mData);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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

  const downloadExcel = (key: string) => {
    let filteredEntries = entries;
    let filename = "Blacklist_All.xlsx";
    let sheetName = "البلاك ليست كاملة";

    if (key !== "all") {
      const monthData = monthlyData.find(m => m.key === key);
      if (!monthData) return;
      
      filteredEntries = entries.filter(e => 
        e.addedAt.getMonth() === monthData.monthIndex && 
        e.addedAt.getFullYear() === monthData.year
      );
      
      if (filteredEntries.length === 0) {
        alert("لا توجد بيانات متاحة لهذا الشهر.");
        return;
      }
      
      filename = `Blacklist_${monthData.name}_${monthData.year}.xlsx`;
      sheetName = `إضافات ${monthData.name}`;
    }

    const rows = [
      ["الاسم", "الرقم القومي", "تاريخ الإضافة"],
      ...filteredEntries.map((e) => [e.name, e.nationalId, formatDate(e.addedAt)]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center font-sans text-gray-900 dark:text-gray-100">
        <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </main>
    );
  }

  const recentEntries = [...entries].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime()).slice(0, 10);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <Link href="/attendance" className="px-6 py-4 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          رصد حضور جديد
        </Link>
        <Link href="/filter" className="px-6 py-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
          فلتر قائمة جديدة
        </Link>
        <Link href="/certificates" className="px-6 py-4 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl shadow-sm font-semibold transition-colors flex items-center justify-center sm:justify-start gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          توليد الشهادات
        </Link>
        {/* Export Excel Dropdown */}
        <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500 transition-all">
          <select
            className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none px-4 py-4 sm:py-3 flex-1 border-l border-gray-100 dark:border-gray-700 appearance-none cursor-pointer"
            onChange={(e) => { if (e.target.value) { downloadExcel(e.target.value); e.target.value = ""; } }}
            defaultValue=""
          >
            <option value="" disabled>تصدير إكسيل...</option>
            <option value="all">تصدير الكل</option>
            {monthlyData.map((m, i) => (
              <option key={`month-${i}-${m.key}`} value={m.key}>شهر {m.name} {m.year} ({m.count})</option>
            ))}
          </select>
          <div className="w-14 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </div>
        </div>
      </div>
      )}

      {/* Section 1 - Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي البلاك ليست" value={totalCount} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" border="border-red-100 dark:border-red-900/30" />
        <StatCard title="إضافات هذا الشهر" value={thisMonthCount} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-900/30" />
        <StatCard title="سيُحذفون قريباً" value={expiringSoonCount} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-100 dark:border-amber-900/30" />
        <StatCard title="متوسط الإضافة الشهرية" value={avgMonthlyAdditions} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>} color="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-900/20" border="border-teal-100 dark:border-teal-900/30" />
      </section>

      {/* Section 2 - Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="ltr">
        {/* Chart A: Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col h-[300px] sm:h-96 w-full min-w-0 overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 text-right font-sans">نمو البلاك ليست (التراكمي)</h2>
          <div className="flex-1 w-full min-w-0 h-full relative" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 14 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                  itemStyle={{ color: '#1D9E75', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="cumulative" name="إجمالي المدرجين" stroke="#1D9E75" strokeWidth={3} dot={{ r: 4, fill: '#1D9E75', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col h-[300px] sm:h-96 w-full min-w-0 overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 text-right font-sans">الإضافات الشهرية</h2>
          <div className="flex-1 w-full min-w-0 h-full relative" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 14 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                  itemStyle={{ color: '#1D9E75', fontWeight: 'bold' }}
                  cursor={{ fill: 'rgba(29, 158, 117, 0.1)' }}
                />
                <Bar dataKey="count" name="إضافات جديدة" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section 3 - Recent Blacklist Table */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col w-full min-w-0">
        <div className="px-4 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">أحدث الإضافات</h2>
          <Link href="/blacklist" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            عرض الكل &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto w-full">
          {recentEntries.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
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
                    <tr key={person.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{person.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{person.nationalId}</td>
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
function StatCard({ title, value, icon, color, bg, border }: { title: string, value: string | number, icon: React.ReactNode, color: string, bg: string, border: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex items-center justify-between gap-4 w-full min-w-0`}>
      <div className="space-y-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className={`text-2xl sm:text-3xl font-extrabold ${color} truncate`}>{value}</p>
      </div>
      <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full ${bg} ${color} flex items-center justify-center border ${border}`}>
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
    </div>
  );
}
