"use client";

import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import RouteGuard from "@/components/RouteGuard";
import CustomSelect from "@/components/ui/CustomSelect";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import {
  hoursAPI,
  plannedAPI,
  TrainingSession,
  TrainingSessionPayload,
  Instructor,
  TimetableSnapshot,
  IMonthData,
  IAnnualTotal,
  Pagination,
  ProgramName,
  TimetableProgram,
} from "@/lib/api";
import type {
  PlannedTimetableResponse,
  PlannedData,
  TimetableComparison,
  ProgramComparison,
  MonthlyDiffEntry,
} from "@/lib/types/planned";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import axios from "axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 4) return `FY${year}-${year + 1}`;
  return `FY${year - 1}-${year}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_NAMES: ProgramName[] = [
  "Career Development",
  "Tech",
  "Freelancing",
  "Entrepreneurship",
  "Awareness event",
  "Hackathons / Competitions",
  "Acceleration program",
];

const TIMETABLE_PROGRAMS: TimetableProgram[] = [
  "Entrepreneurship / Technology transfer",
  "Awareness events",
  "Acceleration program",
  "Freelancing coaches",
  "Hackathons / Competitions",
  "Career development",
];

// All 8 programs including Incubation & Consultation (planned timetable supports all 8)
const ALL_PLANNED_PROGRAMS: string[] = [
  "Entrepreneurship / Technology transfer",
  "Awareness events",
  "Acceleration program",
  "Freelancing coaches",
  "Hackathons / Competitions",
  "Career development",
  "Incubation",
  "Consultation & Mentorship",
];

// FY calendar months in order: May(4)→Apr(3)
const FY_CALENDAR_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3];

const ARABIC_MONTH_NAMES: Record<number, string> = {
  0: "يناير", 1: "فبراير", 2: "مارس", 3: "أبريل",
  4: "مايو", 5: "يونيو", 6: "يوليو", 7: "أغسطس",
  8: "سبتمبر", 9: "أكتوبر", 10: "نوفمبر", 11: "ديسمبر",
};

const ARABIC_MONTH_SHORT: Record<number, string> = {
  0: "يناير", 1: "فبراير", 2: "مارس", 3: "أبريل",
  4: "مايو", 5: "يونيو", 6: "يوليو", 7: "أغسطس",
  8: "سبتمبر", 9: "أكتوبر", 10: "نوفمبر", 11: "ديسمبر",
};

const PROGRAM_COLORS: Record<string, string> = {
  "Career Development": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Tech": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Freelancing": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Entrepreneurship": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Awareness event": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Hackathons / Competitions": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Acceleration program": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const TIMETABLE_PROGRAM_COLORS: Record<string, string> = {
  "Entrepreneurship / Technology transfer": "#D9EAD3",
  "Awareness events": "#FCE5CD",
  "Acceleration program": "#CFE2F3",
  "Freelancing coaches": "#FFF2CC",
  "Hackathons / Competitions": "#EAD1DC",
  "Career development": "#D0E0E3",
  "Incubation": "#E8D5F5",
  "Consultation & Mentorship": "#D5E8F5",
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "Training": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "Awareness Event": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "Incubation": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "Consultation": return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "Training": return "تدريب";
    case "Awareness Event": return "توعوية";
    case "Incubation": return "احتضان";
    case "Consultation": return "استشارة";
    default: return type;
  }
};

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getCalendarYearForFYMonth(calMonth: number, startYear: number): number {
  return calMonth >= 4 ? startYear : startYear + 1;
}

function parseFiscalYear(fy: string): { startYear: number; endYear: number } {
  const [s, e] = fy.replace("FY", "").split("-");
  return { startYear: parseInt(s, 10), endYear: parseInt(e, 10) };
}

// Build an empty PlannedData structure for all 8 programs
function buildEmptyPlannedData(): PlannedData {
  const data: PlannedData = {};
  for (const prog of ALL_PLANNED_PROGRAMS) {
    data[prog] = {};
    for (const calMonth of FY_CALENDAR_MONTHS) {
      data[prog][String(calMonth)] = {};
    }
  }
  return data;
}

// Compute monthly total for a program from PlannedData
function computeMonthlyTotal(data: PlannedData, program: string, calMonth: number): number {
  const monthData = data[program]?.[String(calMonth)] ?? {};
  return Object.values(monthData).reduce((s, v) => s + (v as number), 0);
}

// ─── State Types ──────────────────────────────────────────────────────────────

interface SessionFilters {
  search: string;
  programName: string;
  dateFrom: string;
  dateTo: string;
  fiscalYear: string;
  sort: "newest" | "oldest" | "name";
}

interface State {
  activeTab: "tracking" | "timetable" | "archive" | "planned" | "comparison";
  sessions: TrainingSession[];
  sessionsPagination: Pagination;
  sessionsFilters: SessionFilters;
  sessionsLoading: boolean;
  modalOpen: boolean;
  editingSession: TrainingSession | null;
  instructors: Instructor[];
  timetableData: TimetableSnapshot | null;
  timetableYear: string;
  timetableLoading: boolean;
  fiscalYears: string[];
  error: string | null;
  // Tab 4 — Planned
  plannedData: PlannedTimetableResponse | null;
  localPlan: PlannedData | null;
  savedPlan: PlannedData | null;
  isDirty: boolean;
  plannedLoading: boolean;
  plannedSaving: boolean;
  selectedPlannedFY: string;
  // Tab 5 — Comparison
  comparisonData: TimetableComparison | null;
  comparisonLoading: boolean;
  selectedComparisonFY: string;
}

type Action =
  | { type: "SET_TAB"; tab: State["activeTab"] }
  | { type: "SET_SESSIONS"; sessions: TrainingSession[]; pagination: Pagination }
  | { type: "SET_SESSIONS_LOADING"; loading: boolean }
  | { type: "SET_FILTER"; key: keyof SessionFilters; value: string }
  | { type: "RESET_FILTERS" }
  | { type: "OPEN_MODAL"; session?: TrainingSession }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_INSTRUCTORS"; instructors: Instructor[] }
  | { type: "SET_TIMETABLE"; data: TimetableSnapshot | null; year: string }
  | { type: "SET_TIMETABLE_LOADING"; loading: boolean }
  | { type: "SET_FISCAL_YEARS"; years: string[] }
  | { type: "SET_ERROR"; error: string | null }
  // Planned actions
  | { type: "SET_PLANNED_DATA"; data: PlannedTimetableResponse | null; fy: string }
  | { type: "UPDATE_LOCAL_CELL"; program: string; monthIndex: number; day: number; value: number }
  | { type: "MARK_SAVED" }
  | { type: "SET_DIRTY"; dirty: boolean }
  | { type: "SET_PLANNED_SAVING"; saving: boolean }
  | { type: "SET_PLANNED_LOADING"; loading: boolean }
  | { type: "SET_PLANNED_FY"; fy: string }
  // Comparison actions
  | { type: "SET_COMPARISON_DATA"; data: TimetableComparison | null }
  | { type: "SET_COMPARISON_LOADING"; loading: boolean }
  | { type: "SET_COMPARISON_FY"; fy: string };

const INITIAL_FILTERS: SessionFilters = {
  search: "", programName: "", dateFrom: "", dateTo: "", fiscalYear: "", sort: "newest",
};

const INITIAL_STATE: State = {
  activeTab: "tracking",
  sessions: [],
  sessionsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  sessionsFilters: INITIAL_FILTERS,
  sessionsLoading: false,
  modalOpen: false,
  editingSession: null,
  instructors: [],
  timetableData: null,
  timetableYear: getCurrentFiscalYear(),
  timetableLoading: false,
  fiscalYears: [],
  error: null,
  plannedData: null,
  localPlan: null,
  savedPlan: null,
  isDirty: false,
  plannedLoading: false,
  plannedSaving: false,
  selectedPlannedFY: getCurrentFiscalYear(),
  comparisonData: null,
  comparisonLoading: false,
  selectedComparisonFY: getCurrentFiscalYear(),
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TAB": return { ...state, activeTab: action.tab };
    case "SET_SESSIONS": return { ...state, sessions: action.sessions, sessionsPagination: action.pagination, sessionsLoading: false };
    case "SET_SESSIONS_LOADING": return { ...state, sessionsLoading: action.loading };
    case "SET_FILTER":
      return { ...state, sessionsFilters: { ...state.sessionsFilters, [action.key]: action.value }, sessionsPagination: { ...state.sessionsPagination, page: 1 } };
    case "RESET_FILTERS": return { ...state, sessionsFilters: INITIAL_FILTERS, sessionsPagination: { ...state.sessionsPagination, page: 1 } };
    case "OPEN_MODAL": return { ...state, modalOpen: true, editingSession: action.session ?? null };
    case "CLOSE_MODAL": return { ...state, modalOpen: false, editingSession: null };
    case "SET_INSTRUCTORS": return { ...state, instructors: action.instructors };
    case "SET_TIMETABLE": return { ...state, timetableData: action.data, timetableYear: action.year, timetableLoading: false };
    case "SET_TIMETABLE_LOADING": return { ...state, timetableLoading: action.loading };
    case "SET_FISCAL_YEARS": return { ...state, fiscalYears: action.years };
    case "SET_ERROR": return { ...state, error: action.error };
    // Planned
    case "SET_PLANNED_DATA": {
      const plan = action.data?.data ?? buildEmptyPlannedData();
      return {
        ...state,
        plannedData: action.data,
        localPlan: plan,
        savedPlan: plan,
        isDirty: false,
        plannedLoading: false,
        selectedPlannedFY: action.fy,
      };
    }
    case "UPDATE_LOCAL_CELL": {
      if (!state.localPlan) return state;
      const newPlan: PlannedData = {
        ...state.localPlan,
        [action.program]: {
          ...(state.localPlan[action.program] ?? {}),
          [String(action.monthIndex)]: {
            ...(state.localPlan[action.program]?.[String(action.monthIndex)] ?? {}),
            [String(action.day)]: action.value,
          },
        },
      };
      return { ...state, localPlan: newPlan, isDirty: true };
    }
    case "MARK_SAVED":
      return { ...state, savedPlan: state.localPlan, isDirty: false, plannedSaving: false };
    case "SET_DIRTY": return { ...state, isDirty: action.dirty };
    case "SET_PLANNED_SAVING": return { ...state, plannedSaving: action.saving };
    case "SET_PLANNED_LOADING": return { ...state, plannedLoading: action.loading };
    case "SET_PLANNED_FY": return { ...state, selectedPlannedFY: action.fy, plannedData: null, localPlan: null, savedPlan: null, isDirty: false };
    // Comparison
    case "SET_COMPARISON_DATA": return { ...state, comparisonData: action.data, comparisonLoading: false };
    case "SET_COMPARISON_LOADING": return { ...state, comparisonLoading: action.loading };
    case "SET_COMPARISON_FY": return { ...state, selectedComparisonFY: action.fy, comparisonData: null };
    default: return state;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Session Modal ────────────────────────────────────────────────────────────

interface SessionModalProps {
  open: boolean;
  editing: TrainingSession | null;
  instructors: Instructor[];
  onClose: () => void;
  onSaved: () => void;
  onAddInstructor: (name: string) => Promise<Instructor>;
  showToast: (msg: string, type: "success" | "error") => void;
}

const EMPTY_FORM: TrainingSessionPayload = {
  programName: "Career Development",
  sessionName: "",
  date: "",
  hours: 1,
  mode: "online",
  instructorId: "",
  instructorName: "",
  attendeesCount: 0,
  type: "Training",
  evaluationReportUrl: "",
  trainingReportUrl: "",
};

function SessionModal({ open, editing, instructors, onClose, onSaved, onAddInstructor, showToast }: SessionModalProps) {
  const [form, setForm] = useState<TrainingSessionPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof TrainingSessionPayload, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addingInstructor, setAddingInstructor] = useState(false);
  const [newInstructorName, setNewInstructorName] = useState("");
  const [savingInstructor, setSavingInstructor] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          programName: editing.programName,
          sessionName: editing.sessionName,
          date: editing.date.split("T")[0],
          hours: editing.hours,
          mode: editing.mode,
          instructorId: editing.instructorId ?? "",
          instructorName: editing.instructorName,
          attendeesCount: editing.attendeesCount,
          type: editing.type,
          evaluationReportUrl: editing.evaluationReportUrl ?? "",
          trainingReportUrl: editing.trainingReportUrl ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setAddingInstructor(false);
      setNewInstructorName("");
    }
  }, [open, editing]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof TrainingSessionPayload, string>> = {};
    if (!form.programName) e.programName = "اختر البرنامج";
    if (!form.sessionName.trim()) e.sessionName = "اسم الجلسة مطلوب";
    if (!form.date) e.date = "التاريخ مطلوب";
    if (!form.hours || form.hours < 0.5 || form.hours > 24) e.hours = "يجب أن تكون الساعات بين 0.5 و 24";
    if (!form.type) e.type = "اختر النوع";
    if (form.evaluationReportUrl && !/^https?:\/\/.+/.test(form.evaluationReportUrl)) e.evaluationReportUrl = "رابط غير صالح";
    if (form.trainingReportUrl && !/^https?:\/\/.+/.test(form.trainingReportUrl)) e.trainingReportUrl = "رابط غير صالح";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await hoursAPI.updateSession(editing._id, form);
        showToast("تم تعديل الجلسة بنجاح", "success");
      } else {
        await hoursAPI.createSession(form);
        showToast("تم إضافة الجلسة بنجاح", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveInstructor = async () => {
    if (!newInstructorName.trim()) return;
    setSavingInstructor(true);
    try {
      const instr = await onAddInstructor(newInstructorName.trim());
      setForm((f) => ({ ...f, instructorId: instr._id, instructorName: instr.name }));
      setAddingInstructor(false);
      setNewInstructorName("");
    } catch {
      showToast("فشل إضافة المدرب", "error");
    } finally {
      setSavingInstructor(false);
    }
  };

  const instructorOptions = useMemo(() => [
    { value: "", label: "لا مدرب" },
    ...instructors.map((i) => ({ value: i._id, label: i.name })),
    { value: "__add__", label: "+ إضافة مدرب جديد" },
  ], [instructors]);

  const dayValueBadge = form.hours < 5 ? "نصف يوم (0.5)" : "يوم كامل (1.0)";
  const dayValueColor = form.hours < 5
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editing ? "تعديل الجلسة التدريبية" : "إضافة تدريب جديد"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto max-h-[75vh] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">اسم البرنامج *</label>
              <CustomSelect
                value={form.programName}
                options={PROGRAM_NAMES.map((p) => ({ value: p, label: p }))}
                onChange={(v) => setForm((f) => ({ ...f, programName: v as ProgramName }))}
              />
              {errors.programName && <p className="text-xs text-red-500 mt-1">{errors.programName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">النوع *</label>
              <CustomSelect
                value={form.type}
                options={[
                  { value: "Training", label: "تدريب" },
                  { value: "Awareness Event", label: "فعالية توعوية" },
                  { value: "Incubation", label: "احتضان" },
                  { value: "Consultation", label: "استشارة" },
                ]}
                onChange={(v) => setForm((f) => ({ ...f, type: v as "Training" | "Awareness Event" | "Incubation" | "Consultation" }))}
              />
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">اسم الجلسة *</label>
            <input
              type="text"
              value={form.sessionName}
              onChange={(e) => setForm((f) => ({ ...f, sessionName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل اسم الجلسة..."
            />
            {errors.sessionName && <p className="text-xs text-red-500 mt-1">{errors.sessionName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">التاريخ *</label>
              <input
                type="date"
                value={form.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">عدد الساعات *</label>
              <input
                type="number"
                value={form.hours}
                min={0.5} max={24} step="any"
                onChange={(e) => setForm((f) => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.hours && <p className="text-xs text-red-500 mt-1">{errors.hours}</p>}
              {form.hours > 0 && (
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${dayValueColor}`}>
                  = {dayValueBadge}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">طريقة التدريب</label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${!form.mode || form.mode === "offline" ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}`}>أوفلاين</span>
                <ToggleSwitch
                  checked={form.mode === "online"}
                  onChange={() => setForm((f) => ({ ...f, mode: f.mode === "online" ? "offline" : "online" }))}
                  title="أونلاين / أوفلاين"
                />
                <span className={`text-sm font-medium ${form.mode === "online" ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}>أونلاين</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">عدد الحضور</label>
              <input
                type="number"
                value={form.attendeesCount}
                min={0}
                onChange={(e) => setForm((f) => ({ ...f, attendeesCount: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">المدرب (اختياري)</label>
            <CustomSelect
              value={form.instructorId}
              options={instructorOptions}
              searchable={true}
              onChange={(v) => {
                if (v === "__add__") {
                  setAddingInstructor(true);
                } else {
                  const instr = instructors.find((i) => i._id === v);
                  setForm((f) => ({ ...f, instructorId: v, instructorName: instr?.name ?? "" }));
                  setAddingInstructor(false);
                }
              }}
            />
            {errors.instructorId && <p className="text-xs text-red-500 mt-1">{errors.instructorId}</p>}
            {addingInstructor && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newInstructorName}
                  onChange={(e) => setNewInstructorName(e.target.value)}
                  placeholder="اسم المدرب الجديد..."
                  className="flex-1 px-3 py-2 rounded-xl border border-teal-400 dark:border-teal-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button type="button" disabled={savingInstructor} onClick={handleSaveInstructor} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                  {savingInstructor ? "جاري..." : "حفظ"}
                </button>
                <button type="button" onClick={() => setAddingInstructor(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl hover:opacity-80 transition-colors">
                  إلغاء
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">رابط تقرير التقييم</label>
              <input
                type="url"
                value={form.evaluationReportUrl}
                onChange={(e) => setForm((f) => ({ ...f, evaluationReportUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.evaluationReportUrl && <p className="text-xs text-red-500 mt-1">{errors.evaluationReportUrl}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">رابط تقرير التدريب</label>
              <input
                type="url"
                value={form.trainingReportUrl}
                onChange={(e) => setForm((f) => ({ ...f, trainingReportUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.trainingReportUrl && <p className="text-xs text-red-500 mt-1">{errors.trainingReportUrl}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm">
              {submitting ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الجلسة"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({
  open,
  onConfirm,
  onCancel,
  loading,
  message,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  message?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">تأكيد</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          {message || "هل تريد حذف هذا التدريب؟ لا يمكن التراجع عن هذا الإجراء."}
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors">
            {loading ? "جاري..." : "تأكيد"}
          </button>
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:opacity-80 text-sm transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ open, onClose, onImported, showToast }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: Array<{ row: number; errors: string[] }> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFile(null);
      setResult(null);
    }
  }, [open]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await hoursAPI.importSessions(file);
      setResult({ imported: res.data.imported, skipped: res.data.skipped, errors: res.data.errors });
      if (res.data.imported > 0) {
        showToast(`تم استيراد ${res.data.imported} جلسة بنجاح`, "success");
        onImported();
      }
    } catch {
      showToast("فشل الاستيراد", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">استيراد من Excel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
          >
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {file ? (
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">اسحب الملف هنا أو انقر للاختيار</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx أو .xls فقط</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">أعمدة الملف المتوقعة:</p>
            <div className="flex flex-wrap gap-1">
              {["Program Name", "Session Name", "Date", "No. of Hrs", "Online/Offline", "Instructor", "No. of Attendees", "Type"].map((col) => (
                <span key={col} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-gray-600 dark:text-gray-300">{col}</span>
              ))}
            </div>
          </div>

          {result && (
            <div className={`rounded-xl p-4 ${result.skipped > 0 ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"}`}>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                تم استيراد <span className="text-green-600 dark:text-green-400">{result.imported}</span> جلسة
                {result.skipped > 0 && <> — تم تخطي <span className="text-amber-600 dark:text-amber-400">{result.skipped}</span> بسبب أخطاء</>}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleUpload} disabled={!file || loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors">
              {loading ? "جاري الاستيراد..." : "استيراد"}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:opacity-80 text-sm transition-colors">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Table Tab ────────────────────────────────────────────────────────

interface SessionsTabProps {
  state: State;
  dispatch: React.Dispatch<Action>;
  onEdit: (s: TrainingSession) => void;
  onDelete: (s: TrainingSession) => void;
  showToast: (msg: string, type: "success" | "error") => void;
  onImport: () => void;
  setPage: (p: number) => void;
}

function SessionsTab({ state, dispatch, onEdit, onDelete, showToast, onImport, setPage }: SessionsTabProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => dispatch({ type: "SET_FILTER", key: "search", value: val }), 250);
  };

  const handleExport = async (type: "hours" | "timetable") => {
    const fy = state.sessionsFilters.fiscalYear || getCurrentFiscalYear();
    try {
      const res = type === "hours" ? await hoursAPI.exportTracking(fy) : await hoursAPI.exportTimetable(fy);
      downloadBlob(res.data as Blob, `${type === "hours" ? "hours-tracking" : "timetable"}-${fy}.xlsx`);
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    try {
      const res = await hoursAPI.deleteMultipleSessions(Array.from(selectedIds));
      if (res.data.success) {
        showToast("تم الحذف الجماعي بنجاح", "success");
        setSelectedIds(new Set());
        dispatch({ type: "SET_SESSIONS_LOADING", loading: true });
        dispatch({ type: "SET_FILTER", key: "search", value: state.sessionsFilters.search });
      }
    } catch {
      showToast("فشل الحذف الجماعي", "error");
    } finally {
      setIsDeletingBulk(false);
      setShowBulkConfirm(false);
    }
  };

  const fyOptions = useMemo(() => [
    { value: "", label: "كل السنوات" },
    ...state.fiscalYears.map((fy) => ({ value: fy, label: fy })),
  ], [state.fiscalYears]);

  const programOptions = useMemo(() => [
    { value: "", label: "كل البرامج" },
    ...PROGRAM_NAMES.map((p) => ({ value: p, label: p })),
  ], []);

  const sortOptions = [
    { value: "newest", label: "الأحدث أولاً" },
    { value: "oldest", label: "الأقدم أولاً" },
    { value: "name", label: "حسب الاسم" },
  ];

  const { sessions, sessionsLoading, sessionsPagination: pag, sessionsFilters: flt } = state;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => dispatch({ type: "OPEN_MODAL" })} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة تدريب
        </button>
        <button onClick={onImport} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm hover:border-blue-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          استيراد من Excel
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => setShowBulkConfirm(true)} disabled={isDeletingBulk} className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold rounded-xl text-sm hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {isDeletingBulk ? "جاري الحذف..." : `حذف المحدد (${selectedIds.size})`}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => handleExport("hours")} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Hours Tracking
        </button>
        <button onClick={() => handleExport("timetable")} className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Timetable
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input type="text" placeholder="بحث باسم الجلسة..." defaultValue={flt.search} onChange={(e) => handleSearch(e.target.value)} className="col-span-2 lg:col-span-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <CustomSelect value={flt.programName} options={programOptions} onChange={(v) => dispatch({ type: "SET_FILTER", key: "programName", value: v })} />
          <CustomSelect value={flt.fiscalYear} options={fyOptions} onChange={(v) => dispatch({ type: "SET_FILTER", key: "fiscalYear", value: v })} />
          <input type="date" value={flt.dateFrom} onChange={(e) => dispatch({ type: "SET_FILTER", key: "dateFrom", value: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={flt.dateTo} onChange={(e) => dispatch({ type: "SET_FILTER", key: "dateTo", value: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <CustomSelect value={flt.sort} options={sortOptions} onChange={(v) => dispatch({ type: "SET_FILTER", key: "sort", value: v })} />
            <button onClick={() => dispatch({ type: "RESET_FILTERS" })} title="إعادة تعيين الفلاتر" className="p-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">
                <th className="px-3 py-3 text-right w-10">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    checked={sessions.length > 0 && selectedIds.size === sessions.length}
                    onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(sessions.map((s) => s._id))); else setSelectedIds(new Set()); }}
                  />
                </th>
                <th className="px-3 py-3 text-right whitespace-nowrap">البرنامج</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">الجلسة</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">التاريخ</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">الساعات</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">الطريقة</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">المدرب</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">الحضور</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">النوع</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">تقرير التقييم</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">تقرير التدريب</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sessionsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 12 }).map((__, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full" /></td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد جلسات تدريبية بعد</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">ابدأ بإضافة جلسة أو استيراد من Excel</p>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.has(s._id)}
                        onChange={(e) => { const next = new Set(selectedIds); if (e.target.checked) next.add(s._id); else next.delete(s._id); setSelectedIds(next); }}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${PROGRAM_COLORS[s.programName] ?? "bg-gray-100 text-gray-600"}`}>{s.programName}</span></td>
                    <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{s.sessionName}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{s.hours} س</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.mode === "online" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {s.mode === "online" ? "أونلاين" : "أوفلاين"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{s.instructorName || "—"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.attendeesCount}</td>
                    <td className="px-3 py-2.5 text-center"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeColor(s.type)}`}>{getTypeLabel(s.type)}</span></td>
                    <td className="px-3 py-2.5 text-center">
                      {s.evaluationReportUrl ? (
                        <a href={s.evaluationReportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {s.trainingReportUrl ? (
                        <a href={s.trainingReportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => onDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pag.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" dir="rtl">
            <p className="text-xs text-gray-500 dark:text-gray-400">{pag.total} نتيجة — صفحة {pag.page} من {pag.totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(pag.page - 1)} disabled={pag.page <= 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              {Array.from({ length: Math.min(pag.totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (pag.totalPages <= 7) pageNum = i + 1;
                else if (pag.page <= 4) pageNum = i + 1;
                else if (pag.page >= pag.totalPages - 3) pageNum = pag.totalPages - 6 + i;
                else pageNum = pag.page - 3 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pageNum === pag.page ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(pag.page + 1)} disabled={pag.page >= pag.totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirm
        open={showBulkConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
        loading={isDeletingBulk}
        message={`هل أنت متأكد من حذف ${selectedIds.size} جلسات؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
}

// ─── Timetable Calendar Tab ────────────────────────────────────────────────────

function TimetableTab({ state, dispatch, showToast }: { state: State; dispatch: React.Dispatch<Action>; showToast: (msg: string, type: "success" | "error") => void }) {
  const { timetableData: snap, timetableYear: year, timetableLoading, fiscalYears } = state;

  const handleExport = async (type: "hours" | "timetable") => {
    try {
      const res = type === "hours" ? await hoursAPI.exportTracking(year) : await hoursAPI.exportTimetable(year);
      downloadBlob(res.data as Blob, `${type}-${year}.xlsx`);
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

  const fyOptions = useMemo(() => [
    { value: getCurrentFiscalYear(), label: getCurrentFiscalYear() + " (الحالية)" },
    ...fiscalYears.filter((fy) => fy !== getCurrentFiscalYear()).map((fy) => ({ value: fy, label: fy })),
  ], [fiscalYears]);

  if (timetableLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
            options={fyOptions.length > 0 ? fyOptions : [{ value: year, label: year }]}
            onChange={(v) => dispatch({ type: "SET_TIMETABLE", data: null, year: v })}
          />
        </div>
        <div className="flex-1" />
        <button onClick={() => handleExport("hours")} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Hours Tracking
        </button>
        <button onClick={() => handleExport("timetable")} className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Timetable
        </button>
      </div>

      {!snap ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد بيانات للجدول الزمني للسنة {year}</p>
          <p className="text-gray-400 text-xs mt-1">أضف جلسات تدريبية لإنشاء الجدول</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي أيام التدريب</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{snap.totalDays}</p>
              <p className="text-xs text-gray-400 mt-1">{snap.sessionCount} جلسة</p>
            </div>
            {snap.quarterly.slice(0, 3).map((q) => (
              <div key={q.quarter} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {q.quarter === "Q1" ? "الربع الأول" : q.quarter === "Q2" ? "الربع الثاني" : "الربع الثالث"}
                </p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{q.totalDays}</p>
                <p className="text-xs text-gray-400 mt-1">{q.months.join(" • ")}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">جدول التوقيت — {snap.fiscalYear}</h3>
              <p className="text-xs text-gray-400">
                <span className="inline-block w-3 h-3 rounded bg-amber-200 dark:bg-amber-800/50 ml-1" />نصف يوم &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-teal-200 dark:bg-teal-800/50 ml-1" />يوم كامل
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs lg:text-sm border-collapse" style={{ minWidth: "1100px" }} dir="rtl">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60">
                    <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 px-2 py-2 text-right font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-600 min-w-[160px]">البرنامج</th>
                    {Array.from({ length: 31 }, (_, i) => (
                      <th key={i} className="px-0 py-2 text-center font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 w-8">{i + 1}</th>
                    ))}
                    <th className="px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.months.map((monthData: IMonthData) => (
                    <React.Fragment key={`${monthData.year}-${monthData.monthIndex}`}>
                      <tr className="bg-blue-50/60 dark:bg-blue-900/20">
                        <td colSpan={33} className="sticky right-0 bg-blue-50/60 dark:bg-blue-900/20 px-3 py-1.5 font-bold text-blue-800 dark:text-blue-300 text-xs border-t-2 border-blue-200 dark:border-blue-800">
                          {monthData.monthName} {monthData.year}
                        </td>
                      </tr>
                      {TIMETABLE_PROGRAMS.map((prog) => {
                        const progData = monthData.programs[prog] as Record<number, number> & { monthTotal: number } | undefined;
                        const color = TIMETABLE_PROGRAM_COLORS[prog];
                        return (
                          <tr key={prog} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                            <td className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700 text-[10px] leading-tight" style={{ borderRight: `3px solid ${color}` }}>
                              {prog}
                            </td>
                            {Array.from({ length: 31 }, (_, i) => {
                              const day = i + 1;
                              const val = progData ? (progData[day] ?? 0) : 0;
                              const isInvalid = day > monthData.daysInMonth;
                              return (
                                <td key={day} className={`text-center border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 ${isInvalid ? "bg-gray-50 dark:bg-gray-800/50" : val === 0.5 ? "bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 font-bold" : val >= 1 ? "bg-teal-100 dark:bg-teal-800/30 text-teal-800 dark:text-teal-300 font-bold" : ""}`} title={val > 0 ? `${val} يوم` : undefined}>
                                  {!isInvalid && val > 0 ? (val === 0.5 ? "½" : val) : ""}
                                </td>
                              );
                            })}
                            <td className="px-2 py-1 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40">{progData?.monthTotal ?? 0}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100/80 dark:bg-gray-700/40 font-bold">
                        <td className="sticky right-0 z-10 bg-gray-100/80 dark:bg-gray-700/40 px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 text-[10px]">إجمالي الشهر</td>
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const isInvalid = day > monthData.daysInMonth;
                          const colTotal = isInvalid ? 0 : TIMETABLE_PROGRAMS.reduce((sum, prog) => {
                            const pd = monthData.programs[prog] as Record<number, number> | undefined;
                            return sum + (pd ? (pd[day] ?? 0) : 0);
                          }, 0);
                          return (
                            <td key={day} className={`text-center h-6 text-[10px] ${isInvalid ? "bg-gray-200/50 dark:bg-gray-800" : colTotal > 0 ? "text-gray-800 dark:text-gray-200" : ""}`}>
                              {!isInvalid && colTotal > 0 ? colTotal : ""}
                            </td>
                          );
                        })}
                        <td className="px-2 text-center text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-gray-700/60">{monthData.monthlyDays}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">ملخص البرامج السنوي</h3>
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
                    const pct = at.targetDays > 0 ? Math.min(100, (at.totalDays / at.targetDays) * 100) : 0;
                    const color = TIMETABLE_PROGRAM_COLORS[at.program];
                    return (
                      <tr key={at.program} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200" style={{ borderRight: `3px solid ${color}` }}>{at.program}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{at.totalDays}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400">{at.targetDays || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{at.q1}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{at.q2}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{at.q3}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{at.q4}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-bold ${remaining > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
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
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab({ state, dispatch, showToast }: { state: State; dispatch: React.Dispatch<Action>; showToast: (msg: string, type: "success" | "error") => void }) {
  const { fiscalYears } = state;
  const currentFY = getCurrentFiscalYear();

  const handleExport = async (fy: string, type: "hours" | "timetable") => {
    try {
      const res = type === "hours" ? await hoursAPI.exportTracking(fy) : await hoursAPI.exportTimetable(fy);
      downloadBlob(res.data as Blob, `${type}-${fy}.xlsx`);
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

  if (fiscalYears.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
        <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
        <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد بيانات للسنوات السابقة</p>
        <p className="text-gray-400 text-xs mt-1">ستظهر السنوات هنا بعد إضافة جلسات تدريبية</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {fiscalYears.map((fy) => (
        <div key={fy} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{fy}</h3>
            {fy === currentFY && <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">السنة الحالية</span>}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { dispatch({ type: "SET_TIMETABLE", data: null, year: fy }); dispatch({ type: "SET_TAB", tab: "timetable" }); }} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition-colors">
              عرض التفاصيل
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleExport(fy, "hours")} className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Hours
            </button>
            <button onClick={() => handleExport(fy, "timetable")} className="flex-1 py-1.5 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 text-teal-700 dark:text-teal-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Timetable
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Planned Timetable Cell ───────────────────────────────────────────────────

interface PlanCellProps {
  value: number;
  isInvalid: boolean;
  onClick: () => void;
}

const PlanCell = React.memo(function PlanCell({ value, isInvalid, onClick }: PlanCellProps) {
  if (isInvalid) {
    return <td className="border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 bg-gray-50 dark:bg-gray-800/50" />;
  }
  let cellCls = "text-center border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 cursor-pointer transition-colors select-none";
  let label = "";
  if (value === 0.5) {
    cellCls += " bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-200 dark:hover:bg-amber-700/50";
    label = "½";
  } else if (value >= 1) {
    cellCls += " bg-teal-100 dark:bg-teal-800/40 text-teal-800 dark:text-teal-300 font-bold hover:bg-teal-200 dark:hover:bg-teal-700/50";
    label = "1";
  } else {
    cellCls += " hover:bg-gray-100 dark:hover:bg-gray-700/30 text-gray-300 dark:text-gray-600";
    label = "";
  }
  return (
    <td className={cellCls} onClick={onClick} title={value > 0 ? `${value} يوم — انقر للتغيير` : "انقر لتعيين نصف يوم"}>
      {value === 0 ? (
        <span className="opacity-0 group-hover:opacity-100 text-[8px]">+</span>
      ) : (
        <span className="text-[10px]">{label}</span>
      )}
    </td>
  );
});

// ─── Planned Timetable Tab ────────────────────────────────────────────────────

function PlannedTab({
  state,
  dispatch,
  showToast,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const { localPlan, isDirty, plannedLoading, plannedSaving, selectedPlannedFY, fiscalYears } = state;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [navGuardOpen, setNavGuardOpen] = useState(false);

  const fyOptions = useMemo(() => [
    { value: getCurrentFiscalYear(), label: getCurrentFiscalYear() + " (الحالية)" },
    ...fiscalYears.filter((fy) => fy !== getCurrentFiscalYear()).map((fy) => ({ value: fy, label: fy })),
  ], [fiscalYears]);

  const { startYear } = useMemo(() => parseFiscalYear(selectedPlannedFY), [selectedPlannedFY]);

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

  const doSave = useCallback(async (silent = false) => {
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
  }, [localPlan, selectedPlannedFY, dispatch, showToast]);

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

  const handleCellClick = useCallback((program: string, monthIndex: number, day: number, currentVal: number) => {
    const next = currentVal === 0 ? 0.5 : currentVal === 0.5 ? 1 : 0;
    dispatch({ type: "UPDATE_LOCAL_CELL", program, monthIndex, day, value: next });
  }, [dispatch]);

  const handleReset = () => {
    const empty = buildEmptyPlannedData();
    dispatch({ type: "UPDATE_LOCAL_CELL", program: "", monthIndex: -1, day: -1, value: 0 });
    // Reset entire local plan by dispatching SET_PLANNED_DATA with empty
    dispatch({ type: "SET_PLANNED_DATA", data: { ...state.plannedData!, data: empty }, fy: selectedPlannedFY });
    setShowResetConfirm(false);
  };

  const handleFYChange = (newFY: string) => {
    if (isDirty) {
      setNavGuardOpen(true);
      return;
    }
    dispatch({ type: "SET_PLANNED_FY", fy: newFY });
  };

  if (plannedLoading) {
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

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-700 inline-block" />
            نصف يوم (0.5)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-400 dark:bg-teal-600 inline-block" />
            يوم كامل (1.0)
          </span>
        </div>

        <div className="flex-1" />

        {/* Auto-save indicator */}
        {autoSaving && (
          <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">جاري الحفظ التلقائي...</span>
        )}

        {isDirty && !autoSaving && (
          <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">تغييرات غير محفوظة</span>
        )}

        {/* Reset */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              جاري الحفظ...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              حفظ الخطة
            </>
          )}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">الخطة السنوية — {selectedPlannedFY}</h3>
          <p className="text-xs text-gray-400">انقر على الخلايا لتبديل الحالة: فارغة → نصف يوم → يوم كامل</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs border-collapse" style={{ minWidth: "1100px" }} dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/60">
                <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 px-2 py-2 text-right font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-600 min-w-[160px]">البرنامج</th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="px-0 py-2 text-center font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 w-8">{i + 1}</th>
                ))}
                <th className="px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {FY_CALENDAR_MONTHS.map((calMonth) => {
                const calYear = getCalendarYearForFYMonth(calMonth, startYear);
                const daysInMonth = getDaysInMonth(calYear, calMonth);
                return (
                  <React.Fragment key={calMonth}>
                    {/* Month header */}
                    <tr className="bg-blue-50/60 dark:bg-blue-900/20">
                      <td colSpan={33} className="sticky right-0 bg-blue-50/60 dark:bg-blue-900/20 px-3 py-1.5 font-bold text-blue-800 dark:text-blue-300 text-xs border-t-2 border-blue-200 dark:border-blue-800">
                        {ARABIC_MONTH_NAMES[calMonth]} {calYear}
                      </td>
                    </tr>
                    {/* Program rows */}
                    {ALL_PLANNED_PROGRAMS.map((prog) => {
                      const color = TIMETABLE_PROGRAM_COLORS[prog] ?? "#E5E7EB";
                      return (
                        <tr key={prog} className="group border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700 text-[10px] leading-tight" style={{ borderRight: `3px solid ${color}` }}>
                            {prog}
                          </td>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            const isInvalid = day > daysInMonth;
                            const val = localPlan?.[prog]?.[String(calMonth)]?.[String(day)] ?? 0;
                            return (
                              <PlanCell
                                key={day}
                                value={val}
                                isInvalid={isInvalid}
                                onClick={() => !isInvalid && handleCellClick(prog, calMonth, day, val)}
                              />
                            );
                          })}
                          <td className="px-2 py-1 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 text-[10px]">
                            {monthTotals[prog]?.[calMonth] ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Month totals row */}
                    <tr className="bg-gray-100/80 dark:bg-gray-700/40 font-bold">
                      <td className="sticky right-0 z-10 bg-gray-100/80 dark:bg-gray-700/40 px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 text-[10px]">إجمالي الشهر</td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        const isInvalid = day > daysInMonth;
                        const colTotal = isInvalid ? 0 : (colTotals[calMonth]?.[day] ?? 0);
                        return (
                          <td key={day} className={`text-center h-6 text-[10px] ${isInvalid ? "bg-gray-200/50 dark:bg-gray-800" : colTotal > 0 ? "text-gray-800 dark:text-gray-200" : ""}`}>
                            {!isInvalid && colTotal > 0 ? colTotal : ""}
                          </td>
                        );
                      })}
                      <td className="px-2 text-center text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-gray-700/60 text-[10px]">
                        {ALL_PLANNED_PROGRAMS.reduce((s, prog) => s + (monthTotals[prog]?.[calMonth] ?? 0), 0)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
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
        onConfirm={() => { setNavGuardOpen(false); dispatch({ type: "SET_PLANNED_FY", fy: selectedPlannedFY }); }}
        onCancel={() => setNavGuardOpen(false)}
        loading={false}
        message="لديك تغييرات غير محفوظة. هل تريد المغادرة؟"
      />
    </div>
  );
}

// ─── Comparison Chart (memoized) ──────────────────────────────────────────────

interface ComparisonChartProps {
  data: ProgramComparison[];
}

const ComparisonChart = React.memo(function ComparisonChart({ data }: ComparisonChartProps) {
  const chartData = data.map((pc) => ({
    name: pc.program.length > 14 ? pc.program.slice(0, 13) + "…" : pc.program,
    fullName: pc.program,
    planned: pc.plannedTotal,
    actual: pc.actualTotal,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
        <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px", color: "#F9FAFB" }}
          formatter={(value, name) => [value, String(name) === "planned" ? "الخطة" : "المنجز"]}
          labelFormatter={(label, payload) => {
            const item = (payload as unknown as Array<{ payload?: { fullName?: string } }>)?.[0]?.payload;
            return item?.fullName ?? String(label);
          }}
        />
        <Legend formatter={(value) => value === "planned" ? "الخطة" : "المنجز"} />
        <ReferenceLine y={0} stroke="#6B7280" />
        <Bar dataKey="planned" fill="#3B82F6" opacity={0.7} radius={[3, 3, 0, 0]} name="planned" />
        <Bar dataKey="actual" fill="#1D9E75" opacity={0.9} radius={[3, 3, 0, 0]} name="actual" />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

// ─── Comparison Tab ───────────────────────────────────────────────────────────

function ComparisonTab({
  state,
  dispatch,
  showToast,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const { comparisonData: cmp, comparisonLoading, selectedComparisonFY, fiscalYears } = state;

  const fyOptions = useMemo(() => [
    { value: getCurrentFiscalYear(), label: getCurrentFiscalYear() + " (الحالية)" },
    ...fiscalYears.filter((fy) => fy !== getCurrentFiscalYear()).map((fy) => ({ value: fy, label: fy })),
  ], [fiscalYears]);

  const handleExportComparison = async () => {
    try {
      const res = await plannedAPI.export(selectedComparisonFY);
      downloadBlob(res.data as Blob, `planned-comparison-${selectedComparisonFY}.xlsx`);
    } catch (err: any) {
      console.error("Export comparison error:", err);
      showToast(`فشل تحميل تقرير المقارنة: ${err?.message || "خطأ غير معروف"}`, "error");
    }
  };

  const handleExportTimetable = async () => {
    try {
      const res = await hoursAPI.exportTimetable(selectedComparisonFY);
      downloadBlob(res.data as Blob, `timetable-${selectedComparisonFY}.xlsx`);
    } catch (err: any) {
      console.error("Export timetable error:", err);
      showToast(`فشل تحميل الجدول الزمني: ${err?.message || "خطأ غير معروف"}`, "error");
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

  if (comparisonLoading) {
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
    <div className="space-y-6">
      {/* FY selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <CustomSelect
            value={selectedComparisonFY}
            options={fyOptions.length > 0 ? fyOptions : [{ value: selectedComparisonFY, label: selectedComparisonFY }]}
            onChange={(v) => dispatch({ type: "SET_COMPARISON_FY", fy: v })}
          />
        </div>
      </div>

      {!cmp ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">جاري تحميل بيانات المقارنة...</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Grand Planned */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي الخطة</p>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{cmp.grandPlanned}</p>
                <p className="text-xs text-gray-400 mt-0.5">أيام مخططة</p>
              </div>
            </div>

            {/* Card 2: Grand Actual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي المنجز</p>
                <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{cmp.grandActual}</p>
                <p className="text-xs text-gray-400 mt-0.5">أيام فعلية</p>
              </div>
            </div>

            {/* Card 3: Diff */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cmp.grandDiff >= 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                <svg className={`w-5 h-5 ${cmp.grandDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cmp.grandDiff >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} /></svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الفارق</p>
                <p className={`text-2xl font-extrabold ${cmp.grandDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {cmp.grandDiff > 0 ? "+" : ""}{cmp.grandDiff}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{cmp.grandDiff >= 0 ? "فائض" : "عجز"}</p>
              </div>
            </div>

            {/* Card 4: Overall Completion */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cmp.overallCompletionPct >= 80 ? "bg-teal-100 dark:bg-teal-900/40" : cmp.overallCompletionPct >= 50 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                <svg className={`w-5 h-5 ${pctColor(cmp.overallCompletionPct)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">نسبة الإنجاز الكلية</p>
                <p className={`text-2xl font-extrabold ${pctColor(cmp.overallCompletionPct)}`}>{cmp.overallCompletionPct.toFixed(1)}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{cmp.fiscalYear}</p>
              </div>
            </div>
          </div>

          {/* Program comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">مقارنة البرامج</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <th className="px-4 py-3 text-right">البرنامج</th>
                    <th className="px-3 py-3 text-center">الخطة</th>
                    <th className="px-3 py-3 text-center">المنجز</th>
                    <th className="px-3 py-3 text-center">الفارق</th>
                    <th className="px-3 py-3 text-center min-w-[140px]">نسبة الإنجاز</th>
                    <th className="px-3 py-3 text-center">Q1</th>
                    <th className="px-3 py-3 text-center">Q2</th>
                    <th className="px-3 py-3 text-center">Q3</th>
                    <th className="px-3 py-3 text-center">Q4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cmp.programComparisons.map((pc) => {
                    const color = TIMETABLE_PROGRAM_COLORS[pc.program] ?? "#E5E7EB";
                    const barFill = barColor(pc.completionPct);
                    const barW = Math.min(100, pc.completionPct);
                    return (
                      <tr key={pc.program} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 text-sm" style={{ borderRight: `3px solid ${color}` }}>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            {pc.program}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{pc.plannedTotal}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-teal-600 dark:text-teal-400">{pc.actualTotal}</td>
                        <td className={`px-3 py-2.5 text-center font-bold ${pc.diffTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {pc.diffTotal > 0 ? "+" : ""}{pc.diffTotal}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, backgroundColor: barFill }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-left ${pctColor(pc.completionPct)}`}>
                              {pc.completionPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">{pc.q1Actual}/{pc.q1Planned}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">{pc.q2Actual}/{pc.q2Planned}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">{pc.q3Actual}/{pc.q3Planned}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 text-xs">{pc.q4Actual}/{pc.q4Planned}</td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gray-50 dark:bg-gray-700/40 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 text-sm">الإجمالي</td>
                    <td className="px-3 py-2.5 text-center text-blue-700 dark:text-blue-300">{cmp.grandPlanned}</td>
                    <td className="px-3 py-2.5 text-center text-teal-700 dark:text-teal-300">{cmp.grandActual}</td>
                    <td className={`px-3 py-2.5 text-center ${cmp.grandDiff >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {cmp.grandDiff > 0 ? "+" : ""}{cmp.grandDiff}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-extrabold ${pctColor(cmp.overallCompletionPct)}`}>{cmp.overallCompletionPct.toFixed(1)}%</span>
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">مخطط المقارنة</h3>
            <ComparisonChart data={cmp.programComparisons} />
          </div>

          {/* Difference heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">خريطة الفارق الشهرية</h3>
              <p className="text-xs text-gray-400 mt-0.5">القيمة = المنجز − المخطط لكل شهر</p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs border-collapse" dir="rtl">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 font-semibold min-w-[160px]">البرنامج</th>
                    {FY_CALENDAR_MONTHS.map((calMonth) => (
                      <th key={calMonth} className="px-1 py-2 text-center text-gray-500 dark:text-gray-400 font-medium w-12">
                        {ARABIC_MONTH_SHORT[calMonth]}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-gray-600 dark:text-gray-400 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.programComparisons.map((pc) => {
                    const color = TIMETABLE_PROGRAM_COLORS[pc.program] ?? "#E5E7EB";
                    return (
                      <tr key={pc.program} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium text-[11px]" style={{ borderRight: `3px solid ${color}` }}>
                          {pc.program}
                        </td>
                        {FY_CALENDAR_MONTHS.map((calMonth) => {
                          const monthEntry = cmp.monthlyDiff.find((m: MonthlyDiffEntry) => m.monthIndex === calMonth);
                          const progEntry = monthEntry?.programs[pc.program];
                          const diff = progEntry?.monthDiff ?? 0;
                          let cellBg = "";
                          if (diff > 0) {
                            const intensity = Math.min(diff * 30, 100);
                            cellBg = `rgba(16, 185, 129, ${0.15 + intensity / 400})`;
                          } else if (diff < 0) {
                            const intensity = Math.min(Math.abs(diff) * 30, 100);
                            cellBg = `rgba(239, 68, 68, ${0.15 + intensity / 400})`;
                          }
                          return (
                            <td key={calMonth} className="text-center py-2 px-1" style={{ backgroundColor: cellBg }}>
                              <span className={`text-[11px] font-bold ${diff > 0 ? "text-green-700 dark:text-green-400" : diff < 0 ? "text-red-700 dark:text-red-400" : "text-gray-400"}`}>
                                {diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : ""}
                              </span>
                            </td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center font-bold text-xs ${pc.diffTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {pc.diffTotal > 0 ? "+" : ""}{pc.diffTotal}
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              تحميل تقرير المقارنة
            </button>
            <button
              onClick={handleExportTimetable}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              تحميل خطة التوقيت
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function HoursPageContent() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { toasts, show: showToast } = useToast();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // ── Load sessions ──────────────────────────────────────────────────────────
  const { sessionsFilters } = state;
  const loadSessions = useCallback(async (p = page) => {
    dispatch({ type: "SET_SESSIONS_LOADING", loading: true });
    try {
      const flt = sessionsFilters;
      const res = await hoursAPI.getSessions({
        page: p, limit: 20, sort: flt.sort,
        fiscalYear: flt.fiscalYear || undefined,
        programName: flt.programName || undefined,
        dateFrom: flt.dateFrom || undefined,
        dateTo: flt.dateTo || undefined,
      });
      dispatch({ type: "SET_SESSIONS", sessions: res.data.data, pagination: res.data.pagination });
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 401) {
        dispatch({ type: "SET_SESSIONS_LOADING", loading: false });
      }
    }
  }, [sessionsFilters, page]);

  // ── Load timetable ─────────────────────────────────────────────────────────
  const loadTimetable = useCallback(async (year: string) => {
    dispatch({ type: "SET_TIMETABLE_LOADING", loading: true });
    try {
      const res = await hoursAPI.getTimetable(year);
      dispatch({ type: "SET_TIMETABLE", data: res.data.data, year });
    } catch {
      dispatch({ type: "SET_TIMETABLE", data: null, year });
    }
  }, []);

  // ── Load planned timetable ─────────────────────────────────────────────────
  const loadPlanned = useCallback(async (fy: string) => {
    dispatch({ type: "SET_PLANNED_LOADING", loading: true });
    try {
      const res = await plannedAPI.get(fy);
      dispatch({ type: "SET_PLANNED_DATA", data: res.data.data, fy });
    } catch {
      dispatch({ type: "SET_PLANNED_DATA", data: null, fy });
    }
  }, []);

  // ── Load comparison ────────────────────────────────────────────────────────
  const loadComparison = useCallback(async (fy: string) => {
    dispatch({ type: "SET_COMPARISON_LOADING", loading: true });
    try {
      const res = await plannedAPI.getComparison(fy);
      dispatch({ type: "SET_COMPARISON_DATA", data: res.data.data });
    } catch {
      dispatch({ type: "SET_COMPARISON_DATA", data: null });
    }
  }, []);

  // ── Load fiscal years + instructors ────────────────────────────────────────
  useEffect(() => {
    hoursAPI.getFiscalYears().then((res) => {
      dispatch({ type: "SET_FISCAL_YEARS", years: res.data.data });
    }).catch(() => {});
    hoursAPI.getInstructors().then((res) => {
      dispatch({ type: "SET_INSTRUCTORS", instructors: res.data.data });
    }).catch(() => {});
  }, []);

  // ── Sessions effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "tracking") loadSessions(page);
  }, [state.activeTab, state.sessionsFilters, page, loadSessions]);

  // ── Timetable effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "timetable" && !state.timetableData) {
      loadTimetable(state.timetableYear);
    }
  }, [state.activeTab, state.timetableYear, state.timetableData, loadTimetable]);

  useEffect(() => {
    if (state.activeTab === "timetable" && state.timetableData === null) {
      loadTimetable(state.timetableYear);
    }
  }, [state.timetableYear, state.activeTab, state.timetableData, loadTimetable]);

  // ── Planned effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "planned" && !state.localPlan) {
      loadPlanned(state.selectedPlannedFY);
    }
  }, [state.activeTab, state.selectedPlannedFY, state.localPlan, loadPlanned]);

  // ── Comparison effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "comparison" && !state.comparisonData) {
      loadComparison(state.selectedComparisonFY);
    }
  }, [state.activeTab, state.selectedComparisonFY, state.comparisonData, loadComparison]);

  const handleAddInstructor = useCallback(async (name: string): Promise<Instructor> => {
    const res = await hoursAPI.addInstructor(name);
    const instr = res.data.data;
    dispatch({ type: "SET_INSTRUCTORS", instructors: [...state.instructors, instr] });
    return instr;
  }, [state.instructors]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hoursAPI.deleteSession(deleteTarget._id);
      showToast("تم حذف الجلسة", "success");
      setDeleteTarget(null);
      await loadSessions(page);
      await loadTimetable(state.timetableYear);
    } catch {
      showToast("فشل الحذف", "error");
    } finally {
      setDeleting(false);
    }
  };

  const TABS: { key: State["activeTab"]; label: string }[] = [
    { key: "tracking", label: "تسجيل الحضور" },
    { key: "timetable", label: "جدول التوقيت" },
    { key: "archive", label: "السنوات السابقة" },
    { key: "planned", label: "الخطة السنوية" },
    { key: "comparison", label: "المقارنة والتقرير" },
  ];

  return (
    <div className="pb-12 bg-gray-50 dark:bg-gray-950" dir="rtl">
      {/* Toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 animate-fade-in ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {t.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">متابعة الساعات التدريبية</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mr-12">تسجيل وإدارة جلسات التدريب وعرض الجدول الزمني السنوي</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 w-fit max-w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (state.activeTab === "planned" && state.isDirty && tab.key !== "planned") {
                  // warn user — for simplicity, use native confirm here
                  if (!window.confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة؟")) return;
                }
                dispatch({ type: "SET_TAB", tab: tab.key });
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                state.activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              {tab.key === "planned" && state.isDirty && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mb-1 mr-1" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {state.activeTab === "tracking" && (
          <SessionsTab
            state={state}
            dispatch={dispatch}
            onEdit={(s) => dispatch({ type: "OPEN_MODAL", session: s })}
            onDelete={setDeleteTarget}
            showToast={showToast}
            onImport={() => setImportOpen(true)}
            setPage={setPage}
          />
        )}
        {state.activeTab === "timetable" && (
          <TimetableTab state={state} dispatch={dispatch} showToast={showToast} />
        )}
        {state.activeTab === "archive" && (
          <ArchiveTab state={state} dispatch={dispatch} showToast={showToast} />
        )}
        {state.activeTab === "planned" && (
          <PlannedTab state={state} dispatch={dispatch} showToast={showToast} />
        )}
        {state.activeTab === "comparison" && (
          <ComparisonTab state={state} dispatch={dispatch} showToast={showToast} />
        )}
      </div>

      {/* Modals */}
      <SessionModal
        open={state.modalOpen}
        editing={state.editingSession}
        instructors={state.instructors}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onSaved={() => { loadSessions(page); loadTimetable(state.timetableYear); }}
        onAddInstructor={handleAddInstructor}
        showToast={showToast}
      />

      <DeleteConfirm
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { loadSessions(page); loadTimetable(state.timetableYear); }}
        showToast={showToast}
      />
    </div>
  );
}

export default function HoursPage() {
  return (
    <RouteGuard allowedRoles={["admin", "employee"]}>
      <HoursPageContent />
    </RouteGuard>
  );
}
