"use client";
import type {} from "@/lib/types/planned";
import { hoursAPI, IMonthData, IAnnualTotal } from "@/lib/api";

import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  Tooltip,
  XAxis,
} from "recharts";

import {
  getCurrentFiscalYear,
  downloadBlob,
  TIMETABLE_PROGRAMS,
  TIMETABLE_PROGRAM_COLORS,
  INITIAL_STATE,
  reducer,
} from "./sharedHoursTypes";

export interface TimetableTabProps {
  fiscalYears: string[];
  showToast: (msg: string, type: "success" | "error") => void;
}

const TimetableTab = forwardRef<
  { reload: () => void; setYear: (year: string) => void },
  TimetableTabProps
>(function TimetableTab({ fiscalYears, showToast }, ref) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { timetableData: snap, timetableYear: year, timetableLoading } = state;
  const loadTimetable = useCallback(
    async (fy: string) => {
      dispatch({ type: "SET_TIMETABLE_LOADING", loading: true });
      try {
        const res = await hoursAPI.getTimetable(fy);
        dispatch({ type: "SET_TIMETABLE", data: res.data.data, year: fy });
      } catch (error: unknown) {
        showToast(
          (error as Error).message || "Failed to load timetable",
          "error",
        );
        dispatch({ type: "SET_TIMETABLE_LOADING", loading: false });
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (!snap && !timetableLoading) {
      loadTimetable(year);
    }
  }, [snap, timetableLoading, year, loadTimetable]);

  useImperativeHandle(ref, () => ({
    reload: () => loadTimetable(year),
    setYear: (fy: string) =>
      dispatch({ type: "SET_TIMETABLE", data: null, year: fy }),
  }));

  const handleExport = async (type: "hours" | "timetable") => {
    try {
      const res =
        type === "hours"
          ? await hoursAPI.exportTracking(year)
          : await hoursAPI.exportTimetable(year);
      downloadBlob(res.data as Blob, `${type}-${year}.xlsx`);
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

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

  if (timetableLoading || !snap) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg
          className="animate-spin w-10 h-10 text-blue-500"
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <CustomSelect
            value={year}
            options={
              fyOptions.length > 0 ? fyOptions : [{ value: year, label: year }]
            }
            onChange={(v) =>
              dispatch({ type: "SET_TIMETABLE", data: null, year: v })
            }
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => handleExport("hours")}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
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
          Hours Tracking
        </button>
        <button
          onClick={() => handleExport("timetable")}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
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

      {!snap ? (
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            لا توجد بيانات للجدول الزمني للسنة {year}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            أضف جلسات تدريبية لإنشاء الجدول
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                إجمالي أيام التدريب
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {snap.totalDays}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {snap.sessionCount} جلسة
              </p>
            </div>
            {snap.quarterly.map((q) => (
              <div
                key={q.quarter}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {q.quarter === "Q1"
                    ? "الربع الأول"
                    : q.quarter === "Q2"
                      ? "الربع الثاني"
                      : q.quarter === "Q3"
                        ? "الربع الثالث"
                        : "الربع الرابع"}
                </p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {q.totalDays}
                </p>
                <p
                  className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate"
                  title={q.months.join(" • ")}
                >
                  {q.months.join(" • ")}
                </p>
              </div>
            ))}

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 h-full min-h-[100px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...snap.quarterly].reverse()}>
                  <XAxis
                    dataKey="quarter"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: "bold" }}
                    tickFormatter={(val) =>
                      val === "Q1"
                        ? "1st"
                        : val === "Q2"
                          ? "2nd"
                          : val === "Q3"
                            ? "3rd"
                            : "4th"
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(value: unknown) => [
                      `${(value as number) || 0} يوم`,
                      "الإجمالي",
                    ]}
                    labelFormatter={(
                      label: unknown,
                      payload: readonly unknown[],
                    ) => {
                      if (payload && payload.length > 0) {
                        const payloadArray = payload as Array<{
                          payload: { quarter: string };
                        }>;
                        const q = payloadArray[0].payload.quarter;
                        return q === "Q1"
                          ? "الربع الأول"
                          : q === "Q2"
                            ? "الربع الثاني"
                            : q === "Q3"
                              ? "الربع الثالث"
                              : "الربع الرابع";
                      }
                      return label as React.ReactNode;
                    }}
                  />
                  <Bar dataKey="totalDays" fill="#0d9488" radius={[4, 4, 0, 0]}>
                    {[...snap.quarterly]
                      .reverse()
                      .map(
                        (
                          entry: { quarter: string; totalDays: number },
                          index: number,
                        ) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index % 2 === 0 ? "#0d9488" : "#14b8a6"}
                          />
                        ),
                      )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                جدول التوقيت — {snap.fiscalYear}
              </h3>
              <p className="text-xs text-gray-400">
                <span className="inline-block w-3 h-3 rounded bg-amber-200 dark:bg-amber-800/50 ml-1" />
                نصف يوم &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-teal-200 dark:bg-teal-800/50 ml-1" />
                يوم كامل
              </p>
            </div>
            <div className="custom-scrollbar w-full overflow-auto h-[89vh]">
              <table
                className="w-full min-w-max text-[10px] sm:text-xs lg:text-sm border-collapse"
                style={{ minWidth: "1100px" }}
                dir="rtl"
              >
                <thead className="sticky top-0 z-20 bg-slate-900 shadow-sm">
                  <tr className="bg-gray-50 dark:bg-slate-900 shadow-sm h-10">
                    <th className="z-35 bg-gray-50 dark:bg-slate-900 px-2 py-2 text-right font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-600 min-w-[160px] h-10">
                      البرنامج
                    </th>
                    {Array.from({ length: 31 }, (_, i) => (
                      <th
                        key={i}
                        className="bg-gray-50 dark:bg-slate-900 px-0 py-2 text-center font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 w-8 h-10"
                      >
                        {i + 1}
                      </th>
                    ))}
                    <th className=" bg-gray-50 dark:bg-slate-900 px-2 py-2 text-center font-bold text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 h-10">
                      استشارات
                    </th>
                    <th className="bg-gray-50 dark:bg-slate-900 px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 h-10">
                      المجموع
                    </th>
                  </tr>
                </thead>
                {snap.months.map((monthData: IMonthData) => (
                  <tbody
                    key={`${monthData.year}-${monthData.monthIndex}`}
                    className="relative"
                  >
                    <tr className="bg-blue-50 dark:bg-blue-950">
                      <td
                        colSpan={34}
                        className="bg-blue-50 dark:bg-blue-950 px-3 py-1.5 font-bold text-blue-800 dark:text-blue-300 text-xs border-t-2 border-blue-200 dark:border-blue-800"
                      >
                        {monthData.monthName} {monthData.year}
                      </td>
                    </tr>
                    {/* Weekday names row */}
                    <tr className="sticky right-0 top-10 z-20 bg-gray-100 dark:bg-slate-900 text-[9px] font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <td className=" bg-gray-100 dark:bg-slate-900 px-2 py-1 text-right border-l border-gray-200 dark:border-gray-700 font-semibold">
                        يوم الأسبوع
                      </td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        const isInvalid = day > monthData.daysInMonth;
                        if (isInvalid) {
                          return (
                            <td
                              key={day}
                              className="bg-gray-50 dark:bg-slate-900 text-center border-r border-gray-100 dark:border-gray-700/30"
                            >
                              &nbsp;
                            </td>
                          );
                        }
                        const d = new Date(
                          monthData.year,
                          monthData.monthIndex,
                          day,
                        );
                        const weekdays = [
                          "أحد",
                          "إثنين",
                          "ثلاثاء",
                          "أربعاء",
                          "خميس",
                          "جمعة",
                          "سبت",
                        ];
                        const label = weekdays[d.getDay()];
                        const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                        return (
                          <td
                            key={day}
                            className={` z-30 text-center border-r border-gray-100 dark:border-gray-700/30 w-8 py-1 ${
                              isWeekend
                                ? "bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold"
                                : "bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {label}
                          </td>
                        );
                      })}
                      <td className=" z-30 bg-gray-100 dark:bg-slate-900 border-r border-gray-100 dark:border-gray-700/30">
                        &nbsp;
                      </td>
                      <td className=" z-35 bg-gray-100 dark:bg-slate-900 border-r border-gray-100 dark:border-gray-700/30">
                        &nbsp;
                      </td>
                    </tr>
                    {TIMETABLE_PROGRAMS.map((prog) => {
                      const progData = monthData.programs[prog] as
                        | (Record<number, number> & {
                            monthTotal: number;
                            consultationTotal?: number;
                          })
                        | undefined;
                      const color = TIMETABLE_PROGRAM_COLORS[prog];
                      const consVal = progData?.consultationTotal ?? 0;
                      const consDays = monthData.consultations?.[prog] ?? [];
                      const tooltip =
                        consDays.length > 0
                          ? `تواريخ الاستشارات: ${consDays.join(", ")}`
                          : undefined;

                      return (
                        <tr
                          key={prog}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                        >
                          <td
                            className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700 text-[10px] leading-tight"
                            style={{ borderRight: `3px solid ${color}` }}
                          >
                            {prog}
                          </td>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            const val = progData ? (progData[day] ?? 0) : 0;
                            const isInvalid = day > monthData.daysInMonth;
                            const d = new Date(
                              monthData.year,
                              monthData.monthIndex,
                              day,
                            );
                            const isWeekend =
                              !isInvalid &&
                              (d.getDay() === 5 || d.getDay() === 6);

                            let cellClass = "";
                            if (isInvalid) {
                              cellClass = "bg-gray-50 dark:bg-gray-800/50";
                            } else if (val > 0) {
                              if (val === 0.5) {
                                cellClass =
                                  "bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 font-bold";
                              } else {
                                cellClass =
                                  "bg-teal-100 dark:bg-teal-800/30 text-teal-800 dark:text-teal-300 font-bold";
                              }
                            } else if (isWeekend) {
                              cellClass =
                                "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400";
                            }

                            return (
                              <td
                                key={day}
                                className={`text-center border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 ${cellClass} relative`}
                                title={val > 0 ? `${val} يوم` : undefined}
                              >
                                {!isInvalid && val > 0
                                  ? val === 0.5
                                    ? "½"
                                    : val
                                  : ""}
                              </td>
                            );
                          })}
                          <td
                            className={`text-center border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 relative ${
                              consVal > 0
                                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-bold"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700/30 text-gray-300 dark:text-gray-600"
                            }`}
                            title={tooltip}
                          >
                            {consVal > 0
                              ? consVal === 0.5
                                ? "½"
                                : consVal
                              : ""}
                          </td>
                          <td className="px-2 py-1 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40">
                            {progData?.monthTotal ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <td className="sticky right-0 z-10 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 text-[10px]">
                        إجمالي الشهر
                      </td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        const isInvalid = day > monthData.daysInMonth;
                        const colTotal = isInvalid
                          ? 0
                          : TIMETABLE_PROGRAMS.reduce((sum, prog) => {
                              const pd = monthData.programs[prog] as
                                | Record<number, number>
                                | undefined;
                              return sum + (pd ? (pd[day] ?? 0) : 0);
                            }, 0);
                        return (
                          <td
                            key={day}
                            className={`text-center h-6 text-[10px] ${isInvalid ? "bg-gray-200 dark:bg-gray-900" : colTotal > 0 ? "text-gray-800 dark:text-gray-200" : ""}`}
                          >
                            {!isInvalid && colTotal > 0 ? colTotal : ""}
                          </td>
                        );
                      })}
                      {(() => {
                        const consTotal = TIMETABLE_PROGRAMS.reduce(
                          (sum, prog) => {
                            const pd = monthData.programs[prog] as
                              | { consultationTotal?: number }
                              | undefined;
                            return sum + (pd?.consultationTotal ?? 0);
                          },
                          0,
                        );
                        return (
                          <td className="text-center h-6 text-[10px] text-gray-800 dark:text-gray-200 font-bold">
                            {consTotal > 0 ? consTotal : ""}
                          </td>
                        );
                      })()}
                      <td className="px-2 text-center text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-900">
                        {monthData.monthlyDays}
                      </td>
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                ملخص البرامج السنوي
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <th className="px-4 py-3 text-right">البرنامج</th>
                    <th className="px-3 py-3 text-center">إجمالي الأيام</th>
                    <th className="px-3 py-3 text-center">الهدف</th>
                    <th className="px-3 py-3 text-center">نسبة الإنجاز</th>
                    <th className="px-3 py-3 text-center">Q1</th>
                    <th className="px-3 py-3 text-center">Q2</th>
                    <th className="px-3 py-3 text-center">Q3</th>
                    <th className="px-3 py-3 text-center">Q4</th>
                    <th className="px-3 py-3 text-center">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {snap.annualTotals.map((at: IAnnualTotal) => {
                    const remaining = Math.max(0, at.targetDays - at.totalDays);
                    const pct =
                      at.targetDays > 0
                        ? Math.min(100, (at.totalDays / at.targetDays) * 100)
                        : 0;
                    const color = TIMETABLE_PROGRAM_COLORS[at.program];
                    return (
                      <tr
                        key={at.program}
                        className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td
                          className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 group-last:rounded-br-2xl"
                          style={{ borderRight: `3px solid ${color}` }}
                        >
                          {at.program}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-gray-200">
                          {at.totalDays}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400">
                          {at.targetDays || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">
                          {at.q1}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">
                          {at.q2}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">
                          {at.q3}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">
                          {at.q4}
                        </td>
                        <td className="px-3 py-2.5 text-center group-last:rounded-bl-2xl">
                          <span
                            className={`text-xs font-bold ${remaining > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                          >
                            {remaining > 0 ? remaining : "✓"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// ─── Archive Tab ──────────────────────────────────────────────────────────────

export default TimetableTab;
