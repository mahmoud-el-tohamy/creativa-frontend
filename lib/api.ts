import axios from "axios";

// PERF: Expose pingServer to proactively wake up backend serverless functions
export function pingServer(): void {
  api.get("/ping").catch(() => {});
}

// PERF: Helper for cancelling in-flight requests on component unmount
export function createCancelToken() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

// TypeScript Interfaces for API Responses

export type UserRole = "admin" | "employee" | "viewer";

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  success: boolean;
  user: AppUser;
  message?: string;
}

export interface MeResponse {
  success: boolean;
  user: AppUser;
}

export interface BlacklistEntry {
  _id?: string;
  id?: string;
  name: string;
  nationalId: string;
  addedAt: string;
  addedBy: string;
  addedByName: string;
  expiresAt: string;
  isExpired: boolean;
  notes?: string;
  status: "warning" | "blacklisted";
  absences: { track: string; date: string }[];
  attendedCount: number;
}

export interface BlacklistParams {
  search?: string;
  status?: "active" | "expiring" | "all";
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest" | "name";
  page?: number;
  limit?: number;
}

export interface BlacklistListResponse {
  success: boolean;
  data: BlacklistEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkAddResponse {
  success: boolean;
  added: number;
  cleared: number;
  upgraded: number;
}

export interface CleanupResponse {
  success: boolean;
  deleted: number;
}

export interface CheckResponse {
  success: boolean;
  isBlacklisted: boolean;
  entry?: BlacklistEntry;
}

export interface UsersListResponse {
  success: boolean;
  data: AppUser[];
}

export interface CreateUserData {
  displayName: string;
  email: string;
  password?: string;
  role: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  targetId: string;
  targetName: string;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ipAddress: string;
}

export interface AuditParams {
  action?: string;
  performedBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditListResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Hours Tracking Types ─────────────────────────────────────────────────────

export type ProgramName =
  | "Career Development"
  | "Tech"
  | "Freelancing"
  | "Entrepreneurship"
  | "Awareness event"
  | "Hackathons / Competitions"
  | "Acceleration program";

export type TimetableProgram =
  | "Entrepreneurship / Technology transfer"
  | "Awareness events"
  | "Acceleration program"
  | "Freelancing coaches"
  | "Hackathons / Competitions"
  | "Career development";

export interface TrainingSession {
  _id: string;
  programName: ProgramName;
  sessionName: string;
  date: string;
  hours: number;
  mode: "online" | "offline";
  instructorId: string | null; // FIXED: FIX 3 — optional
  instructorName: string;
  attendeesCount: number;
  type: "Training" | "Awareness Event" | "Incubation" | "Consultation";
  evaluationReportUrl: string;
  trainingReportUrl: string;
  dayValue: number;
  timetableProgram: TimetableProgram;
  fiscalYear: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSessionPayload {
  programName: ProgramName;
  sessionName: string;
  date: string;
  hours: number;
  mode: "online" | "offline";
  instructorId: string; // empty string means no instructor selected
  instructorName: string;
  attendeesCount: number;
  type: "Training" | "Awareness Event" | "Incubation" | "Consultation";
  evaluationReportUrl?: string;
  trainingReportUrl?: string;
}

export interface Instructor {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface SessionsParams {
  fiscalYear?: string;
  programName?: string;
  instructorId?: string;
  dateFrom?: string;
  dateTo?: string;
  mode?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "name";
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SessionsListResponse {
  success: boolean;
  data: TrainingSession[];
  pagination: Pagination;
}

export interface IProgramDayMap {
  [day: number]: number;
  monthTotal: number;
}

export interface IMonthData {
  monthIndex: number;
  monthName: string;
  year: number;
  daysInMonth: number;
  monthlyDays: number;
  programs: Record<TimetableProgram, IProgramDayMap>;
}

export interface IAnnualTotal {
  program: TimetableProgram;
  totalDays: number;
  targetDays: number;
  completionPct: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface IQuarterlyData {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  months: string[];
  totalDays: number;
  firstHalfDays: number;
  secondHalfDays: number;
}

export interface TimetableSnapshot {
  _id: string;
  fiscalYear: string;
  months: IMonthData[];
  annualTotals: IAnnualTotal[];
  quarterly: IQuarterlyData[];
  totalDays: number;
  sessionCount: number;
  lastUpdated: string;
  lastUpdatedBy: string;
}

export interface TrainingDashboardStats {
  fiscalYear: string;
  totalTrainingDays: number;
  totalSessions: number;
  totalAttendees: number;
  totalHours: number;

