"use client";

import { useState, useReducer, useRef } from "react";
import dynamic from "next/dynamic";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";

const WorkshopBreakdownTable = dynamic(
  () => import("@/components/organize/WorkshopBreakdownTable"),
  {
    loading: () => <WorkshopBreakdownSkeleton />,
  },
);

// State shape
type State = {
  file: File | null;
  headers: string[];
  rows: Record<string, unknown>[];
  workshopGroups: Map<string, Record<string, unknown>[]>;
  missingColumns: string[];
  status: "idle" | "parsing" | "ready" | "exporting" | "done";
  error: string | null;
};

type Action =
  | { type: "SET_FILE"; file: File }
  | {
      type: "PARSE_SUCCESS";
      headers: string[];
      rows: Record<string, unknown>[];
      groups: Map<string, Record<string, unknown>[]>;
      missing: string[];
    }
  | { type: "PARSE_ERROR"; error: string }
  | { type: "START_EXPORT" }
  | { type: "EXPORT_DONE" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.file, status: "parsing", error: null };
    case "PARSE_SUCCESS":
      return {
        ...state,
        status: "ready",
        headers: action.headers,
        rows: action.rows,
        workshopGroups: action.groups,
        missingColumns: action.missing,
      };
    case "PARSE_ERROR":
      return { ...state, status: "idle", error: action.error };
    case "START_EXPORT":
      return { ...state, status: "exporting" };
    case "EXPORT_DONE":
      return { ...state, status: "done" };
    case "RESET":
      return {
        file: null,
        headers: [],
        rows: [],
        workshopGroups: new Map(),
        missingColumns: [],
        status: "idle",
        error: null,
      };
    default:
      return state;
  }
}

