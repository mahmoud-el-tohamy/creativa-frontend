"use client";

import React, {} from "react";
import { hoursAPI } from "@/lib/api";
import type {
  } from "@/lib/types/planned";

import { getCurrentFiscalYear, downloadBlob } from "./sharedHoursTypes";

export interface ArchiveTabProps {
  fiscalYears: string[];
  showToast: (msg: string, type: "success" | "error") => void;
  onViewTimetable: (fy: string) => void;
}

function ArchiveTab({
  fiscalYears,
  showToast,
  onViewTimetable
}: ArchiveTabProps) {
  const currentFY = getCurrentFiscalYear();

  const handleExport = async (fy: string, type: "hours" | "timetable") => {
    try {
      const res =
        type === "hours"
          ? await hoursAPI.exportTracking(fy)
          : await hoursAPI.exportTimetable(fy);
      downloadBlob(res.data as Blob, `${type}-${fy}.xlsx`);
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

  if (fiscalYears.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
        <svg
          className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          لا توجد بيانات للسنوات السابقة
        </p>
        <p className="text-gray-400 text-xs mt-1">
          ستظهر السنوات هنا بعد إضافة جلسات تدريبية
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {fiscalYears.map((fy) => (
        <div
          key={fy}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {fy}
            </h3>
            {fy === currentFY && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                السنة الحالية
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                onViewTimetable(fy);
              }}
              className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition-colors"
            >
              عرض التفاصيل
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleExport(fy, "hours")}
              className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Hours
            </button>
            <button
              onClick={() => handleExport(fy, "timetable")}
              className="flex-1 py-1.5 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 text-teal-700 dark:text-teal-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Timetable
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}




export default ArchiveTab;