  programDays: {
    program: string;
    totalDays: number;
    sessionCount: number;
    attendeesCount: number;
    totalHours: number;
  }[];

  monthlyActivity: {
    month: string;
    monthIndex: number;
    sessions: number;
    days: number;
    attendees: number;
    hours: number;
  }[];

  dailyActivity: {
    date: string;
    sessions: number;
    days: number;
    attendees: number;
    hours: number;
  }[];

  modeBreakdown: {
    online: number;
    offline: number;
    onlinePct: number;
    offlinePct: number;
  };

  topInstructors: {
    name: string;
    sessions: number;
    totalHours: number;
    totalAttendees: number;
  }[];

  typeBreakdown: {
    type: string;
    count: number;
    pct: number;
  }[];

  warningStats: {
    total: number;
    warning1: number;
    warning2: number;
    blacklistedThisMonth: number;
    clearedThisMonth: number;
  };

  attendanceRate: {
    month: string;
    registered: number;
    attended: number;
    rate: number;
  }[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; data: Record<string, unknown>; errors: string[] }>;
}

// Axios Instance Configuration

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 503 (DB cold start) — retry once after 2 seconds
    if (error.response?.status === 503 && !(originalRequest as Record<string, unknown>)._retried503) {
      (originalRequest as Record<string, unknown>)._retried503 = true;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(originalRequest);
    }
    