const REQUIRED_COLUMNS = [
  "Workshop Name",
  "National ID Number",
  'Name "In English"',
];

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function OrganizePageSkeleton() {
  return (
    <main
      className="flex-1 w-full p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100"
      dir="rtl"
    >
      <div className="mx-auto max-w-4xl w-full animate-pulse">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30" />
          <div className="space-y-3">
            <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 max-w-[70vw] rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="mb-3 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30" />
              <div className="h-4 w-64 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
            <div className="mb-4 h-4 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="space-y-3">
                  <div className="h-8 w-8 rounded-full bg-white shadow-sm dark:bg-gray-700" />
                  <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-2/3 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ProcessingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80"
          >
            <div className="mb-3 h-3 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
        <div className="mb-4 h-4 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-7 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkshopBreakdownSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-3 p-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="grid grid-cols-3 gap-4">
            <div className="h-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrganizePage() {
  const [state, dispatch] = useReducer(reducer, {
    file: null,
    headers: [],
    rows: [],
    workshopGroups: new Map(),
    missingColumns: [],
    status: "idle",
    error: null,
  });

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      dispatch({
        type: "PARSE_ERROR",
        error: "الرجاء رفع ملف Excel (.xlsx أو .xls)",
      });
      return;
    }
    dispatch({ type: "SET_FILE", file });

    try {
      const { readExcelRaw } = await import("@/lib/excel");
      const { headers, rows } = await readExcelRaw(file);

      const missing = REQUIRED_COLUMNS.filter(
        (req) =>
          !headers.some(
            (h) => normalizeHeader(h) === req.toLowerCase(),
          ),
      );

      const workshopHeader =
        headers.find(
          (h) => normalizeHeader(h) === "workshop name",
        ) || "Workshop Name";

      const timestampHeader =
        headers.find(
          (h) => normalizeHeader(h) === "timestamp",
        ) || "Timestamp";

      const groups = new Map<string, Record<string, unknown>[]>();

      rows.forEach((row) => {
        const rawVal = row[workshopHeader];
        const workshopName =
          typeof rawVal === "string" && rawVal.trim() !== ""
            ? rawVal.trim()
            : "غير محدد";

        const rawTimestamp = row[timestampHeader];
        let datePart = "";
        if (rawTimestamp instanceof Date) {
          const dd = String(rawTimestamp.getDate()).padStart(2, "0");
          const mm = String(rawTimestamp.getMonth() + 1).padStart(2, "0");
          const yyyy = rawTimestamp.getFullYear();
          datePart = `${mm}/${dd}/${yyyy}`;
        } else if (typeof rawTimestamp === "string") {
          datePart = rawTimestamp.split(" ")[0];
        } else if (rawTimestamp) {
          datePart = String(rawTimestamp).split(" ")[0];
        }

        const groupKey = datePart
          ? `${workshopName} - ${datePart}`
          : workshopName;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
      });

      dispatch({ type: "PARSE_SUCCESS", headers, rows, groups, missing });
    } catch (error) {
      dispatch({
        type: "PARSE_ERROR",
        error: error instanceof Error ? error.message : "خطأ أثناء قراءة الملف",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleExport = async () => {
    if (!state.file || state.status !== "ready") return;

    dispatch({ type: "START_EXPORT" });

    try {
      const [{ organizeAndDownload }, { logAction }] = await Promise.all([
        import("@/lib/excel"),
        import("@/lib/audit"),
      ]);

      organizeAndDownload(state.rows, state.headers, state.file.name);

      if (user) {
        await logAction({
          action: "sheet_organize",
          details: `تم تنظيم شيت حضور — ${state.rows.length} سجل موزعة على ${state.workshopGroups.size} Workshop`,
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
        });
      }

      dispatch({ type: "EXPORT_DONE" });
      showToast("تم تنزيل الشيت المنظم بنجاح", "success");
    } catch {
      showToast("حدث خطأ أثناء التنظيم", "error");
      dispatch({
        type: "PARSE_SUCCESS",
        headers: state.headers,
        rows: state.rows,
        groups: state.workshopGroups,
        missing: state.missingColumns,
      });
    }
  };

  return (
    <RouteGuard
      allowedRoles={["admin", "employee"]}
      fallback={<OrganizePageSkeleton />}
    >
      <main
        className="flex-1 w-full p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100"
        dir="rtl"
      >
        {toast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div
              className={`px-6 py-3 rounded-full shadow-lg font-bold text-sm ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
            >
              {toast.message}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-4xl w-full">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">
                تنظيم شيت الحضور
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                رفع شيت Google Forms العشوائي وتنزيله منظماً حسب الـ Workshop
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Upload Area */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/80 backdrop-blur-sm">
              {state.file ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                        {state.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(state.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: "RESET" })}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-blue-500 dark:hover:bg-gray-800"
                >
                  <div className="mb-3 rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    اسحب شيت Google Forms هنا أو انقر لاختياره
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    يدعم ملفات XLSX و XLS
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}
              {state.error && (
                <p className="mt-3 text-sm font-bold text-red-500 text-center">
                  {state.error}
                </p>
              )}
            </div>

            {state.status === "parsing" && <ProcessingSkeleton />}

            {/* Preview Section */}
            {(state.status === "ready" ||
              state.status === "exporting" ||
              state.status === "done") && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      إجمالي السجلات
                    </p>
                    <p className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">
                      {state.rows.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      عدد الـ Workshops
                    </p>
                    <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                      {state.workshopGroups.size}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      سجلات بدون Workshop
                    </p>
                    <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                      {state.workshopGroups.get("غير محدد")?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Column Detection Status */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    الأعمدة المكتشفة
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {REQUIRED_COLUMNS.map((req) => {
                      const isMissing = state.missingColumns.includes(req);
                      return (
                        <div
                          key={req}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${isMissing ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"}`}
                        >
                          {isMissing ? (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3 h-3"
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
                          )}
                          {req}
                        </div>
                      );
                    })}
                  </div>
                  {state.missingColumns.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 rounded-l-lg text-sm text-red-700 dark:text-red-400">
                      <strong>تنبيه:</strong> بعض الأعمدة المطلوبة غير موجودة في
                      الشيت. يرجى التأكد من مطابقة رؤوس الأعمدة كما هي في Google
                      Forms.
                    </div>
                  )}
                </div>

                {/* Breakdown Table */}
                <WorkshopBreakdownTable
                  groups={state.workshopGroups}
                  total={state.rows.length}
                />

                {/* Export Button */}
                <div
                  title={
                    state.missingColumns.length > 0
                      ? "أعمدة مطلوبة مفقودة من الملف"
                      : ""
                  }
                >
                  <button
                    onClick={handleExport}
                    disabled={
                      state.status !== "ready" ||
                      state.missingColumns.length > 0
                    }
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    {state.status === "exporting" ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري التنظيم...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        تنزيل الشيت المنظم
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                كيف يعمل التنظيم؟
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shadow-sm text-sm border border-gray-100 dark:border-gray-600">
                    1
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    ارفع شيت الـ Google Forms كما هو
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold shadow-sm text-sm border border-gray-100 dark:border-gray-600">
                    2
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    يتم تجميع السجلات تلقائياً حسب الـ Workshop
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shadow-sm text-sm border border-gray-100 dark:border-gray-600">
                    3
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    نزّل الشيت المنظم بفاصل أسود بين كل Workshop
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
