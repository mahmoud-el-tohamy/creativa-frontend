"use client";

import React, { useState, useMemo } from "react";
import { getBlacklist, addToBlacklist, removeFromBlacklist, BlacklistEntry } from "@/lib/blacklist";
import useSWR from "swr";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import AddModal from "@/components/blacklist/modals/AddModal";
import DeleteModal from "@/components/blacklist/modals/DeleteModal";
import BulkDeleteModal from "@/components/blacklist/modals/BulkDeleteModal";
import { useTableFilters } from "@/hooks/useTableFilters";
import FilterBar from "@/components/shared/FilterBar";
export default function BlacklistPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "employee";

  const fetcher = async () => {
    return await getBlacklist();
  };

  const { data: entriesData, mutate, isLoading: loading } = useSWR("/api/blacklist", fetcher, { 
    revalidateOnFocus: true,
    onError: () => {
      showToast("حدث خطأ أثناء تحميل البيانات.", "error");
    }
  });
  const entries: BlacklistEntry[] = useMemo(() => entriesData || [], [entriesData]);
  
  const [activeTab, setActiveTab] = useState<"blacklisted" | "warnings">("blacklisted");

  const [filters, dispatchFilters] = useTableFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [prevFilters, setPrevFilters] = useState(filters);

  // Reset to page 1 when filters change (Sync during render to avoid cascading renders)
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setCurrentPage(1);
  }

  const handleAddSubmit = async (name: string, nationalId: string) => {
    if (!name.trim() || !nationalId.trim()) {
      showToast("يرجى إدخال الاسم والرقم القومي.", "error");
      return;
    }

    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    if (!nameRegex.test(name.trim())) {
      showToast("الاسم يجب أن يحتوي على حروف عربية أو إنجليزية فقط ولا يمكن أن يحتوي على أرقام.", "error");
      return;
    }

    const nationalIdRegex = /^\d{14}$/;
    if (!nationalIdRegex.test(nationalId.trim())) {
      showToast("الرقم القومي يجب أن يكون 14 رقماً فقط دون أي حروف أو رموز.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addToBlacklist({ name: name.trim(), nationalId: nationalId.trim() });
      showToast("تم إضافة الشخص بنجاح.", "success");
      setIsAddModalOpen(false);
      await mutate();
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الإضافة.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await removeFromBlacklist(deleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
      showToast("تم الحذف بنجاح.", "success");
      setDeleteId(null);
      await mutate();
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الحذف.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const idsToDelete = validSelectedIds;
    if (idsToDelete.length === 0) return;
    setIsDeleting(true);
    const count = idsToDelete.length;
    try {
      await Promise.all(idsToDelete.map(id => removeFromBlacklist(id)));
      showToast(`تم حذف ${count} أشخاص بنجاح.`, "success");
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      await mutate();
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الحذف المتعدد.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ADDED: Advanced Filter Logic
  const filteredEntries = useMemo(() => {
    let result = entries.filter(e => {
      if (activeTab === "blacklisted" && e.status !== "blacklisted") return false;
      if (activeTab === "warnings" && e.status !== "warning") return false;
      return true;
    });

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (e) => e.name.toLowerCase().includes(s) || e.nationalId.includes(s)
      );
    }

    if (filters.status !== "all") {
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(now.getMonth() - 4);

      if (filters.status === "expiring") {
        result = result.filter(e => { const d = new Date(e.addedAt); return d <= threeMonthsAgo && d >= fourMonthsAgo; });
      } else if (filters.status === "active") {
        result = result.filter(e => new Date(e.addedAt) > threeMonthsAgo);
      }
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(e => new Date(e.addedAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(e => new Date(e.addedAt) <= toDate);
    }

    result.sort((a, b) => {
      if (filters.sort === "newest") {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      } else if (filters.sort === "oldest") {
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      } else if (filters.sort === "name_asc") {
        return a.name.localeCompare(b.name, 'ar');
      }
      return 0;
    });

    return result;
  }, [entries, filters, activeTab]);

  // Paginate entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const validSelectedIds = selectedIds.filter((id) =>
    entries.some((entry) => entry.id === id),
  );

  const selectedVisibleIds = filteredEntries
    .map((entry) => entry.id)
    .filter((id): id is string => id !== undefined && validSelectedIds.includes(id));

  const toggleSelectAll = () => {
    const filteredIds = filteredEntries
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id));

    if (filteredIds.length > 0 && selectedVisibleIds.length === filteredIds.length) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <RouteGuard allowedRoles={["admin", "employee", "viewer"]}>
      <main className="flex-1 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 p-6 sm:p-12 font-sans overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-200">
              إدارة البلاك ليست والإنذارات
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              لوحة تحكم لإدارة المستبعدين والإنذارات
            </p>
          </div>
          {canWrite && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-sm transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة شخص جديد
            </button>
          )}
        </header>

        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("blacklisted")}
            className={`px-6 py-3 font-bold text-lg transition-colors border-b-2 ${
              activeTab === "blacklisted" 
                ? "border-red-500 text-red-600 dark:text-red-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            البلاك ليست (المستبعدون)
          </button>
          <button
            onClick={() => setActiveTab("warnings")}
            className={`px-6 py-3 font-bold text-lg transition-colors border-b-2 ${
              activeTab === "warnings" 
                ? "border-amber-500 text-amber-600 dark:text-amber-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            الإنذارات (المعرضون للاستبعاد)
          </button>
        </div>

        <FilterBar 
          filters={filters} 
          dispatch={dispatchFilters} 
          totalCount={entries.length} 
          filteredCount={filteredEntries.length} 
          canWrite={canWrite}
          validSelectedIds={validSelectedIds}
          setIsBulkDeleteModalOpen={setIsBulkDeleteModalOpen}
        />

        {/* Table Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-gray-600">
                <thead className="bg-transparent dark:bg-transparent text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {canWrite && (
                      <th className="px-6 py-5 w-12 text-center">
                        <div className="relative inline-flex items-center justify-center cursor-pointer">
                          <input
                            id="blacklist-select-all"
                            name="blacklistSelectAll"
                            type="checkbox"
                            aria-label="تحديد الكل"
                            checked={filteredEntries.length > 0 && selectedVisibleIds.length === filteredEntries.length}
                            onChange={toggleSelectAll}
                            className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 transition-all"
                          />
                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </th>
                    )}
                    <th className="px-6 py-5">الاسم</th>
                    <th className="px-6 py-5">الرقم القومي</th>
                    {activeTab === "warnings" ? (
                      <>
                        <th className="px-6 py-5 text-center">الغيابات (تراكات)</th>
                        <th className="px-6 py-5 text-center">عدد مرات الحضور للتعويض</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-5">تاريخ الإضافة</th>
                        <th className="px-6 py-5 text-center">التراكات المتغيب عنها</th>
                      </>
                    )}
                    {canWrite && <th className="px-6 py-5 text-center">إجراء</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map((person) => (
                    <tr key={person.id} className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                      {canWrite && (
                        <td className="px-6 py-4 text-center">
                          <div className="relative inline-flex items-center justify-center cursor-pointer">
                            <input
                              id={`blacklist-select-${person.id}`}
                              name={`blacklistSelect-${person.id}`}
                              type="checkbox"
                              aria-label={`تحديد ${person.name}`}
                              checked={validSelectedIds.includes(person.id!)}
                              onChange={() => toggleSelectRow(person.id!)}
                              className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-blue-600 checked:border-blue-600 dark:checked:bg-blue-500 dark:checked:border-blue-500 transition-all"
                            />
                            <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{person.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{person.nationalId}</td>
                      {activeTab === "warnings" ? (
                        <>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full ml-2">
                              {person.absences?.length || 0}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={person.absences?.map(a => a.track).join(", ")}>
                              {person.absences?.map(a => a.track).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                              (person.attendedCount || 0) >= 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {person.attendedCount || 0} / 2
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                              {formatDate(person.addedAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs text-gray-500 max-w-[150px] truncate" title={person.absences?.map(a => a.track).join(", ")}>
                            {person.absences?.map(a => a.track).join(", ") || "—"}
                          </td>
                        </>
                      )}
                      {canWrite && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setDeleteId(person.id!)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="حذف"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            حذف
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="w-24 h-24 bg-transparent dark:bg-transparent text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                {filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo ? "لا توجد نتائج مطابقة لبحثك" : "لا يوجد احد"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo ? "جرب البحث باسم أو رقم قومي مختلف أو قم بإعادة ضبط الفلاتر." : "لم يتم إدراج أي شخص في قائمة المستبعدين حالياً."}
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredEntries.length > itemsPerPage && (
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center md:text-right w-full md:w-auto">
              عرض <span className="text-gray-900 dark:text-gray-100 font-black">{Math.min(filteredEntries.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredEntries.length, currentPage * itemsPerPage)}</span> من أصل <span className="text-gray-900 dark:text-gray-100 font-black">{filteredEntries.length}</span> سجل
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center w-full md:w-auto">
              {/* First Page Button */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                title="الصفحة الأولى"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              {/* Previous Page Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                title="الصفحة السابقة"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all ${currentPage === pageNum ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                title="الصفحة التالية"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Last Page Button */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                title="الصفحة الأخيرة"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={isDeleting}
        selectedCount={validSelectedIds.length}
      />
    </main>
    </RouteGuard>
  );
}
