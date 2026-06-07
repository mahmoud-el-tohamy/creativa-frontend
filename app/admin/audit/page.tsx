"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import RouteGuard from "@/components/RouteGuard";
import { getAuditLogs, AuditLog } from "@/lib/audit";
import CustomSelect from "@/components/ui/CustomSelect";
import * as XLSX from "xlsx";

// ─── Config ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

const ACTION_META: Record<string, { label: string; color: string }> = {
  blacklist_add:        { label: "إضافة بلاك ليست",     color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  blacklist_remove:     { label: "حذف من بلاك ليست",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  blacklist_bulk_delete:{ label: "حذف جماعي",            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  blacklist_bulk_cleanup:{ label: "تنظيف البلاك ليست",    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  attendance_upload:    { label: "رفع الحضور",           color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  filter_run:           { label: "فلترة قائمة",          color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  sheet_organize:       { label: "تنظيم شيت",            color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  certificate_generate: { label: "توليد شهادات",        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  user_create:          { label: "إنشاء مستخدم",         color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  user_deactivate:      { label: "تعطيل مستخدم",        color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  user_activate:        { label: "تفعيل مستخدم",        color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  user_delete:          { label: "حذف مستخدم نهائي",     color: "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200" },
  user_role_change:     { label: "تغيير الدور",          color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  login:                { label: "تسجيل دخول",          color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  logout:               { label: "تسجيل خروج",          color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  training_session_add: { label: "إضافة تدريب", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  training_session_update: { label: "تعديل تدريب", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  training_session_delete: { label: "حذف تدريب", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  training_session_import: { label: "استيراد تدريبات", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  timetable_rebuild: { label: "إعادة بناء التايم تيبول", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  attendance_sheet_build: { label: "بناء شيت الحضور", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "كل الإجراءات" },
  { value: "blacklist_add", label: "إضافة بلاك ليست" },
  { value: "blacklist_remove", label: "حذف من بلاك ليست" },
  { value: "blacklist_bulk_cleanup", label: "تنظيف البلاك ليست" },
  { value: "attendance_upload", label: "رفع الحضور" },
  { value: "filter_run", label: "فلترة قائمة" },
  { value: "sheet_organize", label: "تنظيم شيت" },
  { value: "certificate_generate", label: "توليد شهادات" },
  { value: "user_create", label: "إنشاء مستخدم" },
  { value: "user_deactivate", label: "تعطيل مستخدم" },
  { value: "user_delete", label: "حذف مستخدم نهائي" },
  { value: "login", label: "تسجيل دخول" },
  { value: "training_session_add", label: "إضافة تدريب" },
  { value: "training_session_update", label: "تعديل تدريب" },
  { value: "training_session_delete", label: "حذف تدريب" },
  { value: "training_session_import", label: "استيراد تدريبات" },
  { value: "timetable_rebuild", label: "إعادة بناء التايم تيبول" },
  { value: "attendance_sheet_build", label: "بناء شيت الحضور" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatArabicDate(dateInput: string | Date) {
  const d = new Date(dateInput);
  const day = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(d);
  const date = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${day}، ${date} — ${time}`;
}

function isToday(dateInput: string | Date) {
  const d = new Date(dateInput);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLast30Days(dateInput: string | Date) {
  const d = new Date(dateInput);
  return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const fetcher = async () => {
    return await getAuditLogs({ limit: 1000 });
  };
  const { data: logsData, isLoading: loading } = useSWR("/api/audit", fetcher, { revalidateOnFocus: true });
  const logs: AuditLog[] = useMemo(() => logsData || [], [logsData]);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterPerformer, setFilterPerformer] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = logs.filter((l) => isToday(l.timestamp)).length;
    const last30 = logs.filter((l) => isLast30Days(l.timestamp));
    const countByUser: Record<string, { name: string; count: number }> = {};
    last30.forEach((l) => {
      if (!countByUser[l.performedBy]) countByUser[l.performedBy] = { name: l.performedByName, count: 0 };
      countByUser[l.performedBy].count++;
    });
    const mostActive = Object.values(countByUser).sort((a, b) => b.count - a.count)[0] ?? null;
    return { total: logs.length, today, mostActive };
  }, [logs]);

  // ─── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction && l.action !== filterAction) return false;
      if (filterPerformer && !l.performedByName.toLowerCase().includes(filterPerformer.toLowerCase())) return false;
      if (filterFrom) {
        const from = new Date(filterFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(l.timestamp) < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(l.timestamp) > to) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterPerformer, filterFrom, filterTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setFilterAction(""); setFilterPerformer(""); setFilterFrom(""); setFilterTo(""); setPage(1);
  };

  // ─── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((l) => ({
      "الإجراء": ACTION_META[l.action]?.label ?? l.action,
      "نُفِّذ بواسطة": l.performedByName,
      "الدور": l.performedByRole,
      "على من": l.targetName || "—",
      "التفاصيل": l.details,
      "التاريخ والوقت": formatArabicDate(l.timestamp),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل الإجراءات");
    XLSX.writeFile(wb, `audit_log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <RouteGuard allowedRoles={["admin"]}>
      <main className="flex-1 p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">سجل الإجراءات</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">تاريخ كامل لجميع العمليات المنفذة في النظام</p>
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              تصدير Excel
            </button>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي الإجراءات</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{loading ? "—" : stats.total}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجراءات اليوم</p>
              <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{loading ? "—" : stats.today}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">أكثر مستخدم نشاطاً (30 يوم)</p>
              <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 truncate">
                {loading ? "—" : stats.mostActive ? `${stats.mostActive.name} (${stats.mostActive.count})` : "—"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action filter */}
              <div>
                <label htmlFor="audit-filter-action" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">نوع الإجراء</label>
                <CustomSelect
                  id="audit-filter-action"
                  value={filterAction}
                  onChange={(v) => { setFilterAction(v); setPage(1); }}
                  options={ACTION_FILTER_OPTIONS}
                />
              </div>
              {/* Performer filter */}
              <div>
                <label htmlFor="audit-filter-performer" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">اسم المنفِّذ</label>
                <input id="audit-filter-performer" name="auditFilterPerformer" type="text" value={filterPerformer} onChange={(e) => { setFilterPerformer(e.target.value); setPage(1); }}
                  placeholder="ابحث بالاسم..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {/* Date from */}
              <div>
                <label htmlFor="audit-filter-from" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">من تاريخ</label>
                <input id="audit-filter-from" name="auditFilterFrom" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {/* Date to */}
              <div>
                <label htmlFor="audit-filter-to" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">إلى تاريخ</label>
                <input id="audit-filter-to" name="auditFilterTo" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? "جاري التحميل..." : `${filtered.length} نتيجة`}
              </p>
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                إعادة تعيين الفلاتر
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                  <tr>
                    {["الإجراء", "نُفِّذ بواسطة", "على من", "التفاصيل", "التاريخ والوقت"].map((col) => (
                      <th key={col} className="px-5 py-4 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center text-gray-400 dark:text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        لا توجد نتائج مطابقة للفلاتر المحددة
                      </td>
                    </tr>
                  ) : (
                    paginated.map((log) => {
                      const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-600" };
                      return (
                        <tr key={log._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{log.performedByName}</p>
                            <p className="text-xs text-gray-400">{log.performedByRole}</p>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {log.targetName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 max-w-xs">
                            <p className="line-clamp-2">{log.details}</p>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                            {formatArabicDate(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  صفحة {page} من {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    السابق
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </RouteGuard>
  );
}
