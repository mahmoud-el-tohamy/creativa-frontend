"use client";
import { plannedAPI } from "@/lib/api";


import React, { useReducer, useEffect, useCallback, useMemo, useRef, useState } from "react";
import CustomSelect from "@/components/ui/CustomSelect";

import { getCurrentFiscalYear, ALL_PLANNED_PROGRAMS, FY_CALENDAR_MONTHS, ARABIC_MONTH_NAMES, TIMETABLE_PROGRAM_COLORS, getDaysInMonth, getCalendarYearForFYMonth, parseFiscalYear, buildEmptyPlannedData, computeMonthlyTotal, INITIAL_STATE, reducer } from "./sharedHoursTypes";

// Memoized cell for performance
const PlanCell = React.memo(
  ({
    value,
    isInvalid,
    isWeekend,
    isDirty,
    onClick,
    onContextMenu,
  }: {
    value: string | number;
    isInvalid: boolean;
    isWeekend?: boolean;
    isDirty?: boolean;
    onClick: (e: React.MouseEvent<HTMLTableCellElement>) => void;
    onContextMenu?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  }) => {
    let bgClass = "bg-white dark:bg-gray-800";
    if (isInvalid) {
      bgClass = "bg-gray-100 dark:bg-gray-900";
    } else if (isWeekend) {
      bgClass = "bg-red-50 dark:bg-red-900/10";
    }

    return (
      <td
        onClick={isInvalid ? undefined : onClick}
        onContextMenu={isInvalid ? undefined : onContextMenu}
        className={`relative min-w-[36px] h-[36px] p-0 border border-gray-200 dark:border-gray-700 text-center transition-colors ${bgClass} ${!isInvalid ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20" : ""}`}
      >
        <div className="w-full h-full flex items-center justify-center font-bold text-gray-700 dark:text-gray-300">
          {value || ""}
        </div>
        {isDirty && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full shadow-sm" />
        )}
      </td>
    );
  },
);
PlanCell.displayName = "PlanCell";


