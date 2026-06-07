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
import axios from "axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIXED: FIX 1 — fiscal year starts May 1, not May 25
function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month >= 4) {
    return `FY${year}-${year + 1}`;
  }
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
  activeTab: "tracking" | "timetable" | "archive";
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
  | { type: "SET_ERROR"; error: string | null };

const INITIAL_FILTERS: SessionFilters = {
  search: "",
  programName: "",
  dateFrom: "",
  dateTo: "",
  fiscalYear: "",
  sort: "newest",
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
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TAB": return { ...state, activeTab: action.tab };
    case "SET_SESSIONS": return { ...state, sessions: action.sessions, sessionsPagination: action.pagination, sessionsLoading: false };
    case "SET_SESSIONS_LOADING": return { ...state, sessionsLoading: action.loading };
    case "SET_FILTER":
      return {
        ...state,
        sessionsFilters: { ...state.sessionsFilters, [action.key]: action.value },
        sessionsPagination: { ...state.sessionsPagination, page: 1 },
      };
    case "RESET_FILTERS": return { ...state, sessionsFilters: INITIAL_FILTERS, sessionsPagination: { ...state.sessionsPagination, page: 1 } };
    case "OPEN_MODAL": return { ...state, modalOpen: true, editingSession: action.session ?? null };
    case "CLOSE_MODAL": return { ...state, modalOpen: false, editingSession: null };
    case "SET_INSTRUCTORS": return { ...state, instructors: action.instructors };
    case "SET_TIMETABLE": return { ...state, timetableData: action.data, timetableYear: action.year, timetableLoading: false };
    case "SET_TIMETABLE_LOADING": return { ...state, timetableLoading: action.loading };
    case "SET_FISCAL_YEARS": return { ...state, fiscalYears: action.years };
    case "SET_ERROR": return { ...state, error: action.error };
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

function SessionModal({
  open,
  editing,
  instructors,
  onClose,
  onSaved,
  onAddInstructor,
  showToast,
}: SessionModalProps) {
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
          instructorId: editing.instructorId ?? "", // FIXED: FIX 3 — null → ""
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
    // FIXED: FIX 3 — instructor is now optional, removed required check
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto max-h-[75vh] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Program Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">اسم البرنامج *</label>
              <CustomSelect
                value={form.programName}
                options={PROGRAM_NAMES.map((p) => ({ value: p, label: p }))}
                onChange={(v) => setForm((f) => ({ ...f, programName: v as ProgramName }))}
              />
              {errors.programName && <p className="text-xs text-red-500 mt-1">{errors.programName}</p>}
            </div>

            {/* Type */}
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

          {/* Session Name */}
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
            {/* Date */}
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

            {/* Hours */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">عدد الساعات *</label>
              <input
                type="number"
                value={form.hours}
                min={0.5}
                max={24}
                step="any"
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
            {/* Mode */}
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

            {/* Attendees */}
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

            {/* Instructor — FIXED: FIX 3 — optional field */}
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

            {/* Inline add instructor */}
            {addingInstructor && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newInstructorName}
                  onChange={(e) => setNewInstructorName(e.target.value)}
                  placeholder="اسم المدرب الجديد..."
                  className="flex-1 px-3 py-2 rounded-xl border border-teal-400 dark:border-teal-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  disabled={savingInstructor}
                  onClick={handleSaveInstructor}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {savingInstructor ? "جاري..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingInstructor(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl hover:opacity-80 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {/* Report URLs */}
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

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {submitting ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الجلسة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors text-sm"
            >
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">تأكيد الحذف</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          {message || "هل تريد حذف هذا التدريب؟ لا يمكن التراجع عن هذا الإجراء."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors"
          >
            {loading ? "جاري الحذف..." : "حذف"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:opacity-80 text-sm transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({
  open,
  onClose,
  onImported,
  showToast,
}: {
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
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
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

          {/* Reference columns */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">أعمدة الملف المتوقعة:</p>
            <div className="flex flex-wrap gap-1">
              {["Program Name", "Session Name", "Date", "No. of Hrs", "Online/Offline", "Instructor", "No. of Attendees", "Type"].map((col) => (
                <span key={col} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-gray-600 dark:text-gray-300">{col}</span>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 ${result.skipped > 0 ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"}`}>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                تم استيراد <span className="text-green-600 dark:text-green-400">{result.imported}</span> جلسة
                {result.skipped > 0 && <> — تم تخطي <span className="text-amber-600 dark:text-amber-400">{result.skipped}</span> بسبب أخطاء</>}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">عرض الأخطاء</summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e, idx) => (
                      <div key={idx} className="text-xs text-red-600 dark:text-red-400 mb-2 border-b border-red-100 dark:border-red-900/30 pb-1 last:border-0">
                        <span className="font-bold">{e.row === -1 ? "" : `صف ${e.row}: `}</span>
                        {e.errors.join("، ")}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors"
            >
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
        // force reload
        dispatch({ type: "SET_SESSIONS_LOADING", loading: true });
        // The parent component should ideally reload, but triggering a filter update forces it
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
      {/* Top bar: Add + Import + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL" })}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة تدريب
        </button>

        <button
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm hover:border-blue-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          استيراد من Excel
        </button>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={isDeletingBulk}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold rounded-xl text-sm hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeletingBulk ? "جاري الحذف..." : `حذف المحدد (${selectedIds.size})`}
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => handleExport("hours")}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Hours Tracking
        </button>
        <button
          onClick={() => handleExport("timetable")}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Timetable
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="بحث باسم الجلسة..."
            defaultValue={flt.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="col-span-2 lg:col-span-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <CustomSelect
            value={flt.programName}
            options={programOptions}
            onChange={(v) => dispatch({ type: "SET_FILTER", key: "programName", value: v })}
          />
          <CustomSelect
            value={flt.fiscalYear}
            options={fyOptions}
            onChange={(v) => dispatch({ type: "SET_FILTER", key: "fiscalYear", value: v })}
          />
          <input
            type="date"
            value={flt.dateFrom}
            onChange={(e) => dispatch({ type: "SET_FILTER", key: "dateFrom", value: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={flt.dateTo}
            onChange={(e) => dispatch({ type: "SET_FILTER", key: "dateTo", value: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <CustomSelect
              value={flt.sort}
              options={sortOptions}
              onChange={(v) => dispatch({ type: "SET_FILTER", key: "sort", value: v })}
            />
            <button
              onClick={() => dispatch({ type: "RESET_FILTERS" })}
              title="إعادة تعيين الفلاتر"
              className="p-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">
                <th className="px-3 py-3 text-right w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    checked={sessions.length > 0 && selectedIds.size === sessions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(sessions.map((s) => s._id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
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
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد جلسات تدريبية بعد</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">ابدأ بإضافة جلسة أو استيراد من Excel</p>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.has(s._id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(s._id);
                          else next.delete(s._id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PROGRAM_COLORS[s.programName] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.programName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{s.sessionName}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{s.hours} س</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.mode === "online"
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {s.mode === "online" ? "أونلاين" : "أوفلاين"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {/* FIXED: FIX 3 — show dash when no instructor */}
                      {s.instructorName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.attendeesCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeColor(s.type)}`}>
                        {getTypeLabel(s.type)}
                      </span>
                    </td>
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

        {/* Pagination */}
        {pag.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" dir="rtl">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pag.total} نتيجة — صفحة {pag.page} من {pag.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(pag.page - 1)}
                disabled={pag.page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              {Array.from({ length: Math.min(pag.totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (pag.totalPages <= 7) pageNum = i + 1;
                else if (pag.page <= 4) pageNum = i + 1;
                else if (pag.page >= pag.totalPages - 3) pageNum = pag.totalPages - 6 + i;
                else pageNum = pag.page - 3 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${
                      pageNum === pag.page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(pag.page + 1)}
                disabled={pag.page >= pag.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
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

function TimetableTab({
  state,
  dispatch,
  showToast,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
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
      {/* Controls */}
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
          <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد بيانات للجدول الزمني للسنة {year}</p>
          <p className="text-gray-400 text-xs mt-1">أضف جلسات تدريبية لإنشاء الجدول</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
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

          {/* Calendar grid */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                جدول التوقيت — {snap.fiscalYear}
              </h3>
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
                      <th key={i} className="px-0 py-2 text-center font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 w-8">
                        {i + 1}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.months.map((monthData: IMonthData) => (
                    <React.Fragment key={`${monthData.year}-${monthData.monthIndex}`}>
                      {/* Month sub-header */}
                      <tr className="bg-blue-50/60 dark:bg-blue-900/20">
                        <td
                          colSpan={33}
                          className="sticky right-0 bg-blue-50/60 dark:bg-blue-900/20 px-3 py-1.5 font-bold text-blue-800 dark:text-blue-300 text-xs border-t-2 border-blue-200 dark:border-blue-800"
                        >
                          {monthData.monthName} {monthData.year}
                        </td>
                      </tr>
                      {/* Program rows */}
                      {TIMETABLE_PROGRAMS.map((prog) => {
                        const progData = monthData.programs[prog] as Record<number, number> & { monthTotal: number } | undefined;
                        const color = TIMETABLE_PROGRAM_COLORS[prog];
                        return (
                          <tr key={prog} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
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
                              return (
                                <td
                                  key={day}
                                  className={`text-center border-r border-gray-100 dark:border-gray-700/30 h-7 w-8 ${
                                    isInvalid
                                      ? "bg-gray-50 dark:bg-gray-800/50"
                                      : val === 0.5
                                      ? "bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 font-bold"
                                      : val >= 1
                                      ? "bg-teal-100 dark:bg-teal-800/30 text-teal-800 dark:text-teal-300 font-bold"
                                      : ""
                                  }`}
                                  title={val > 0 ? `${val} يوم` : undefined}
                                >
                                  {!isInvalid && val > 0 ? (val === 0.5 ? "½" : val) : ""}
                                </td>
                              );
                            })}
                            <td className="px-2 py-1 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40">
                              {progData?.monthTotal ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Month totals row */}
                      <tr className="bg-gray-100/80 dark:bg-gray-700/40 font-bold">
                        <td className="sticky right-0 z-10 bg-gray-100/80 dark:bg-gray-700/40 px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600 text-[10px]">
                          إجمالي الشهر
                        </td>
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
                        <td className="px-2 text-center text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-gray-700/60">
                          {monthData.monthlyDays}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Program Totals Table */}
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
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200" style={{ borderRight: `3px solid ${color}` }}>
                          {at.program}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{at.totalDays}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400">{at.targetDays || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
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

function ArchiveTab({
  state,
  dispatch,
  showToast,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
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
        <svg className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد بيانات للسنوات السابقة</p>
        <p className="text-gray-400 text-xs mt-1">ستظهر السنوات هنا بعد إضافة جلسات تدريبية</p>
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
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{fy}</h3>
            {fy === currentFY && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">السنة الحالية</span>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { dispatch({ type: "SET_TIMETABLE", data: null, year: fy }); dispatch({ type: "SET_TAB", tab: "timetable" }); }}
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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Hours
            </button>
            <button
              onClick={() => handleExport(fy, "timetable")}
              className="flex-1 py-1.5 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 text-teal-700 dark:text-teal-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Timetable
            </button>
          </div>
        </div>
      ))}
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
        page: p,
        limit: 20,
        sort: flt.sort,
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
    if (state.activeTab === "tracking") {
      loadSessions(page);
    }
  }, [state.activeTab, state.sessionsFilters, page, loadSessions]);

  // ── Timetable effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "timetable" && !state.timetableData) {
      loadTimetable(state.timetableYear);
    }
  }, [state.activeTab, state.timetableYear, state.timetableData, loadTimetable]);

  // ── Timetable year change ──────────────────────────────────────────────────
  useEffect(() => {
    if (state.activeTab === "timetable" && state.timetableData === null) {
      loadTimetable(state.timetableYear);
    }
  }, [state.timetableYear, state.activeTab, state.timetableData, loadTimetable]);

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
  ];

  return (
    <div className="pb-12 bg-gray-50 dark:bg-gray-950" dir="rtl">
      {/* Toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 animate-fade-in ${
              t.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
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
        <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => dispatch({ type: "SET_TAB", tab: tab.key })}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                state.activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
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
