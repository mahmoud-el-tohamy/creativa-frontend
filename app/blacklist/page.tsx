"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getBlacklist, addToBlacklist, removeFromBlacklist, removeFromBlacklistBulk, cleanupExpired, BlacklistEntry } from "@/lib/blacklist";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from "@/lib/audit";

export default function BlacklistPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "employee";
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
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

  const loadData = async () => {
    setLoading(true);
    try {
      await cleanupExpired();
      const data = await getBlacklist();
      setEntries(data);
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء تحميل البيانات.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        await cleanupExpired();
        const data = await getBlacklist();
        setEntries(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNationalId.trim()) {
      showToast("يرجى إدخال الاسم والرقم القومي.", "error");
      return;
    }

    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    if (!nameRegex.test(newName.trim())) {
      showToast("الاسم يجب أن يحتوي على حروف عربية أو إنجليزية فقط ولا يمكن أن يحتوي على أرقام.", "error");
      return;
    }

    const nationalIdRegex = /^\d{14}$/;
    if (!nationalIdRegex.test(newNationalId.trim())) {
      showToast("الرقم القومي يجب أن يكون 14 رقماً فقط دون أي حروف أو رموز.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addToBlacklist({ name: newName.trim(), nationalId: newNationalId.trim() });
      if (user) {
        await logAction({
          action: "blacklist_add",
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
          targetId: newNationalId.trim(),
          targetName: newName.trim(),
          details: `تم إضافة ${newName.trim()} للبلاك ليست`,
        });
      }
      showToast("تم إضافة الشخص بنجاح.", "success");
      setIsAddModalOpen(false);
      setNewName("");
      setNewNationalId("");
      await loadData();
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
    const target = entries.find((e) => e.id === deleteId);
    try {
      await removeFromBlacklist(deleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
      if (user && target) {
        await logAction({
          action: "blacklist_remove",
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
          targetId: target.nationalId,
          targetName: target.name,
          details: `تم حذف ${target.name} من البلاك ليست`,
        });
      }
      showToast("تم الحذف بنجاح.", "success");
      setDeleteId(null);
      await loadData();
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
      await removeFromBlacklistBulk(idsToDelete);
      if (user) {
        await logAction({
          action: "blacklist_bulk_delete",
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
          targetId: "",
          targetName: "",
          details: `تم حذف ${count} أشخاص من البلاك ليست بشكل جماعي`,
        });
      }
      showToast(`تم حذف ${count} أشخاص بنجاح.`, "success");
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الحذف المتعدد.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.name.includes(searchQuery) || 
      e.nationalId.includes(searchQuery)
    );
  }, [entries, searchQuery]);

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

  const formatDate = (date: Date) => {
    // dd/mm/yyyy format
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
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
              إدارة البلاك ليست
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              لوحة تحكم لإدارة المستبعدين مع خاصية الحذف التلقائي بعد 4 شهور
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

        {/* Stats & Search Bar */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-l from-red-50 to-rose-50 px-4 py-4 dark:from-red-950/30 dark:to-rose-900/20">
              <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-gray-900/40">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي البلاك ليست</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">{entries.length}</p>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    نشط
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[620px]">
              {canWrite && validSelectedIds.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-gradient-to-l from-red-50 to-rose-50 px-4 py-3 dark:border-red-900/40 dark:from-red-950/20 dark:to-rose-900/10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/80 p-2 text-red-600 shadow-sm dark:bg-gray-900/40 dark:text-red-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">
                        تم تحديد {validSelectedIds.length} عنصر للحذف
                      </p>
                      <p className="text-xs text-red-700/80 dark:text-red-300/80">
                        يمكنك حذف المحددين دفعة واحدة من هنا
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    حذف المحدد
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{validSelectedIds.length}</span>
                  </button>
                </div>
              )}

              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="blacklist-search"
                  name="blacklistSearch"
                  type="text"
                  className="block w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pr-12 pl-4 leading-5 text-gray-800 placeholder-gray-400 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="ابحث بالاسم أو الرقم القومي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

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
                    <th className="px-6 py-5">تاريخ الإضافة</th>
                    {canWrite && <th className="px-6 py-5 text-center">إجراء</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((person) => (
                    <tr key={person.id} className="border-b last:border-0 hover:bg-transparent dark:bg-transparent transition-colors">
                      {canWrite && (
                        <td className="px-6 py-4 text-center">
                          <div className="relative inline-flex items-center justify-center cursor-pointer">
                            <input
                              id={`blacklist-select-${person.id}`}
                              name={`blacklistSelect-${person.id}`}
                              type="checkbox"
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
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                          {formatDate(person.addedAt)}
                        </span>
                      </td>
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
                {searchQuery ? "لا توجد نتائج مطابقة لبحثك" : "البلاك ليست فارغة"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "جرب البحث باسم أو رقم قومي مختلف." : "لم يتم إدراج أي شخص في قائمة المستبعدين حالياً."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-transparent dark:bg-transparent">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">إضافة شخص للبلاك ليست</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الرباعي</label>
                <input
                  id="blacklist-new-name"
                  name="blacklistNewName"
                  type="text"
                  required
                  pattern="^[\u0600-\u06FFa-zA-Z\s]+$"
                  value={newName}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, ''))}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="أدخل الاسم..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم القومي</label>
                <input
                  id="blacklist-new-national-id"
                  name="blacklistNewNationalId"
                  type="text"
                  required
                  pattern="^\d{14}$"
                  maxLength={14}
                  minLength={14}
                  value={newNationalId}
                  onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => setNewNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="أدخل 14 رقماً..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    "حفظ وإضافة"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا الشخص من البلاك ليست؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">تأكيد الحذف المتعدد</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف {validSelectedIds.length} أشخاص من البلاك ليست؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </RouteGuard>
  );
}