function DeleteConfirm({
  open,
  onConfirm,
  onCancel,
  loading,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.",
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  title?: string;
  message?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
            {loading ? "..." : "تأكيد"}
          </button>
          <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function PlannedTab({
  fiscalYears,
  showToast,
  }: {
  fiscalYears: string[];
  showToast: (msg: string, type: "success" | "error") => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
    localPlan,
    isDirty,
    plannedLoading,
    plannedSaving,
    selectedPlannedFY,
  } = state;

  const loadPlannedTimetable = useCallback(async (fy: string) => {
    dispatch({ type: "SET_PLANNED_LOADING", loading: true });
    try {
      const res = await plannedAPI.get(fy);
      dispatch({ type: "SET_PLANNED_DATA", data: res.data.data, fy });
    } catch (error: unknown) {
      showToast((error as Error).message || "Failed to load planned timetable", "error");
      dispatch({ type: "SET_PLANNED_LOADING", loading: false });
    }
  }, [showToast]);

  useEffect(() => {
    if (!state.plannedData && !plannedLoading) {
      loadPlannedTimetable(selectedPlannedFY);
    }
  }, [state.plannedData, plannedLoading, selectedPlannedFY, loadPlannedTimetable]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [navGuardOpen, setNavGuardOpen] = useState(false);

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

  const { startYear } = useMemo(
    () => parseFiscalYear(selectedPlannedFY),
    [selectedPlannedFY],
  );

  // Compute month totals from localPlan for fast UI feedback
  const monthTotals = useMemo(() => {
    if (!localPlan) return {};
    const totals: Record<string, Record<number, number>> = {};
    for (const prog of ALL_PLANNED_PROGRAMS) {
      totals[prog] = {};
      for (const calMonth of FY_CALENDAR_MONTHS) {
        totals[prog][calMonth] = computeMonthlyTotal(localPlan, prog, calMonth);
      }
    }
    return totals;
  }, [localPlan]);

  // Compute column totals (per day across all programs) per month
  const colTotals = useMemo(() => {
    if (!localPlan) return {};
    const result: Record<number, Record<number, number>> = {};
    for (const calMonth of FY_CALENDAR_MONTHS) {
      result[calMonth] = {};
      const calYear = getCalendarYearForFYMonth(calMonth, startYear);
      const daysInMonth = getDaysInMonth(calYear, calMonth);
      for (let d = 1; d <= daysInMonth; d++) {
        result[calMonth][d] = ALL_PLANNED_PROGRAMS.reduce((sum, prog) => {
          return sum + (localPlan[prog]?.[String(calMonth)]?.[String(d)] ?? 0);
        }, 0);
      }
    }
    return result;
  }, [localPlan, startYear]);

  const doSave = useCallback(
    async (silent = false) => {
      if (!localPlan) return;
      if (!silent) dispatch({ type: "SET_PLANNED_SAVING", saving: true });
      else setAutoSaving(true);
      try {
        await plannedAPI.upsert(selectedPlannedFY, localPlan);
        dispatch({ type: "MARK_SAVED" });
        if (!silent) showToast("تم حفظ الخطة بنجاح", "success");
      } catch {
        if (!silent) showToast("فشل حفظ الخطة", "error");
      } finally {
        if (!silent) dispatch({ type: "SET_PLANNED_SAVING", saving: false });
        else setAutoSaving(false);
      }
    },
    [localPlan, selectedPlannedFY, dispatch, showToast],
  );

  // Auto-save debounce: after 3s of inactivity
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doSave(true);
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, localPlan, doSave]);

  const handleCellClick = useCallback(
    (
      e: React.MouseEvent,
      program: string,
      monthIndex: number,
      day: number | string,
      currentVal: number,
      isRightClick: boolean,
    ) => {
      e.preventDefault(); // Prevent context menu on right click
      let next = currentVal;
      const maxVal = day === "consultations" ? 20 : 5;
      if (isRightClick) {
        next = Math.max(0, currentVal - 0.5);
      } else {
        next = Math.min(maxVal, currentVal + 0.5);
      }

      if (next !== currentVal) {
        dispatch({
          type: "UPDATE_LOCAL_CELL",
          program,
          monthIndex,
          day,
          value: next,
        });
      }
    },
    [dispatch],
  );

  const handleReset = () => {
    const empty = buildEmptyPlannedData();
    dispatch({
      type: "UPDATE_LOCAL_CELL",
      program: "",
      monthIndex: -1,
      day: -1,
      value: 0,
    });
    // Reset entire local plan by dispatching SET_PLANNED_DATA with empty
    dispatch({
      type: "SET_PLANNED_DATA",
      data: { ...state.plannedData!, data: empty },
      fy: selectedPlannedFY,
    });
    setShowResetConfirm(false);
  };

  const handleFYChange = (newFY: string) => {
    if (isDirty) {
      setNavGuardOpen(true);
      return;
    }
    dispatch({ type: "SET_PLANNED_FY", fy: newFY });
  };

  if (plannedLoading || !state.plannedData) {
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
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <CustomSelect
            value={selectedPlannedFY}
            options={
              fyOptions.length > 0
                ? fyOptions
                : [{ value: selectedPlannedFY, label: selectedPlannedFY }]
            }
            onChange={handleFYChange}
          />
        </div>

        <div className="flex-1" />

        {/* Auto-save indicator */}
        {autoSaving && (
          <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">
            جاري الحفظ التلقائي...
          </span>
        )}

        {isDirty && !autoSaving && (
          <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
            تغييرات غير محفوظة
          </span>
        )}

        {/* Reset */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          تصفير الخطة
        </button>

        {/* Save */}
        <button
          onClick={() => doSave(false)}
          disabled={!isDirty || plannedSaving}
          className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
        >
          {plannedSaving ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
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
              جاري الحفظ...
            </>
          ) : (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              حفظ الخطة
            </>
          )}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-visible">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            الخطة السنوية — {selectedPlannedFY}
          </h3>
          <p className="text-xs text-gray-400">
            انقر على الخلايا لتبديل الحالة: كليك يمين للتقليل،كليك شمال للزيادة،
          </p>
        </div>
        <div className="custom-scrollbar w-full overflow-auto h-[89vh]">
          <table
            className="w-full min-w-max text-[10px] sm:text-xs border-collapse"
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
                <th className="bg-gray-50 dark:bg-slate-900 px-2 py-2 text-center font-bold text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 h-10">
                  استشارات
                </th>
                <th className="bg-gray-50 dark:bg-slate-900 px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 h-10">
                  المجموع
                </th>
              </tr>
            </thead>
            {FY_CALENDAR_MONTHS.map((calMonth) => {
              const calYear = getCalendarYearForFYMonth(calMonth, startYear);
              const daysInMonth = getDaysInMonth(calYear, calMonth);
              return (
                <tbody key={calMonth} className="relative">
                  {/* Month header */}
                  <tr className="bg-blue-50 dark:bg-blue-950">
                    <td
                      colSpan={34}
                      className="bg-blue-50 dark:bg-blue-950 px-3 py-1.5 font-bold text-blue-800 dark:text-blue-300 text-xs border-t-2 border-blue-200 dark:border-blue-800"
                    >
                      {ARABIC_MONTH_NAMES[calMonth]} {calYear}
                    </td>
                  </tr>
                  {/* Weekday names row */}
                  <tr className="sticky right-0 top-10 z-20 bg-gray-100 dark:bg-slate-900 text-[9px] font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <td className="bg-gray-100 dark:bg-slate-900 px-2 py-1 text-right border-l border-gray-200 dark:border-gray-700 font-semibold">
                      يوم الأسبوع
                    </td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const isInvalid = day > daysInMonth;
                      if (isInvalid) {
                        return (
                          <td
                            key={day}
                            className="bg-gray-50 dark:bg-slate-900 text-center border-r border-gray-100 dark:border-gray-700/30"
                          >&nbsp;</td>
                        );
                      }
                      const d = new Date(calYear, calMonth, day);
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
                          className={`z-30 text-center border-r border-gray-100 dark:border-gray-700/30 w-8 py-1 ${
                            isWeekend
                              ? "bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold"
                              : "bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {label}
                        </td>
                      );
                    })}
                    <td className="z-30 bg-gray-100 dark:bg-slate-900 border-r border-gray-100 dark:border-gray-700/30">&nbsp;</td>
                    <td className="z-35 bg-gray-100 dark:bg-slate-900 border-r border-gray-100 dark:border-gray-700/30">&nbsp;</td>
                  </tr>
                  {/* Program rows */}
                  {ALL_PLANNED_PROGRAMS.map((prog) => {
                    const color = TIMETABLE_PROGRAM_COLORS[prog] ?? "#E5E7EB";
                    const consVal = localPlan?.[prog]?.[String(calMonth)]?.["consultations"] ?? 0;
                    return (
                      <tr
                        key={prog}
                        className="group border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                      >
                        <td
                          className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700 text-[10px] leading-tight"
                          style={{ borderRight: `3px solid ${color}` }}
                        >
                          {prog}
                        </td>
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const isInvalid = day > daysInMonth;
                          const val =
                            localPlan?.[prog]?.[String(calMonth)]?.[
                              String(day)
                            ] ?? 0;
                          const d = new Date(calYear, calMonth, day);
                          const isWeekend = !isInvalid && (d.getDay() === 5 || d.getDay() === 6);
                          return (
                            <PlanCell
                              key={day}
                              value={val}
                              isInvalid={isInvalid}
                              isWeekend={isWeekend}
                              onClick={(e) =>
                                !isInvalid &&
                                handleCellClick(
                                  e,
                                  prog,
                                  calMonth,
                                  day,
                                  val,
                                  false,
                                )
                              }
                              onContextMenu={(e) =>
                                !isInvalid &&
                                handleCellClick(
                                  e,
                                  prog,
                                  calMonth,
                                  day,
                                  val,
                                  true,
                                )
                              }
                            />
                          );
                        })}
                        <PlanCell
                          value={consVal}
                          isInvalid={false}
                          onClick={(e) =>
                            handleCellClick(
                              e,
                              prog,
                              calMonth,
                              "consultations",
                              consVal,
                              false,
                            )
                          }
                          onContextMenu={(e) =>
                            handleCellClick(
                              e,
                              prog,
                              calMonth,
                              "consultations",
                              consVal,
                              true,
                            )
                          }
                        />
                        <td className="px-2 py-1 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 text-[10px]">
                          {monthTotals[prog]?.[calMonth] ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Month totals row */}
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                    <td className="sticky right-0 z-10 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 text-[10px]">
                      إجمالي الشهر
                    </td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const isInvalid = day > daysInMonth;
                      const colTotal = isInvalid
                        ? 0
                        : (colTotals[calMonth]?.[day] ?? 0);
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
                      const consTotal = ALL_PLANNED_PROGRAMS.reduce((sum, prog) => {
                        return sum + (localPlan?.[prog]?.[String(calMonth)]?.["consultations"] ?? 0);
                      }, 0);
                      return (
                        <td className="text-center h-6 text-[10px] text-gray-800 dark:text-gray-200 font-bold">
                          {consTotal > 0 ? consTotal : ""}
                        </td>
                      );
                    })()}
                    <td className="px-2 text-center text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-900 text-[10px]">
                      {ALL_PLANNED_PROGRAMS.reduce(
                        (s, prog) => s + (monthTotals[prog]?.[calMonth] ?? 0),
                        0,
                      )}
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>
      </div>

      {/* Reset Confirm */}
      <DeleteConfirm
        open={showResetConfirm}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        loading={false}
        message="هل أنت متأكد من تصفير الخطة؟ ستُفقد جميع القيم المُدخلة."
      />

      {/* Nav Guard */}
      <DeleteConfirm
        open={navGuardOpen}
        onConfirm={() => {
          setNavGuardOpen(false);
          dispatch({ type: "SET_PLANNED_FY", fy: selectedPlannedFY });
        }}
        onCancel={() => setNavGuardOpen(false)}
        loading={false}
        message="لديك تغييرات غير محفوظة. هل تريد المغادرة؟"
      />
    </div>
  );
}




export default PlannedTab;
