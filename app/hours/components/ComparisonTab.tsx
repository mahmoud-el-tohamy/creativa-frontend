"use client";
import type { ProgramComparison, MonthlyDiffEntry } from "@/lib/types/planned";
import { hoursAPI, plannedAPI } from "@/lib/api";


import React, { useReducer, useEffect, useCallback, useMemo } from "react";
import CustomSelect from "@/components/ui/CustomSelect";

import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { getCurrentFiscalYear, downloadBlob, FY_CALENDAR_MONTHS, ARABIC_MONTH_SHORT, TIMETABLE_PROGRAM_COLORS, INITIAL_STATE, reducer } from "./sharedHoursTypes";

interface ComparisonChartProps {
  data: ProgramComparison[];
  isActive: boolean;
}

const ComparisonChart = React.memo(function ComparisonChart({ data, isActive }: ComparisonChartProps) {
  if (!isActive) {
    return (
      <div className="h-[400px] w-full bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
        يتم التحميل...
      </div>
    );
  }

  const chartData = data.map((pc) => ({
    name: pc.program.length > 14 ? pc.program.slice(0, 13) + "…" : pc.program,
    fullName: pc.program,
    planned: pc.plannedTotal,
    actual: pc.actualTotal,
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#F9FAFB",
            }}
            formatter={(value, name) => [
              value,
              String(name) === "planned" ? "الخطة" : "المنجز",
            ]}
            labelFormatter={(label, payload) => {
              const item = (
                payload as unknown as Array<{ payload?: { fullName?: string } }>
              )?.[0]?.payload;
              return item?.fullName ?? String(label);
            }}
          />
          <Legend
            formatter={(value) => (value === "planned" ? "الخطة" : "المنجز")}
          />
          {/* Recharts ReferenceLine types can be tricky */}
          <ReferenceLine y={0} stroke="#6B7280" />
          <Bar
            dataKey="planned"
            fill="#3B82F6"
            opacity={0.7}
            radius={[3, 3, 0, 0]}
            name="planned"
          />
          <Bar
            dataKey="actual"
            fill="#1D9E75"
            opacity={0.9}
            radius={[3, 3, 0, 0]}
            name="actual"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export interface ComparisonTabProps {
  fiscalYears: string[];
  showToast: (msg: string, type: "success" | "error") => void;
  isActive: boolean;
}

function ComparisonTab({ fiscalYears, showToast, isActive }: ComparisonTabProps) {

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const loadComparison = useCallback(async (fy: string) => {
    dispatch({ type: "SET_COMPARISON_LOADING", loading: true });
    try {
      const res = await plannedAPI.getComparison(fy);
      dispatch({ type: "SET_COMPARISON_DATA", data: res.data.data });
    } catch {
      dispatch({ type: "SET_COMPARISON_DATA", data: null });
    }
  }, []);

  useEffect(() => {
    if (!state.comparisonData) {
      loadComparison(state.selectedComparisonFY);
    }
  }, [state.selectedComparisonFY, state.comparisonData, loadComparison]);


  const {
    comparisonData: cmp,
    comparisonLoading,
    selectedComparisonFY,
  } = state;

  const fyOptions = useMemo(
    () => [
      {
        value: getCurrentFiscalYear(),
        label: getCurrentFiscalYear() + " (الحالية)",
      },
      ...fiscalYears
        .filter((fy) => fy !== getCurrentFiscalYear())
        .map((fy) => ({ value: fy, label: fy })),
    ],
    [fiscalYears],
  );

  const handleExportComparison = async () => {
    try {
      const res = await plannedAPI.export(selectedComparisonFY);
      downloadBlob(
        res.data as Blob,
        `planned-comparison-${selectedComparisonFY}.xlsx`,
      );
    } catch (err: unknown) {
      console.error("Export comparison error:", err);
      showToast(
        `فشل تحميل تقرير المقارنة: ${(err as Error)?.message || "خطأ غير معروف"}`,
        "error",
      );
    }
  };

  const handleExportTimetable = async () => {
    try {
      const res = await hoursAPI.exportTimetable(selectedComparisonFY);
      downloadBlob(res.data as Blob, `timetable-${selectedComparisonFY}.xlsx`);
    } catch (err: unknown) {
      console.error("Export timetable error:", err);
      showToast(
        `فشل تحميل الجدول الزمني: ${(err as Error)?.message || "خطأ غير معروف"}`,
        "error",
      );
    }
  };

  // Completion pct color
  const pctColor = (pct: number) => {
    if (pct > 100) return "text-purple-600 dark:text-purple-400";
    if (pct >= 80) return "text-teal-600 dark:text-teal-400";
    if (pct >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const barColor = (pct: number) => {
    if (pct > 100) return "#9333EA";
    if (pct >= 80) return "#1D9E75";
    if (pct >= 50) return "#F59E0B";
    return "#EF4444";
  };

  if (comparisonLoading || !cmp) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg
          className="animate-spin w-10 h-10 text-teal-500"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FY selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <CustomSelect
            value={selectedComparisonFY}
            options={
              fyOptions.length > 0
                ? fyOptions
                : [{ value: selectedComparisonFY, label: selectedComparisonFY }]
            }
            onChange={(v) => dispatch({ type: "SET_COMPARISON_FY", fy: v })}
          />
        </div>
      </div>

      {!cmp ? (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            جاري تحميل بيانات المقارنة...
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Grand Planned */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  إجمالي الخطة
                </p>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {cmp.grandPlanned}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">أيام مخططة</p>
              </div>
            </div>

            {/* Card 2: Grand Actual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
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
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  إجمالي المنجز
                </p>
                <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                  {cmp.grandActual}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">أيام فعلية</p>
              </div>
            </div>

            {/* Card 3: Diff */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cmp.grandDiff >= 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
              >
                <svg
                  className={`w-5 h-5 ${cmp.grandDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      cmp.grandDiff >= 0
                        ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    }
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  الفارق
                </p>
                <p
                  className={`text-2xl font-extrabold ${cmp.grandDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {cmp.grandDiff > 0 ? "+" : ""}
                  {cmp.grandDiff}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {cmp.grandDiff >= 0 ? "فائض" : "عجز"}
                </p>
              </div>
            </div>

            {/* Card 4: Overall Completion */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cmp.overallCompletionPct >= 80 ? "bg-teal-100 dark:bg-teal-900/40" : cmp.overallCompletionPct >= 50 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
              >
                <svg
                  className={`w-5 h-5 ${pctColor(cmp.overallCompletionPct)}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  نسبة الإنجاز الكلية
                </p>
                <p
                  className={`text-2xl font-extrabold ${pctColor(cmp.overallCompletionPct)}`}
                >
                  {cmp.overallCompletionPct.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{cmp.fiscalYear}</p>
              </div>
            </div>
          </div>

          {/* Program comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                مقارنة البرامج
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <th className="px-4 py-3 text-right">البرنامج</th>
                    <th className="px-3 py-3 text-center">الخطة</th>
                    <th className="px-3 py-3 text-center">المنجز</th>
                    <th className="px-3 py-3 text-center">الفارق</th>
                    <th className="px-3 py-3 text-center min-w-[140px]">
                      نسبة الإنجاز
                    </th>
                    <th className="px-3 py-3 text-center">Q1</th>
                    <th className="px-3 py-3 text-center">Q2</th>
                    <th className="px-3 py-3 text-center">Q3</th>
                    <th className="px-3 py-3 text-center">Q4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cmp.programComparisons.map((pc) => {
                    const color =
                      TIMETABLE_PROGRAM_COLORS[pc.program] ?? "#E5E7EB";
                    const barFill = barColor(pc.completionPct);
                    const barW = Math.min(100, pc.completionPct);
                    return (
                      <tr
                        key={pc.program}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td
                          className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 text-sm"
                          style={{ borderRight: `3px solid ${color}` }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            {pc.program}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                          {pc.plannedTotal}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-teal-600 dark:text-teal-400">
                          {pc.actualTotal}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-center font-bold ${pc.diffTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pc.diffTotal > 0 ? "+" : ""}
                          {pc.diffTotal}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${barW}%`,
                                  backgroundColor: barFill,
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs font-bold w-12 text-left ${pctColor(pc.completionPct)}`}
                            >
                              {pc.completionPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">
                          {pc.q1Actual}/{pc.q1Planned}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">
                          {pc.q2Actual}/{pc.q2Planned}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">
                          {pc.q3Actual}/{pc.q3Planned}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">
                          {pc.q4Actual}/{pc.q4Planned}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gray-50 dark:bg-gray-700/40 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 text-sm">
                      الإجمالي
                    </td>
                    <td className="px-3 py-2.5 text-center text-blue-700 dark:text-blue-300">
                      {cmp.grandPlanned}
                    </td>
                    <td className="px-3 py-2.5 text-center text-teal-700 dark:text-teal-300">
                      {cmp.grandActual}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-center ${cmp.grandDiff >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      {cmp.grandDiff > 0 ? "+" : ""}
                      {cmp.grandDiff}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-sm font-extrabold ${pctColor(cmp.overallCompletionPct)}`}
                      >
                        {cmp.overallCompletionPct.toFixed(1)}%
                      </span>
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar chart */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 pt-10 relative">
              <h3 className="absolute -top-3.5 right-6 bg-white dark:bg-gray-900 px-3 text-sm font-bold text-gray-500">
                مخطط المقارنة
              </h3>
              <ComparisonChart data={cmp.programComparisons} isActive={isActive} />
            </div>

          {/* Difference heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                خريطة الفارق الشهرية
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                القيمة = المنجز − المخطط لكل شهر
              </p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs border-collapse" dir="rtl">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 font-semibold min-w-[160px]">
                      البرنامج
                    </th>
                    {FY_CALENDAR_MONTHS.map((calMonth) => (
                      <th
                        key={calMonth}
                        className="px-1 py-2 text-center text-gray-500 dark:text-gray-400 font-medium w-12"
                      >
                        {ARABIC_MONTH_SHORT[calMonth]}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-gray-600 dark:text-gray-400 font-semibold">
                      المجموع
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.programComparisons.map((pc) => {
                    const color =
                      TIMETABLE_PROGRAM_COLORS[pc.program] ?? "#E5E7EB";
                    return (
                      <tr
                        key={pc.program}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td
                          className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium text-[11px]"
                          style={{ borderRight: `3px solid ${color}` }}
                        >
                          {pc.program}
                        </td>
                        {FY_CALENDAR_MONTHS.map((calMonth) => {
                          const monthEntry = cmp.monthlyDiff.find(
                            (m: MonthlyDiffEntry) => m.monthIndex === calMonth,
                          );
                          const progEntry = monthEntry?.programs[pc.program];
                          const diff = progEntry?.monthDiff ?? 0;
                          let cellBg = "";
                          if (diff > 0) {
                            const intensity = Math.min(diff * 30, 100);
                            cellBg = `rgba(16, 185, 129, ${0.15 + intensity / 400})`;
                          } else if (diff < 0) {
                            const intensity = Math.min(
                              Math.abs(diff) * 30,
                              100,
                            );
                            cellBg = `rgba(239, 68, 68, ${0.15 + intensity / 400})`;
                          }
                          return (
                            <td
                              key={calMonth}
                              className="text-center py-2 px-1"
                              style={{ backgroundColor: cellBg }}
                            >
                              <span
                                className={`text-[11px] font-bold ${diff > 0 ? "text-green-700 dark:text-green-400" : diff < 0 ? "text-red-700 dark:text-red-400" : "text-gray-400"}`}
                              >
                                {diff !== 0
                                  ? diff > 0
                                    ? `+${diff}`
                                    : diff
                                  : ""}
                              </span>
                            </td>
                          );
                        })}
                        <td
                          className={`px-2 py-2 text-center font-bold text-xs ${pc.diffTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pc.diffTotal > 0 ? "+" : ""}
                          {pc.diffTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportComparison}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              تحميل تقرير المقارنة
            </button>
            <button
              onClick={handleExportTimetable}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              تحميل خطة التوقيت
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────


export default ComparisonTab;
