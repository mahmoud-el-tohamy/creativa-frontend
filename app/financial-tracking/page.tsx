"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { financeAPI, IFinancialSession, IFinancialPagination } from "@/lib/api";
import Link from "next/link";

const PAGE_SIZE = 20;

interface FilterState {
  startDate: string;
  endDate: string;
  instructorName: string;
  period: string;
  sessionType: string;
  programName: string;
}

const DEFAULT_FILTERS: FilterState = {
  startDate: "",
  endDate: "",
  instructorName: "",
  period: "all",
  sessionType: "all",
  programName: "all",
};

export default function FinancialTrackingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<IFinancialSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCostSum, setTotalCostSum] = useState(0);
  const [pagination, setPagination] = useState<IFinancialPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  // Filter state — used by inputs
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Applied filter state — used for actual fetch; only updates when user clicks Search
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Core fetch — takes explicit applied filters + page to avoid stale closure bugs
  const fetchData = useCallback(async (f: FilterState, page: number) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (f.period && f.period !== "all") params.period = f.period;
      if (f.period === "all" || !f.period) {
        if (f.startDate) params.startDate = f.startDate;
        if (f.endDate) params.endDate = f.endDate;
      }
      if (f.instructorName) params.instructorName = f.instructorName;
      if (f.sessionType && f.sessionType !== "all") params.sessionType = f.sessionType;
      if (f.programName && f.programName !== "all") params.programName = f.programName;

      const res = await financeAPI.getInstructorFinancials(params as Parameters<typeof financeAPI.getInstructorFinancials>[0]);
      if (res.data.success) {
        setData(res.data.data);
        setTotalCostSum(res.data.totalCostSum ?? 0);
        setPagination(res.data.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 1 });
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auth guard — initial load
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin" && user.role !== "accountant") {
        router.push("/");
      } else {
        Promise.resolve().then(() => fetchData(DEFAULT_FILTERS, 1));
      }
    }
  }, [user, loading, router, fetchData]);

  // When page changes (pagination click), re-fetch with same applied filters
  useEffect(() => {
    if (!loading && user && (user.role === "admin" || user.role === "accountant")) {
      Promise.resolve().then(() => fetchData(appliedFilters, currentPage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
    fetchData({ ...filters }, 1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    fetchData(DEFAULT_FILTERS, 1);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string | number> = {};
      if (appliedFilters.period && appliedFilters.period !== "all") params.period = appliedFilters.period;
      if (appliedFilters.period === "all" || !appliedFilters.period) {
        if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
        if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;
      }
      if (appliedFilters.instructorName) params.instructorName = appliedFilters.instructorName;
      if (appliedFilters.sessionType && appliedFilters.sessionType !== "all") params.sessionType = appliedFilters.sessionType;
      if (appliedFilters.programName && appliedFilters.programName !== "all") params.programName = appliedFilters.programName;

      const res = await financeAPI.exportInstructorFinancials(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "جلسات_الفترة.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || (!user && isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              متابعة مالية المدربين
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              تتبع المستحقات المالية للمدربين والبرامج التدريبية
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={data.length === 0 || isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {isExporting ? "جاري التصدير..." : "تصدير إلى إكسيل"}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

            {/* Period */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                الفترة
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">الكل</option>
                <option value="month">الشهر الحالي</option>
                <option value="3months">آخر 3 أشهر</option>
                <option value="6months">آخر 6 أشهر</option>
                <option value="year">آخر سنة</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={`mb-1.5 block text-xs font-semibold ${filters.period !== "all" ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                من تاريخ
              </label>
              <input
                type="date"
                value={filters.startDate}
                disabled={filters.period !== "all"}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* End Date */}
            <div>
              <label className={`mb-1.5 block text-xs font-semibold ${filters.period !== "all" ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filters.endDate}
                disabled={filters.period !== "all"}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Instructor Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                اسم المدرب
              </label>
              <input
                type="text"
                placeholder="ابحث باسم المدرب..."
                value={filters.instructorName}
                onChange={(e) => setFilters((f) => ({ ...f, instructorName: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Session Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                نوع التدريب
              </label>
              <select
                value={filters.sessionType}
                onChange={(e) => setFilters((f) => ({ ...f, sessionType: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">الكل</option>
                <option value="Training">تدريب (Training)</option>
                <option value="Awareness Event">حدث توعوي (Awareness)</option>
                <option value="Incubation">حاضنة أعمال (Incubation)</option>
                <option value="Consultation">استشارة (Consultation)</option>
              </select>
            </div>

            {/* Program / Track */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                البرنامج التدريبي (التراك)
              </label>
              <select
                value={filters.programName}
                onChange={(e) => setFilters((f) => ({ ...f, programName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">الكل</option>
                <option value="Career Development">Career Development</option>
                <option value="Tech">Tech</option>
                <option value="Freelancing">Freelancing</option>
                <option value="Entrepreneurship">Entrepreneurship</option>
                <option value="Awareness event">Awareness event</option>
                <option value="Hackathons / Competitions">Hackathons / Competitions</option>
                <option value="Acceleration program">Acceleration program</option>
                <option value="Incubation">Incubation</option>
              </select>
            </div>

            {/* Search + Reset buttons */}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
              <button
                onClick={handleSearch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 h-[38px]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                بحث
              </button>
              <button
                onClick={handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 h-[38px]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                مسح
              </button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">إجمالي المستحقات المالية (كل النتائج)</p>
              <p className="mt-2 text-3xl font-extrabold">
                {isLoading ? (
                  <span className="opacity-50">جاري التحميل...</span>
                ) : (
                  `${totalCostSum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`
                )}
              </p>
              <p className="mt-1 text-xs text-blue-200">
                إجمالي {pagination.total.toLocaleString()} سجل
              </p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-4 text-nowrap">تاريخ التدريب</th>
                  <th className="px-4 py-4 text-nowrap">عدد الأيام</th>
                  <th className="px-4 py-4 text-nowrap">نوع التدريب</th>
                  <th className="px-4 py-4 min-w-[150px]">اسم التدريب</th>
                  <th className="px-4 py-4 text-nowrap">البرنامج</th>
                  <th className="px-4 py-4 text-nowrap text-center">الحضور</th>
                  <th className="px-4 py-4 min-w-[150px]">اسم المدرب</th>
                  <th className="px-4 py-4 text-nowrap">تكلفة اليوم</th>
                  <th className="px-4 py-4 text-nowrap font-bold text-blue-600 dark:text-blue-400">الإجمالي</th>
                  <th className="px-4 py-4 text-nowrap text-center">الروابط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      لا توجد بيانات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item._id} className={`transition-colors ${item.isPaid === false ? "bg-red-50/30 dark:bg-red-900/10 text-gray-400 dark:text-gray-500 hover:bg-red-50/50 dark:hover:bg-red-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">
                        {new Date(item.sessionDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20">
                          {item.daysCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.sessionType}</td>
                      <td className="px-4 py-3 line-clamp-2" title={item.sessionName}>
                        {item.sessionName}
                        {item.isPaid === false && (
                          <span className="mr-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                            غير مدفوع
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.program}</td>
                      <td className="px-4 py-3 text-center">{item.attendance}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{item.instructorName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.dailyRate.toLocaleString()} ج.م</td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {item.totalCost.toLocaleString()} ج.م
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {item.cvLink ? (
                            <Link href={item.cvLink} target="_blank" className="text-gray-400 hover:text-blue-600 transition" title="السيرة الذاتية">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </Link>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </span>
                          )}
                          {item.reportLink ? (
                            <Link href={item.reportLink} target="_blank" className="text-gray-400 hover:text-green-600 transition" title="تقرير البرنامج">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </Link>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                عرض{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                من{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{pagination.total}</span> سجل
              </p>
              <div className="flex items-center gap-1">
                {/* First page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="الصفحة الأولى"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                {/* Prev page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="السابق"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const half = 2;
                  let start = Math.max(1, currentPage - half);
                  const end = Math.min(pagination.totalPages, start + 4);
                  start = Math.max(1, end - 4);
                  return start + i;
                }).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition ${
                      p === currentPage
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {/* Next page */}
                <button
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="التالي"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* Last page */}
                <button
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="الصفحة الأخيرة"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
