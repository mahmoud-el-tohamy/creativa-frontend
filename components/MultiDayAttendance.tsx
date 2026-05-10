"use client";

import { useRef, useState } from "react";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from "@/lib/audit";
import { addManyToBlacklist, getBlacklistIds } from "@/lib/blacklist";
import {
  downloadStyledExcel,
  MultiDayAttendancePerson,
  MultiDayAttendanceSummaryRow,
  readMultiDayAttendanceExcel,
} from "@/lib/excel";

interface ProcessingResult {
  totalRows: number;
  uniquePeopleCount: number;
  passedList: MultiDayAttendanceSummaryRow[];
  failedList: MultiDayAttendanceSummaryRow[];
  addedToBlacklist: MultiDayAttendanceSummaryRow[];
  addedToBlacklistCount: number;
  skippedExistingCount: number;
  invalidBlacklistEntries: { name: string; nationalId: string; reason: string; attendedDays: number }[];
  skippedExistingBlacklistEntries: { name: string; nationalId: string; attendedDays: number }[];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function MultiDayAttendance() {
  const { user } = useAuth();
  const [totalTrainingDays, setTotalTrainingDays] = useState("5");
  const [minimumAttendanceDays, setMinimumAttendanceDays] = useState("3");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [parsedRows, setParsedRows] = useState<MultiDayAttendancePerson[] | null>(
    null,
  );
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 5000);
  };

  const resetResults = () => {
    setResult(null);
  };

  const handleFileSelection = async (selectedFile: File) => {
    if (!isExcelFile(selectedFile)) {
      showToast("يُسمح فقط برفع ملفات Excel أو CSV.", "error");
      return;
    }

    setIsParsingFile(true);
    setFileInfo(null);
    setParsedRows(null);
    resetResults();

    try {
      const rows = await readMultiDayAttendanceExcel(selectedFile);
      setFileInfo({ name: selectedFile.name, size: selectedFile.size });
      setParsedRows(rows);
      showToast(`تم تحميل الملف بنجاح. تم العثور على ${rows.length} سجل.`, "success");
    } catch (error: unknown) {
      console.error(error);
      showToast(getErrorMessage(error, "تعذر قراءة الملف."), "error");
    } finally {
      setIsParsingFile(false);
    }
  };

  const clearFile = () => {
    setFileInfo(null);
    setParsedRows(null);
    resetResults();
  };

  const handleProcess = async () => {
    const totalDays = Number(totalTrainingDays);
    const minimumDays = Number(minimumAttendanceDays);

    if (!fileInfo || !parsedRows) {
      showToast("الرجاء رفع ملف الحضور أولاً.", "error");
      return;
    }

    if (!Number.isFinite(totalDays) || totalDays <= 0) {
      showToast("أدخل قيمة صحيحة لإجمالي أيام التدريب.", "error");
      return;
    }

    if (!Number.isFinite(minimumDays) || minimumDays <= 0) {
      showToast("أدخل قيمة صحيحة للحد الأدنى المسموح للحضور.", "error");
      return;
    }

    if (minimumDays > totalDays) {
      showToast("الحد الأدنى للحضور لا يمكن أن يكون أكبر من إجمالي أيام التدريب.", "error");
      return;
    }

    setIsProcessing(true);
    resetResults();

    try {
      const grouped = new Map<string, MultiDayAttendanceSummaryRow>();

      parsedRows.forEach((person) => {
        const existing = grouped.get(person.id);

        if (existing) {
          existing.attendedDays += 1;
          return;
        }

        grouped.set(person.id, {
          ...person,
          attendedDays: 1,
        });
      });

      const summaryRows = Array.from(grouped.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "ar"),
      );
      const passedList = summaryRows.filter(
        (person) => person.attendedDays >= minimumDays,
      );
      const failedList = summaryRows.filter(
        (person) => person.attendedDays < minimumDays,
      );

      const existingBlacklistIds =
        failedList.length > 0 ? await getBlacklistIds() : new Set<string>();

      const invalidBlacklistEntries: { name: string; nationalId: string; reason: string; attendedDays: number }[] = [];
      const skippedExistingBlacklistEntries: { name: string; nationalId: string; attendedDays: number }[] = [];
      const newBlacklistEntries = failedList.filter((person) => {
        if (existingBlacklistIds.has(person.nationalId)) {
          skippedExistingBlacklistEntries.push({
            name: person.name,
            nationalId: person.nationalId,
            attendedDays: person.attendedDays,
          });
          return false;
        }
        
        if (person.invalidReason) {
          invalidBlacklistEntries.push({
            name: person.name,
            nationalId: person.nationalId,
            reason: person.invalidReason,
            attendedDays: person.attendedDays,
          });
          return false;
        }
        
        return true;
      });

      if (newBlacklistEntries.length > 0) {
        await addManyToBlacklist(
          newBlacklistEntries.map((person) => ({
            name: person.name,
            nationalId: person.nationalId,
          })),
        );
      }

      const processingResult: ProcessingResult = {
        totalRows: parsedRows.length,
        uniquePeopleCount: summaryRows.length,
        passedList,
        failedList,
        addedToBlacklist: newBlacklistEntries,
        addedToBlacklistCount: newBlacklistEntries.length,
        skippedExistingCount: skippedExistingBlacklistEntries.length,
        invalidBlacklistEntries,
        skippedExistingBlacklistEntries,
      };

      setResult(processingResult);

      if (user) {
        await logAction({
          action: "attendance_upload",
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
          targetId: "",
          targetName: "",
          details: `تمت معالجة حضور متعدد الأيام — ناجح ${passedList.length}، راسب ${failedList.length}، مضاف للبلاك ليست ${newBlacklistEntries.length}`,
        });
      }

      showToast(
        `تمت المعالجة: نجاح ${passedList.length}، وتمت إضافة ${newBlacklistEntries.length} للبلاك ليست`,
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء معالجة الملف أو تحديث البلاك ليست.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPassed = () => {
    if (!result?.passedList.length) {
      showToast("لا يوجد ناجحون لتصديرهم.", "error");
      return;
    }
    const data: (string | number)[][] = [
      ["الاسم", "الرقم القومي", "أيام الحضور"],
      ...result.passedList.map(p => [p.name, p.nationalId, p.attendedDays])
    ];
    downloadStyledExcel({
      data,
      sheetName: "الحاضرون ✓",
      filename: `creativa_متعدد_الايام_${new Date().toISOString().slice(0, 10)}_ناجحين`,
      rowColors: { odd: "F0FFF8", even: "FFFFFF" }
    });
  };

  const handleDownloadBlacklisted = () => {
    if (!result?.addedToBlacklist.length && !result?.invalidBlacklistEntries.length && !result?.skippedExistingBlacklistEntries.length) {
      showToast("لا يوجد مضافين للبلاك ليست لتصديرهم.", "error");
      return;
    }
    const data: (string | number)[][] = [
      ["الاسم", "الرقم القومي", "أيام الحضور", "ملاحظات"],
      ...result.addedToBlacklist.map(p => [p.name, p.nationalId, p.attendedDays, "تم الإضافة للبلاك ليست"]),
      ...result.invalidBlacklistEntries.map(p => [p.name, p.nationalId, p.attendedDays, p.reason]),
      ...result.skippedExistingBlacklistEntries.map(p => [p.name, p.nationalId, p.attendedDays, "موجود مسبقاً في البلاك ليست"])
    ];
    downloadStyledExcel({
      data,
      sheetName: "البلاك ليست 🚫",
      filename: `creativa_متعدد_الايام_${new Date().toISOString().slice(0, 10)}_مرفوضين`,
      rowColors: { odd: "FFF0F0", even: "FFFFFF" }
    });
  };

  return (
    <RouteGuard allowedRoles={["admin", "employee"]}>
      <main
        className="flex-1 w-full p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100"
        dir="rtl"
      >
        {toast && (
          <div
            className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-6 py-3 shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-3 border-b border-gray-200 pb-6 text-center dark:border-gray-800">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-900 dark:text-blue-400 sm:text-4xl">
              رصد حضور البرامج متعددة الأيام
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              ارفع كشف الحضور، حدد عدد أيام البرنامج والحد الأدنى للحضور، وسنولد لك الشيت النظيف تلقائيًا.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    إجمالي أيام التدريب
                  </span>
                  <input
                    id="total-training-days"
                    name="totalTrainingDays"
                    type="number"
                    min="1"
                    value={totalTrainingDays}
                    onChange={(e) => {
                      setTotalTrainingDays(e.target.value);
                      resetResults();
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="مثال: 5"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    الحد الأدنى المسموح للحضور
                  </span>
                  <input
                    id="minimum-attendance-days"
                    name="minimumAttendanceDays"
                    type="number"
                    min="1"
                    value={minimumAttendanceDays}
                    onChange={(e) => {
                      setMinimumAttendanceDays(e.target.value);
                      resetResults();
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="مثال: 3"
                  />
                </label>
              </div>

              <div className="mt-6">
                <SingleFileUploadArea
                  fileInfo={fileInfo}
                  parsedRowsCount={parsedRows?.length ?? 0}
                  isParsing={isParsingFile}
                  onFileSelect={handleFileSelection}
                  onClear={clearFile}
                />
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  الأعمدة المطلوبة داخل الملف: <span className="font-semibold text-gray-700 dark:text-gray-200">Name</span>،
                  <span className="font-semibold text-gray-700 dark:text-gray-200"> ID</span>،
                  <span className="font-semibold text-gray-700 dark:text-gray-200"> National ID</span>
                </p>

                <button
                  onClick={handleProcess}
                  disabled={isProcessing || isParsingFile || !fileInfo || !parsedRows}
                  className={`rounded-full px-8 py-3 text-lg font-bold text-white shadow-md transition-all duration-300 ${
                    isProcessing || isParsingFile || !fileInfo || !parsedRows
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-blue-600 hover:scale-[1.02] hover:bg-blue-700"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <SpinnerIcon />
                      جاري المعالجة...
                    </span>
                  ) : (
                    "معالجة وإصدار"
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                طريقة العمل
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                <p>يتم تجميع السجلات حسب عمود ID.</p>
                <p>عدد مرات ظهور كل ID يمثل عدد أيام الحضور الفعلية.</p>
                <p>من لم يصل إلى الحد الأدنى يُضاف تلقائيًا إلى البلاك ليست.</p>
                <p>الناجحون فقط يظهرون بالأسفل مع إمكانية تنزيل Clean Sheet جديد.</p>
              </div>
            </div>
          </section>

          {result && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title="إجمالي السجلات"
                  value={result.totalRows}
                  color="text-sky-600 dark:text-sky-400"
                  bgColor="bg-sky-50 dark:bg-sky-900/20"
                />
                <StatCard
                  title="إجمالي المتدربين"
                  value={result.uniquePeopleCount}
                  color="text-blue-600 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-900/20"
                />
                <StatCard
                  title="الناجحون"
                  value={result.passedList.length}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-50 dark:bg-green-900/20"
                />
                <StatCard
                  title="المرفوضون"
                  value={result.failedList.length}
                  color="text-amber-600 dark:text-amber-400"
                  bgColor="bg-amber-50 dark:bg-amber-900/20"
                />
                <StatCard
                  title="أضيفوا للبلاك ليست"
                  value={result.addedToBlacklistCount}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-900/20"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      الشيت النظيف للناجحين
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      تم استبعاد غير المستوفين تلقائيًا. المتكرر مسبقًا في البلاك ليست: {result.skippedExistingCount}
                    </p>
                  </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownloadPassed}
                    disabled={result.passedList.length === 0}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                      result.passedList.length === 0
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-teal-600 hover:scale-[1.02] hover:bg-teal-700"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    شيت الناجحين
                  </button>
                  <button
                    onClick={handleDownloadBlacklisted}
                    disabled={result.addedToBlacklist.length === 0 && result.invalidBlacklistEntries.length === 0 && result.skippedExistingBlacklistEntries.length === 0}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                      result.addedToBlacklist.length === 0 && result.invalidBlacklistEntries.length === 0 && result.skippedExistingBlacklistEntries.length === 0
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-red-600 hover:scale-[1.02] hover:bg-red-700"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    شيت المضافين للبلاك ليست
                  </button>
                </div>
              </div>

                <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full min-w-[720px] text-right text-sm text-gray-600 dark:text-gray-300">
                    <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                      <tr>
                        <th className="px-5 py-4">الاسم</th>
                        <th className="px-5 py-4">ID</th>
                        <th className="px-5 py-4">الرقم القومي</th>
                        <th className="px-5 py-4">أيام الحضور</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.passedList.length > 0 ? (
                        result.passedList.map((person) => (
                          <tr
                            key={`${person.id}-${person.nationalId}`}
                            className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-900/30"
                          >
                            <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-100">
                              {person.name}
                            </td>
                            <td className="px-5 py-4">{person.id}</td>
                            <td className="px-5 py-4">
                              {person.invalidReason ? (
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                  رقم غير صالح
                                </span>
                              ) : (
                                person.nationalId
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                {person.attendedDays} / {totalTrainingDays}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            لا يوجد ناجحون وفق الحد الأدنى الحالي.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Invalid Entries Warning Card */}
              {result.invalidBlacklistEntries && result.invalidBlacklistEntries.length > 0 && (
                <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-r-xl p-6 shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400">
                      تحذير: تم تجاهل {result.invalidBlacklistEntries.length} سجل من الإضافة للبلاك ليست بسبب أرقام قومية غير صالحة
                    </h3>
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-semibold text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-300 select-none outline-none">
                      عرض التفاصيل
                    </summary>
                    <div className="mt-4 overflow-hidden overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800/50">
                      <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
                        <thead className="bg-amber-100/50 dark:bg-amber-900/30 font-semibold border-b border-amber-200 dark:border-amber-800">
                          <tr>
                            <th className="px-4 py-3">الاسم</th>
                            <th className="px-4 py-3">الرقم القومي</th>
                            <th className="px-4 py-3">السبب</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.invalidBlacklistEntries.map((entry, idx) => (
                            <tr key={idx} className="border-b border-amber-100 dark:border-amber-800/50 last:border-0 hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.name}</td>
                              <td className="px-4 py-3">{entry.nationalId}</td>
                              <td className="px-4 py-3 text-red-600 dark:text-red-400">{entry.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </RouteGuard>
  );
}

function StatCard({
  title,
  value,
  color,
  bgColor,
}: {
  title: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-center shadow-sm ${bgColor}`}>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
      <p className={`mt-2 text-4xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function SingleFileUploadArea({
  fileInfo,
  parsedRowsCount,
  isParsing,
  onFileSelect,
  onClear,
}: {
  fileInfo: { name: string; size: number } | null;
  parsedRowsCount: number;
  isParsing: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setIsDragging(true);
    } else if (event.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  return (
    <div
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 bg-transparent hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900/20"
      } ${fileInfo ? "border-green-400 bg-green-50 dark:bg-green-900/20" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id="multi-day-attendance-file"
        name="multiDayAttendanceFile"
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={handleChange}
      />

      {isParsing ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <SpinnerIcon />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
              جاري قراءة الملف...
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              الرجاء الانتظار لحظات
            </p>
          </div>
        </div>
      ) : fileInfo ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="break-all text-lg font-bold text-gray-800 dark:text-gray-100">
              {fileInfo.name}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {parsedRowsCount} سجل قابل للمعالجة • {formatFileSize(fileInfo.size)}
            </p>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClear();

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-white px-4 py-1.5 text-sm font-bold text-red-500 shadow-sm transition hover:text-red-700 dark:border-red-900/30 dark:bg-gray-800"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            إزالة الملف
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-white text-blue-600 shadow-sm dark:border-gray-800 dark:bg-gray-800 dark:text-blue-300">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
              اسحب وأفلت ملف الحضور هنا
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              أو اضغط لاختيار ملف Excel واحد
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function isExcelFile(file: File) {
  return /\.(xlsx|xls|csv)$/i.test(file.name);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
