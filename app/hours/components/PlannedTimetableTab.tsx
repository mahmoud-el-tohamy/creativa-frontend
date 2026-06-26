"use client";
import { plannedAPI } from "@/lib/api";

import React, { useReducer, useEffect, useCallback, useMemo, useRef, useState } from "react";
import CustomSelect from "@/components/ui/CustomSelect";

import { getCurrentFiscalYear, ALL_PLANNED_PROGRAMS, FY_CALENDAR_MONTHS, ARABIC_MONTH_NAMES, TIMETABLE_PROGRAM_COLORS, getDaysInMonth, getCalendarYearForFYMonth, parseFiscalYear, computeMonthlyTotal, INITIAL_STATE, reducer } from "./sharedHoursTypes";

// ─── Memoized cell for performance ───────────────────────────────────────────
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

// ─── Generic Confirm Modal ────────────────────────────────────────────────────
function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  loading,
  title,
  message,
  confirmLabel = "تأكيد",
  confirmClass = "bg-red-600 hover:bg-red-700 text-white",
  children,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmClass?: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        {message && <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>}
        {children}
        <div className="flex gap-3 mt-4">
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 rounded-xl font-bold disabled:opacity-50 ${confirmClass}`}>
            {loading ? "..." : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: generate available fiscal years (existing + ±1 future) ───────────
function generateFYOptions(existingYears: string[]): string[] {
  const allYears = new Set(existingYears);
  if (allYears.size === 0) {
    allYears.add(getCurrentFiscalYear());
  }
  return Array.from(allYears).sort().reverse();
}

// ─── Copy Plan Modal ──────────────────────────────────────────────────────────
function CopyPlanModal({
  open,
  onCancel,
  sourceFY,
  existingYears,
  onSuccess,
  showToast,
}: {
  open: boolean;
  onCancel: () => void;
  sourceFY: string;
  existingYears: string[];
  onSuccess: (newFY: string) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const targetOptions = useMemo(
    () => generateFYOptions(existingYears).filter((fy) => fy !== sourceFY),
    [existingYears, sourceFY]
  );

  const [targetFY, setTargetFY] = useState(targetOptions[0] ?? "");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"pick" | "warn" | "password">("pick");
  const [loading, setLoading] = useState(false);
  const [targetHasPlan, setTargetHasPlan] = useState(false);
  const [checking, setChecking] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setStep("pick");
      setPassword("");
      setTargetFY(targetOptions[0] ?? "");
    }, 0);
    return () => clearTimeout(t);
  }, [open, targetOptions]);

  // Check if target has existing plan when selection changes
  useEffect(() => {
    if (!targetFY || !open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setChecking(true);
      plannedAPI.get(targetFY).then((res) => {
        if (!cancelled) setTargetHasPlan(res.data.exists ?? false);
      }).catch(() => {
        if (!cancelled) setTargetHasPlan(false);
      }).finally(() => {
        if (!cancelled) setChecking(false);
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [targetFY, open]);

  const handleNext = () => {
    if (targetHasPlan) {
      setStep("warn");
    } else {
      void handleCopy();
    }
  };

  const handleWarnConfirm = () => {
    setStep("password");
  };

  const handleCopy = async (pwd?: string) => {
    setLoading(true);
    try {
      await plannedAPI.copy(targetFY, sourceFY, pwd);
      showToast(`تم نسخ الخطة إلى ${targetFY} بنجاح`, "success");
      onSuccess(targetFY);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "فشل نسخ الخطة", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {step === "pick" && (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">نسخ الخطة</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              نسخ خطة <span className="font-bold text-teal-600">{sourceFY}</span> إلى سنة مالية أخرى
            </p>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              اختر السنة المالية الهدف
            </label>
            <div className="mb-4">
              <CustomSelect
                value={targetFY}
                options={targetOptions.map((fy) => ({ value: fy, label: fy }))}
                onChange={setTargetFY}
              />
            </div>
            {targetHasPlan && !checking && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300">هذه السنة تحتوي على خطة موجودة — ستُحذف وتُستبدل بالخطة المنسوخة.</p>
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleNext}
                disabled={!targetFY || checking || loading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                {checking ? "جارٍ الفحص..." : "متابعة"}
              </button>
              <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-bold">
                إلغاء
              </button>
            </div>
          </>
        )}

        {step === "warn" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">تأكيد الاستبدال</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              السنة المالية <span className="font-bold text-gray-900 dark:text-white">{targetFY}</span> تحتوي بالفعل على خطة مخططة.
              الاستمرار سيحذف الخطة القديمة نهائياً ويضع مكانها الخطة المنسوخة من <span className="font-bold text-teal-600">{sourceFY}</span>.
              <br /><br />
              هذا الإجراء <strong>لا يمكن التراجع عنه</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={handleWarnConfirm} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold">
                متابعة وإدخال كلمة المرور
              </button>
              <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-bold">
                إلغاء
              </button>
            </div>
          </>
        )}

        {step === "password" && (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">أدخل كلمة المرور</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              أدخل كلمة مرورك للتأكيد على استبدال الخطة الموجودة في <span className="font-bold">{targetFY}</span>
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && password) void handleCopy(password); }}
              placeholder="كلمة المرور"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 mb-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => void handleCopy(password)}
                disabled={!password || loading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? "جارٍ النسخ..." : "تأكيد النسخ"}
              </button>
              <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-bold">
                إلغاء
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Month Reset Modal ────────────────────────────────────────────────────────
function MonthResetModal({
  open,
  monthName,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  monthName: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
  loading: boolean;
}) {
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setPassword(""), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  return (
    <ConfirmModal
      open={open}
      onConfirm={() => onConfirm(password)}
      onCancel={onCancel}
      loading={loading}
      title={`تصفير شهر ${monthName}`}
      message="سيتم حذف جميع القيم المدخلة لهذا الشهر عبر جميع البرامج. هذا الإجراء لا يمكن التراجع عنه."
      confirmLabel="تأكيد التصفير"
    >
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && password && !loading) onConfirm(password); }}
        placeholder="أدخل كلمة المرور للتأكيد"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
        autoFocus
      />
    </ConfirmModal>
  );
}

// ─── Add Year Modal ──────────────────────────────────────────────────────────
interface AddYearModalProps {
  open: boolean;
  onCancel: () => void;
  existingYears: string[];
  onConfirm: (fy: string) => Promise<void>;
  loading: boolean;
}

function AddYearModal({ open, onCancel, existingYears, onConfirm, loading }: AddYearModalProps) {
  const currentStartYear = new Date().getFullYear();
  const options = useMemo(() => {
    const list = Array.from({ length: 16 }, (_, i) => {
      const start = currentStartYear - 5 + i;
      return `FY${start}-${start + 1}`;
    });
    return list.filter((fy) => !existingYears.includes(fy));
  }, [existingYears, currentStartYear]);

  const [selectedFY, setSelectedFY] = useState(() => options[0] ?? "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          فتح خطة سنة مالية جديدة
        </h3>
        
        {options.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            جميع السنوات المالية المتاحة مضافة بالفعل.
          </p>
        ) : (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                اختر السنة المالية *
              </label>
              <CustomSelect
                value={selectedFY}
                options={options.map((fy) => ({ value: fy, label: fy }))}
                onChange={setSelectedFY}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            إلغاء
          </button>
          {options.length > 0 && (
            <button
              onClick={() => void onConfirm(selectedFY)}
              disabled={loading || !selectedFY}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري الإنشاء...
                </>
              ) : (
                "تأكيد"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function PlannedTab({
  fiscalYears,
  showToast,
  onDirtyChange,
  onFiscalYearsChanged,
}: {
  fiscalYears: string[];
  showToast: (msg: string, type: "success" | "error") => void;
  onDirtyChange: (dirty: boolean) => void;
  onFiscalYearsChanged: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
    localPlan,
    isDirty,
    plannedLoading,
    plannedSaving,
    selectedPlannedFY,
  } = state;

  // All available fiscal years (existing + future options)
  const allFYOptions = useMemo(
    () => generateFYOptions(fiscalYears),
    [fiscalYears]
  );

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

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Add new fiscal year state
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [addYearLoading, setAddYearLoading] = useState(false);

  // Per-month reset state
  const [resetMonthIndex, setResetMonthIndex] = useState<number | null>(null);
  const [resetMonthLoading, setResetMonthLoading] = useState(false);
  const isResettingMonth = useRef(false); // flag to suppress auto-save during reset

  const handleAddYearConfirm = async (fy: string) => {
    setAddYearLoading(true);
    try {
      await plannedAPI.create(fy);
      showToast("تم إنشاء خطة السنة المالية الجديدة بنجاح", "success");
      onFiscalYearsChanged();
      dispatch({ type: "SET_PLANNED_FY", fy });
      setShowAddYearModal(false);
    } catch (error: unknown) {
      showToast((error as Error).message || "فشل إنشاء السنة المالية", "error");
    } finally {
      setAddYearLoading(false);
    }
  };

  const fyOptions = useMemo(
    () =>
      allFYOptions.map((fy) => ({
        value: fy,
        label: fy === getCurrentFiscalYear() ? fy + " (الحالية)" : fy,
      })),
    [allFYOptions],
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
      if (isResettingMonth.current) return; // suppress during month reset
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

  // Auto-save debounce: after 3s of inactivity, skip if resetting a month
  useEffect(() => {
    if (!isDirty) return;
    if (isResettingMonth.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (!isResettingMonth.current) doSave(true);
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
      e.preventDefault();
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

  const handleFYChange = (newFY: string) => {
    dispatch({ type: "SET_PLANNED_FY", fy: newFY });
  };

  // ─── Month reset handler ───────────────────────────────────────────────────
  const handleMonthReset = useCallback(async (password: string) => {
    if (resetMonthIndex === null) return;
    setResetMonthLoading(true);
    isResettingMonth.current = true; // suppress auto-save

    // Cancel any pending auto-save timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    try {
      const res = await plannedAPI.resetMonth(selectedPlannedFY, resetMonthIndex, password);
      // Update local state from the server response, preventing a dirty auto-save
      dispatch({
        type: "SET_PLANNED_DATA",
        data: res.data.data,
        fy: selectedPlannedFY,
      });
      showToast(`تم تصفير شهر ${ARABIC_MONTH_NAMES[resetMonthIndex]} بنجاح`, "success");
      setResetMonthIndex(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "فشل تصفير الشهر", "error");
    } finally {
      setResetMonthLoading(false);
      // Delay clearing flag so the auto-save useEffect doesn't fire immediately
      setTimeout(() => { isResettingMonth.current = false; }, 500);
    }
  }, [resetMonthIndex, selectedPlannedFY, dispatch, showToast]);

  if (plannedLoading || !state.plannedData) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin w-10 h-10 text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
            options={fyOptions.length > 0 ? fyOptions : [{ value: selectedPlannedFY, label: selectedPlannedFY }]}
            onChange={handleFYChange}
          />
        </div>

        <button
          onClick={() => setShowAddYearModal(true)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          فتح سنة جديدة
        </button>

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

        {/* Copy Plan */}
        <button
          onClick={() => setShowCopyModal(true)}
          className="flex items-center gap-2 px-3 py-2 border border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 text-sm font-bold rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          نسخ الخطة
        </button>

        {/* Save */}
        <button
          onClick={() => doSave(false)}
          disabled={!isDirty || plannedSaving}
          className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
        >
          {plannedSaving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جاري الحفظ...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
        <div className="custom-scrollbar w-full overflow-auto">
          <table
            className="w-full min-w-max text-[10px] sm:text-xs border-collapse"
            style={{ minWidth: "1100px" }}
            dir="rtl"
          >
            <thead className="z-20 bg-slate-900 shadow-sm">
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
                      <span className="flex items-center gap-2">
                        {ARABIC_MONTH_NAMES[calMonth]} {calYear}
                        <button
                          onClick={() => setResetMonthIndex(calMonth)}
                          className="mr-auto opacity-40 hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 dark:text-red-400"
                          title={`تصفير شهر ${ARABIC_MONTH_NAMES[calMonth]}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </span>
                    </td>
                  </tr>
                  {/* Day numbers row */}
                  <tr className="sticky right-0 top-10 z-20 bg-indigo-50 dark:bg-indigo-950/60 text-[9px] font-bold text-gray-500 border-b border-indigo-200 dark:border-indigo-800">
                    <td className="bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 text-right border-l border-gray-200 dark:border-gray-700 font-semibold text-indigo-700 dark:text-indigo-300 text-[9px]">
                      ايام الشهر
                    </td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const isInvalid = day > daysInMonth;
                      return (
                        <td
                          key={day}
                          className={`text-center border-r border-indigo-100 dark:border-indigo-800/30 w-8 py-1 font-bold ${
                            isInvalid
                              ? "bg-gray-50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-700"
                              : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {isInvalid ? "" : day}
                        </td>
                      );
                    })}
                    <td className="bg-indigo-50 dark:bg-indigo-950/60 border-r border-indigo-100 dark:border-indigo-800/30">&nbsp;</td>
                    <td className="bg-indigo-50 dark:bg-indigo-950/60 border-r border-indigo-100 dark:border-indigo-800/30">&nbsp;</td>
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

      {/* Copy Plan Modal */}
      <CopyPlanModal
        open={showCopyModal}
        onCancel={() => setShowCopyModal(false)}
        sourceFY={selectedPlannedFY}
        existingYears={fiscalYears}
        showToast={showToast}
        onSuccess={(newFY) => {
          setShowCopyModal(false);
          dispatch({ type: "SET_PLANNED_FY", fy: newFY });
        }}
      />

      {/* Month Reset Modal */}
      <MonthResetModal
        open={resetMonthIndex !== null}
        monthName={resetMonthIndex !== null ? ARABIC_MONTH_NAMES[resetMonthIndex] : ""}
        onCancel={() => setResetMonthIndex(null)}
        onConfirm={handleMonthReset}
        loading={resetMonthLoading}
      />

      {/* Add New Year Plan Modal */}
      {showAddYearModal && (
        <AddYearModal
          open={showAddYearModal}
          onCancel={() => setShowAddYearModal(false)}
          existingYears={fiscalYears}
          onConfirm={handleAddYearConfirm}
          loading={addYearLoading}
        />
      )}
    </div>
  );
}




export default PlannedTab;
