"use client";

import React, { useState, useRef } from "react";
import RouteGuard from "@/components/RouteGuard";
import { attendanceSheetAPI } from "@/lib/api";

type PageState =
  | { status: "idle" }
  | { status: "file_selected"; file: File }
  | { status: "processing"; file: File }
  | { status: "success"; stats: { workshops: number; sessions: number; totalRows: number }; blob: Blob }
  | { status: "error"; message: string };

const REQUIRED_COLUMNS = [
  "Workshop Name",
  "Date - From",
  'Name "In English"',
  "Gender",
  "Age",
  "Customer Type",
  "Mobile",
  "Email",
  "Faculty",
  "National ID Number",
];

export default function AttendanceSheetPage() {
  const [state, setState] = useState<PageState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isExcel) {
      setState({ status: "error", message: "يرجى رفع ملف Excel بصيغة .xlsx أو .xls فقط." });
      return;
    }
    setState({ status: "file_selected", file });
  };

  const clearSelection = () => {
    setState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProcess = async () => {
    if (state.status !== "file_selected") return;
    const file = state.file;
    setState({ status: "processing", file });
    setProcessingStep(1); // قراءة الملف

    // Simulated UX progress steps
    const timers = [
      setTimeout(() => setProcessingStep(2), 400),
      setTimeout(() => setProcessingStep(3), 900),
      setTimeout(() => setProcessingStep(4), 1400),
    ];

    try {
      const { blob, stats } = await attendanceSheetAPI.build(file);
      
      // Ensure all timers run before resolving success if API is too fast
      timers.forEach(clearTimeout);
      setProcessingStep(4);
      
      setState({ status: "success", stats, blob });
      triggerDownload(blob, `attendance_organized_${new Date().getTime()}.xlsx`);
    } catch (error) {
      timers.forEach(clearTimeout);
      const err = error as Error & { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || err.message || "حدث خطأ غير معروف";
      setState({ status: "error", message: msg });
    }
  };

  return (
    <RouteGuard allowedRoles={["admin", "employee"]}>
      <main className="flex-1 p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="border-b border-gray-200 dark:border-gray-700 pb-6 text-center sm:text-right">
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-3">
              <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              شيت الحضور المنظم
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              حوّل شيت Google Forms لملف Excel منظم ومقسّم في شيتات حسب الـ Workshop
            </p>
          </header>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-10">
            
            {/* Upload Area */}
            {state.status === "idle" || state.status === "error" ? (
              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  isDragging 
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" 
                    : "border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg className="w-16 h-16 mx-auto mb-4 text-teal-500 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">اسحب وأفلت شيت الحضور هنا</h3>
                <p className="text-gray-500 dark:text-gray-400">أو اضغط لاختيار ملف (Excel بصيغة xlsx أو xls)</p>
              </div>
            ) : null}

            {/* Error Message */}
            {state.status === "error" && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {state.message}
              </div>
            )}

            {/* File Selected State */}
            {state.status === "file_selected" || state.status === "processing" ? (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate w-full max-w-[200px] sm:max-w-xs">{state.file.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{(state.file.size / 1024).toFixed(1)} KB</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500" />
                        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">جاهز للمعالجة</span>
                      </div>
                    </div>
                  </div>
                  {state.status === "file_selected" && (
                    <button onClick={clearSelection} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Action Buttons & Progress */}
            {state.status === "file_selected" && (
              <button 
                onClick={handleProcess}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                بناء شيت الحضور المنظم
              </button>
            )}

            {state.status === "processing" && (
              <div className="w-full bg-teal-50 dark:bg-teal-900/20 py-6 px-6 rounded-2xl border border-teal-100 dark:border-teal-800 text-center">
                <svg className="w-8 h-8 mx-auto text-teal-600 dark:text-teal-400 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="font-bold text-teal-800 dark:text-teal-300 text-lg mb-2">جاري المعالجة...</h3>
                <div className="flex flex-col gap-1 items-center justify-center text-sm font-medium">
                  <span className={`${processingStep >= 1 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>1. قراءة الملف...</span>
                  <span className={`${processingStep >= 2 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>2. تجميع السجلات حسب الـ Workshop...</span>
                  <span className={`${processingStep >= 3 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>3. بناء الشيتات...</span>
                  <span className={`${processingStep >= 4 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>4. تجهيز التحميل...</span>
                </div>
              </div>
            )}

            {/* Success State */}
            {state.status === "success" && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">تم بناء الشيت بنجاح!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  تم تحميل الملف تلقائياً إلى جهازك.
                </p>

                <div className="flex items-center justify-center gap-4 mb-8 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 py-3 px-6 rounded-xl inline-flex w-full sm:w-auto">
                  <span className="flex items-center gap-1.5"><strong className="text-blue-600 dark:text-blue-400">{state.stats.workshops}</strong> Workshop</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="flex items-center gap-1.5"><strong className="text-green-600 dark:text-green-400">{state.stats.sessions}</strong> جلسة</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="flex items-center gap-1.5"><strong className="text-purple-600 dark:text-purple-400">{state.stats.totalRows}</strong> سجل</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={() => triggerDownload(state.blob, `attendance_organized_${new Date().getTime()}.xlsx`)}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">
                    تحميل مجدداً
                  </button>
                  <button onClick={clearSelection}
                    className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]">
                    معالجة ملف جديد
                  </button>
                </div>
              </div>
            )}

            {/* Expected Columns Collapsible */}
            {state.status === "idle" && (
              <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                <button 
                  onClick={() => setShowColumns(!showColumns)}
                  className="flex items-center justify-between w-full text-right text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    الأعمدة المطلوبة في الشيت الأصلي
                  </span>
                  <svg className={`w-5 h-5 transition-transform ${showColumns ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showColumns && (
                  <div className="mt-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                      يجب أن يحتوي ملف Google Forms على الأعمدة التالية (يتم البحث بالاسم وليس الترتيب):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REQUIRED_COLUMNS.map(col => (
                        <span key={col} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg font-mono">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">1. ارفع الشيت كما هو</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">قم بتحميل استجابات Google Forms كملف Excel واسحبه هنا مباشرة.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 text-center relative">
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 text-gray-300 dark:text-gray-600 transform -translate-y-1/2 -rotate-90 md:rotate-0">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M10 19L2 12l8-7v4h12v6H10v4z"/></svg>
              </div>
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">2. معالجة سحرية</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">يتم تجميع السجلات تلقائياً حسب الـ Workshop والتاريخ وتنسيقها بشكل جميل.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 text-center relative">
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 text-gray-300 dark:text-gray-600 transform -translate-y-1/2 -rotate-90 md:rotate-0">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M10 19L2 12l8-7v4h12v6H10v4z"/></svg>
              </div>
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">3. جاهز للعمل</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">نزّل ملف Excel بشيت منفصل لكل Workshop جاهز لإدخال بيانات المدربين وتوقيعاتهم.</p>
            </div>
          </div>

        </div>
      </main>
    </RouteGuard>
  );
}