    // Check if error is 401 and we haven't retried yet, and it's not a login/refresh request
    if (
      error.response?.status === 401 && !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API Wrappers

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  refresh: () => api.post("/auth/refresh"),
  me: () => api.get<MeResponse>("/auth/me"),
};

export const blacklistAPI = {
  list: (params?: Record<string, unknown>) => 
    api.get<{ success: boolean; data: BlacklistEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>("/blacklist", { params }),
  addSingle: (data: { name: string; nationalId: string; notes?: string; trackName?: string }) => 
    api.post<{ success: boolean; data: BlacklistEntry }>("/blacklist", data),
  bulkAdd: (data: { absentees: { name: string; nationalId: string; notes?: string }[]; attendeesNationalIds: string[]; trackName: string }) => 
    api.post<BulkAddResponse>("/blacklist/bulk", data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/blacklist/${id}`),
  cleanup: () => api.post<{ success: boolean; deleted: number }>("/blacklist/cleanup"),
  getIds: () => api.get<Set<string>>("/blacklist/ids").then(res => {
    // Convert array back to Set
    return new Set(res.data as unknown as string[]);
  }),
  check: (nationalId: string) => api.get<{ isBlacklisted: boolean }>(`/blacklist/check/${nationalId}`)
};

export const usersAPI = {
  list: async () => {
    const res = await api.get<UsersListResponse>("/users");
    if (res.data && res.data.data) {
      res.data.data = res.data.data.map(u => ({ ...u, id: u.id || (u as unknown as { _id: string })._id }));
    }
    return res;
  },
  create: async (data: CreateUserData) => {
    const res = await api.post<{ success: boolean; data: AppUser }>("/users", data);
    if (res.data && res.data.data) {
      res.data.data.id = res.data.data.id || (res.data.data as unknown as { _id: string })._id;
    }
    return res;
  },
  changeRole: (id: string, role: string) =>
    api.patch<{ success: boolean; data: AppUser }>(`/users/${id}/role`, { role }),
  toggleActive: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: AppUser }>(`/users/${id}/active`, { isActive }), // Note: parameter isActive ignored by backend toggle, but kept for signature matching
  deleteUser: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/users/${id}/hard`),
};

export const auditAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<{ success: boolean; count: number; data: AuditLog[] }>("/audit", { params }),
};

export interface ChartDataBucket {
  label: string;
  fullLabel?: string;
  additions: number;
  cumulative: number;
  key: string;
  rawDate: Date;
}

export const dashboardAPI = {
  getStats: (range: string = "monthly") => 
    api.get<{ success: boolean; data: ChartDataBucket[] }>(`/dashboard/stats?range=${range}`),
};

// ─── Hours API ────────────────────────────────────────────────────────────────

export const hoursAPI = {
  getSessions: (params?: SessionsParams) =>
    api.get<SessionsListResponse>("/hours/sessions", { params }),

  createSession: (data: TrainingSessionPayload) =>
    api.post<{ success: boolean; data: TrainingSession }>("/hours/sessions", data),

  updateSession: (id: string, data: TrainingSessionPayload) =>
    api.put<{ success: boolean; data: TrainingSession }>(`/hours/sessions/${id}`, data),

  deleteSession: (id: string) =>
    api.delete<{ success: boolean }>(`/hours/sessions/${id}`),

  deleteMultipleSessions: (ids: string[]) =>
    api.delete<{ success: boolean; deletedCount?: number }>("/hours/sessions/bulk", { data: { ids } }),

  getInstructors: () =>
    api.get<{ success: boolean; data: Instructor[] }>("/hours/instructors"),

  addInstructor: (name: string) =>
    api.post<{ success: boolean; data: Instructor }>("/hours/instructors", { name }),

  getTimetable: (fiscalYear: string) =>
    api.get<{ success: boolean; data: TimetableSnapshot }>(`/hours/timetable/${fiscalYear}`),

  getFiscalYears: () =>
    api.get<{ success: boolean; data: string[] }>("/hours/timetable"),

  importSessions: (file: File, consultationsMap?: Record<number, string>) => {
    const fd = new FormData();
    fd.append("file", file);
    if (consultationsMap) {
      fd.append("consultationsMap", JSON.stringify(consultationsMap));
    }
    return api.post<ImportResult>("/hours/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  exportTracking: (fy: string) =>
    api.get(`/hours/export/tracking`, {
      params: { fiscalYear: fy },
      responseType: "blob"
    }),
  exportTimetable: (fy: string) =>
    api.get(`/hours/export/timetable`, {
      params: { fiscalYear: fy },
      responseType: "blob"
    }),

  getDashboardStats: (fiscalYear?: string, quarter?: string) =>
    api.get<TrainingDashboardStats>(`/hours/dashboard-stats`, { params: { fiscalYear, quarter, _t: Date.now() } }),
};

export const attendanceSheetAPI = {
  build: async (file: File): Promise<{
    blob: Blob;
    stats: { workshops: number; sessions: number; totalRows: number };
  }> => {
    const fd = new FormData();
    fd.append("file", file);
    const response = await api.post("/attendance-sheet/build", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "blob",
    });
    return {
      blob: response.data,
      stats: {
        workshops: Number(response.headers["x-stats-workshops"]),
        sessions: Number(response.headers["x-stats-sessions"]),
        totalRows: Number(response.headers["x-stats-total-rows"]),
      },
    };
  },
};

// ─── Planned Timetable API ────────────────────────────────────────────────────

import type {
  PlannedTimetableResponse,
  PlannedData,
  CellUpdatePayload,
  TimetableComparison,
} from "@/lib/types/planned";

export const plannedAPI = {
  get: (fy: string) =>
    api.get<{ success: boolean; data: PlannedTimetableResponse; exists: boolean }>(`/planned/${fy}`),

  upsert: (fy: string, data: PlannedData) =>
    api.put<{ success: boolean; data: PlannedTimetableResponse }>(`/planned/${fy}`, { data }),

  updateCell: (fy: string, payload: CellUpdatePayload) =>
    api.patch<{ success: boolean; data: PlannedTimetableResponse }>(`/planned/${fy}/cell`, payload),

  getComparison: (fy: string) =>
    api.get<{ success: boolean; data: TimetableComparison }>(`/planned/${fy}/comparison`),

  export: (fy: string) =>
    api.get(`/planned/${fy}/export`, { responseType: "blob" }),

  listYears: () =>
    api.get<{ success: boolean; data: string[] }>("/planned"),
};

