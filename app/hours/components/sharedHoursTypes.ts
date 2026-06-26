"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  TrainingSession,
  TrainingSessionPayload,
  Instructor,
  TimetableSnapshot,
  Pagination,
  ProgramName,
  TimetableProgram,
} from "@/lib/api";
import type {
  PlannedTimetableResponse,
  PlannedData,
  TimetableComparison,
  } from "@/lib/types/planned";



// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 4) return `FY${year}-${year + 1}`;
  return `FY${year - 1}-${year}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_NAMES: ProgramName[] = [
  "Career Development",
  "Tech",
  "Freelancing",
  "Entrepreneurship",
  "Awareness event",
  "Hackathons / Competitions",
  "Acceleration program",
  "Incubation",
];

export const CONSULTATION_TARGET_PROGRAMS: ProgramName[] = [
  "Career Development",
  "Freelancing",
  "Entrepreneurship",
  "Acceleration program",
];

export const TIMETABLE_PROGRAMS: TimetableProgram[] = [
  "Entrepreneurship / Technology transfer",
  "Awareness events",
  "Acceleration program",
  "Freelancing coaches",
  "Hackathons / Competitions",
  "Career development",
];

// All programs (planned timetable supports main programs)
export const ALL_PLANNED_PROGRAMS: string[] = [
  "Entrepreneurship / Technology transfer",
  "Awareness events",
  "Acceleration program",
  "Freelancing coaches",
  "Hackathons / Competitions",
  "Career development",
];

// FY calendar months in order: May(4)→Apr(3)
export const FY_CALENDAR_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3];

export const ARABIC_MONTH_NAMES: Record<number, string> = {
  0: "يناير",
  1: "فبراير",
  2: "مارس",
  3: "أبريل",
  4: "مايو",
  5: "يونيو",
  6: "يوليو",
  7: "أغسطس",
  8: "سبتمبر",
  9: "أكتوبر",
  10: "نوفمبر",
  11: "ديسمبر",
};

export const ARABIC_MONTH_SHORT: Record<number, string> = {
  0: "يناير",
  1: "فبراير",
  2: "مارس",
  3: "أبريل",
  4: "مايو",
  5: "يونيو",
  6: "يوليو",
  7: "أغسطس",
  8: "سبتمبر",
  9: "أكتوبر",
  10: "نوفمبر",
  11: "ديسمبر",
};

export const PROGRAM_COLORS: Record<string, string> = {
  "Career Development":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Tech: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Freelancing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Entrepreneurship:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Awareness event":
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Hackathons / Competitions":
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Acceleration program":
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export const TIMETABLE_PROGRAM_COLORS: Record<string, string> = {
  "Entrepreneurship / Technology transfer": "#D9EAD3",
  "Awareness events": "#FCE5CD",
  "Acceleration program": "#CFE2F3",
  "Freelancing coaches": "#FFF2CC",
  "Hackathons / Competitions": "#EAD1DC",
  "Career development": "#D0E0E3",
  Incubation: "#E8D5F5",
  "Consultation & Mentorship": "#D5E8F5",
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case "Training":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "Awareness Event":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "Incubation":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "Consultation":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

export const getTypeLabel = (type: string) => {
  switch (type) {
    case "Training":
      return "تدريب";
    case "Awareness Event":
      return "توعوية";
    case "Incubation":
      return "احتضان";
    case "Consultation":
      return "استشارة";
    default:
      return type;
  }
};

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getCalendarYearForFYMonth(
  calMonth: number,
  startYear: number,
): number {
  return calMonth >= 4 ? startYear : startYear + 1;
}

export function parseFiscalYear(fy: string): { startYear: number; endYear: number } {
  const [s, e] = fy.replace("FY", "").split("-");
  return { startYear: parseInt(s, 10), endYear: parseInt(e, 10) };
}

// Build an empty PlannedData structure for all 8 programs
export function buildEmptyPlannedData(): PlannedData {
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
export function computeMonthlyTotal(
  data: PlannedData,
  program: string,
  calMonth: number,
): number {
  const monthData = data[program]?.[String(calMonth)] ?? {};
  return Object.values(monthData).reduce((s, v) => s + (v as number), 0);
}

// ─── State Types ──────────────────────────────────────────────────────────────

export interface SessionFilters {
  search: string;
  programName: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  fiscalYear: string;
  sort: "newest" | "oldest" | "name";
}

export interface State {
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

export type Action =
  | { type: "SET_TAB"; tab: State["activeTab"] }
  | {
      type: "SET_SESSIONS";
      sessions: TrainingSession[];
      pagination: Pagination;
    }
  | {
      type: "APPEND_SESSIONS";
      sessions: TrainingSession[];
      pagination: Pagination;
    }
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
  | {
      type: "SET_PLANNED_DATA";
      data: PlannedTimetableResponse | null;
      fy: string;
    }
  | {
      type: "UPDATE_LOCAL_CELL";
      program: string;
      monthIndex: number;
      day: number | string;
      value: number;
    }
  | { type: "MARK_SAVED" }
  | { type: "SET_DIRTY"; dirty: boolean }
  | { type: "SET_PLANNED_SAVING"; saving: boolean }
  | { type: "SET_PLANNED_LOADING"; loading: boolean }
  | { type: "SET_PLANNED_FY"; fy: string }
  // Comparison actions
  | { type: "SET_COMPARISON_DATA"; data: TimetableComparison | null }
  | { type: "SET_COMPARISON_LOADING"; loading: boolean }
  | { type: "SET_COMPARISON_FY"; fy: string };

export const INITIAL_FILTERS: SessionFilters = {
  search: "",
  programName: "",
  type: "",
  dateFrom: "",
  dateTo: "",
  fiscalYear: "",
  sort: "newest",
};

export const INITIAL_STATE: State = {
  activeTab: "tracking",
  sessions: [],
  sessionsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  sessionsFilters: INITIAL_FILTERS,
  sessionsLoading: true,
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

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_SESSIONS":
      return {
        ...state,
        sessions: action.sessions,
        sessionsPagination: action.pagination,
        sessionsLoading: false,
      };
    case "APPEND_SESSIONS":
      return {
        ...state,
        sessions: [...state.sessions, ...action.sessions],
        sessionsPagination: action.pagination,
        sessionsLoading: false,
      };
    case "SET_SESSIONS_LOADING":
      return { ...state, sessionsLoading: action.loading };
    case "SET_FILTER":
      return {
        ...state,
        sessionsFilters: {
          ...state.sessionsFilters,
          [action.key]: action.value,
        },
        sessionsPagination: { ...state.sessionsPagination, page: 1 },
      };
    case "RESET_FILTERS":
      return {
        ...state,
        sessionsFilters: INITIAL_FILTERS,
        sessionsPagination: { ...state.sessionsPagination, page: 1 },
      };
    case "OPEN_MODAL":
      return {
        ...state,
        modalOpen: true,
        editingSession: action.session ?? null,
      };
    case "CLOSE_MODAL":
      return { ...state, modalOpen: false, editingSession: null };
    case "SET_INSTRUCTORS":
      return { ...state, instructors: action.instructors };
    case "SET_TIMETABLE":
      return {
        ...state,
        timetableData: action.data,
        timetableYear: action.year,
        timetableLoading: false,
      };
    case "SET_TIMETABLE_LOADING":
      return { ...state, timetableLoading: action.loading };
    case "SET_FISCAL_YEARS":
      return { ...state, fiscalYears: action.years };
    case "SET_ERROR":
      return { ...state, error: action.error };
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
            ...(state.localPlan[action.program]?.[String(action.monthIndex)] ??
              {}),
            [String(action.day)]: action.value,
          },
        },
      };
      return { ...state, localPlan: newPlan, isDirty: true };
    }
    case "MARK_SAVED":
      return {
        ...state,
        savedPlan: state.localPlan,
        isDirty: false,
        plannedSaving: false,
      };
    case "SET_DIRTY":
      return { ...state, isDirty: action.dirty };
    case "SET_PLANNED_SAVING":
      return { ...state, plannedSaving: action.saving };
    case "SET_PLANNED_LOADING":
      return { ...state, plannedLoading: action.loading };
    case "SET_PLANNED_FY":
      return {
        ...state,
        selectedPlannedFY: action.fy,
        plannedData: null,
        localPlan: null,
        savedPlan: null,
        isDirty: false,
      };
    // Comparison
    case "SET_COMPARISON_DATA":
      return {
        ...state,
        comparisonData: action.data,
        comparisonLoading: false,
      };
    case "SET_COMPARISON_LOADING":
      return { ...state, comparisonLoading: action.loading };
    case "SET_COMPARISON_FY":
      return {
        ...state,
        selectedComparisonFY: action.fy,
        comparisonData: null,
      };
    default:
      return state;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Session Modal ────────────────────────────────────────────────────────────


export const EMPTY_FORM: TrainingSessionPayload = {
  programName: "Career Development",
  sessionName: "",
  date: "",
  hours: 6,
  mode: "online",
  isPaid: true,
  instructorId: "",
  instructorName: "",
  attendeesCount: 0,
  type: "Training",
  evaluationReportUrl: "",
  trainingReportUrl: "",
};
