import axios from "axios";

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
    
    // Check if error is 401 and we haven't retried yet, and it's not a login/refresh request
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
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
