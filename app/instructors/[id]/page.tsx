"use client";

import React, { useEffect, useReducer, useState, use } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import RouteGuard from "@/components/RouteGuard";
import CustomSelect from "@/components/ui/CustomSelect";
import { instructorsAPI } from "@/lib/api";
import type {
  IInstructor,
  InstructorDashboardData,
  PeriodType,
  UpdateInstructorData,
  UpdateRatesData,
} from "@/lib/types/instructors";

const PROGRAM_COLORS: Record<string, string> = {
  "Career Development": "#3b82f6", // blue
  "Tech": "#8b5cf6",               // purple
  "Freelancing": "#10b981",        // emerald
  "Entrepreneurship": "#f59e0b",   // amber
  "Awareness event": "#f43f5e",    // rose
  "Hackathons / Competitions": "#06b6d4", // cyan
  "Acceleration program": "#6366f1", // indigo
  "Incubation": "#14b8a6",         // teal
};

const ALL_PROGRAMS = [
  "Career Development",
  "Tech",
  "Freelancing",
  "Entrepreneurship",
  "Acceleration program",
  "Incubation",
];
const PROGRAM_OPTIONS = ALL_PROGRAMS.map((p) => ({ value: p, label: p }));

function generateAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const colors = [
    "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  ];
  return colors[index];
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`;
  }
  return words[0]?.[0] || "?";
}

type State = {
  instructor: IInstructor | null;
  dashboard: InstructorDashboardData | null;
  selectedPeriod: PeriodType;
  loading: boolean;
  dashboardLoading: boolean;
  editModalOpen: boolean;
  ratesModalOpen: boolean;
  deleteConfirmOpen: boolean;
};

type Action =
  | { type: "INIT_FETCH" }
  | { type: "FETCH_SUCCESS"; payload: IInstructor }
  | { type: "DASHBOARD_FETCH"; period: PeriodType }
  | { type: "DASHBOARD_SUCCESS"; payload: InstructorDashboardData }
  | { type: "TOGGLE_MODAL"; modal: "edit" | "rates" | "delete"; isOpen: boolean }
  | { type: "SET_ERROR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_FETCH":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, instructor: action.payload };
    case "DASHBOARD_FETCH":
      return { ...state, dashboardLoading: true, selectedPeriod: action.period };
    case "DASHBOARD_SUCCESS":
      return { ...state, dashboardLoading: false, dashboard: action.payload };
    case "TOGGLE_MODAL":
      return {
        ...state,
        editModalOpen: action.modal === "edit" ? action.isOpen : state.editModalOpen,
        ratesModalOpen: action.modal === "rates" ? action.isOpen : state.ratesModalOpen,
        deleteConfirmOpen: action.modal === "delete" ? action.isOpen : state.deleteConfirmOpen,
      };
    case "SET_ERROR":
      return { ...state, loading: false, dashboardLoading: false };
    default:
      return state;
  }
}

const initialState: State = {
  instructor: null,
  dashboard: null,
  selectedPeriod: "year",
  loading: true,
  dashboardLoading: true,
  editModalOpen: false,
  ratesModalOpen: false,
  deleteConfirmOpen: false,
};

export default function InstructorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RouteGuard allowedRoles={["admin", "employee", "accountant"]}>
      <InstructorProfileContent params={params} />
    </RouteGuard>
  );
}

function InstructorProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useRequireAuth(["admin", "employee", "accountant"]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [editData, setEditData] = useState<{ name: string; specializations: string[] }>({ name: "", specializations: [] });
  const [ratesData, setRatesData] = useState<{ dailyTrainingRate: string; dailyConsultationRate: string; graduationYear: string; cvLink: string }>({
    dailyTrainingRate: "", dailyConsultationRate: "", graduationYear: "", cvLink: ""
  });

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const isAccountant = user?.role === "accountant";
  const canSeeRates = isAdmin || isAccountant;
  const canEditInfo = isAdmin || isEmployee;
  const canEditRates = isAdmin || isAccountant;
  const canDelete = isAdmin || isEmployee;

  const fetchProfile = async (silent = false) => {
    if (!silent) dispatch({ type: "INIT_FETCH" });
    try {
      const res = await instructorsAPI.get(id);
      if (res.data.success) {
        dispatch({ type: "FETCH_SUCCESS", payload: res.data.data });
      } else {
        router.push("/instructors");
      }
    } catch {
      if (!silent) router.push("/instructors");
    }
  };




  // PERF FIX 3 — Parallelize instructor profile + dashboard fetch
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      dispatch({ type: "INIT_FETCH" });
      dispatch({ type: "DASHBOARD_FETCH", period: state.selectedPeriod });
      
      try {
        const [profileRes, dashboardRes] = await Promise.all([
          instructorsAPI.get(id),
          instructorsAPI.getDashboard(id, state.selectedPeriod),
        ]);
        if (cancelled) return;
        
        if (profileRes.data.success) {
          dispatch({ type: "FETCH_SUCCESS", payload: profileRes.data.data });
        } else {
          router.push("/instructors");
          return;
        }
        
        if (dashboardRes.data?.data) {
          dispatch({ type: "DASHBOARD_SUCCESS", payload: dashboardRes.data.data });
        }
      } catch {
        if (!cancelled) {
          router.push("/instructors");
        }
      }
    }

    loadInitial();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!state.instructor) return; // skip on initial mount

    let cancelled = false;
    async function refetchDashboard() {
      dispatch({ type: "DASHBOARD_FETCH", period: state.selectedPeriod });
      try {
        const res = await instructorsAPI.getDashboard(id, state.selectedPeriod);
        if (!cancelled && res.data?.data) {
          dispatch({ type: "DASHBOARD_SUCCESS", payload: res.data.data });
        }
      } catch {
        if (!cancelled) dispatch({ type: "SET_ERROR" });
      }
    }
    refetchDashboard();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedPeriod]);

  // Handlers
  const handleEditOpen = () => {
    if (state.instructor) {
      setEditData({ name: state.instructor.name, specializations: [...(state.instructor.specializations || [])] });
      dispatch({ type: "TOGGLE_MODAL", modal: "edit", isOpen: true });
    }
  };

  const handleRatesOpen = () => {
    if (state.instructor) {
      setRatesData({
        dailyTrainingRate: state.instructor.dailyTrainingRate ? String(state.instructor.dailyTrainingRate) : "",
        dailyConsultationRate: state.instructor.dailyConsultationRate ? String(state.instructor.dailyConsultationRate) : "",
        graduationYear: state.instructor.graduationYear ? String(state.instructor.graduationYear) : "",
        cvLink: state.instructor.cvLink || "",
      });
      dispatch({ type: "TOGGLE_MODAL", modal: "rates", isOpen: true });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: UpdateInstructorData = {
        name: editData.name,
        specializations: editData.specializations,
      };
      const res = await instructorsAPI.update(id, payload);
      dispatch({ type: "TOGGLE_MODAL", modal: "edit", isOpen: false });
      // Update state directly from the response to avoid a full re-fetch with spinner
      if (res.data.success && res.data.data) {
        dispatch({ type: "FETCH_SUCCESS", payload: res.data.data });
      } else {
        fetchProfile(true);
      }
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم التعديل بنجاح" }));
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: UpdateRatesData = {
        cvLink: ratesData.cvLink || undefined,
        graduationYear: ratesData.graduationYear ? parseInt(ratesData.graduationYear, 10) : null,
        dailyTrainingRate: ratesData.dailyTrainingRate ? parseFloat(ratesData.dailyTrainingRate) : 0,
        dailyConsultationRate: ratesData.dailyConsultationRate ? parseFloat(ratesData.dailyConsultationRate) : 0,
      };
      const res = await instructorsAPI.updateRates(id, payload);
      dispatch({ type: "TOGGLE_MODAL", modal: "rates", isOpen: false });
      // Update state directly from the response to avoid a full re-fetch with spinner
      if (res.data.success && res.data.data) {
        dispatch({ type: "FETCH_SUCCESS", payload: res.data.data });
      } else {
        fetchProfile(true);
      }
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم تحديث الأسعار بنجاح" }));
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await instructorsAPI.delete(id);
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم حذف المدرب بنجاح" }));
      router.push("/instructors");
    } catch (error) {
      console.error(error);
      setSubmitting(false);
    }
  };

  const handleExportProfile = async () => {
    try {
      const response = await instructorsAPI.exportProfile(id);
      const url = window.URL.createObjectURL(new Blob([response.data as Blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `instructor_${id}_profile.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to export profile", error);
    }
  };

  const handleExportSessions = async () => {
    try {
      const response = await instructorsAPI.exportSessions(id, state.selectedPeriod);
      const url = window.URL.createObjectURL(new Blob([response.data as Blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `instructor_${id}_sessions_${state.selectedPeriod}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to export sessions", error);
    }
  };

  if (state.loading || !state.instructor) {
    return (
      <div className="flex-1 bg-[#F8F8F7] dark:bg-gray-900 transition-colors flex items-center justify-center">
        <div className="animate-spin h-10 w-10 text-blue-600 border-4 border-t-transparent border-blue-200 rounded-full"></div>
      </div>
    );
  }

  const { instructor, dashboard, selectedPeriod } = state;
  const avatarColor = generateAvatarColor(instructor.name);

  return (
    <div className="flex-1 bg-[#F8F8F7] dark:bg-gray-900 transition-colors pb-12" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-4xl shrink-0 ${avatarColor}`}>
                {getInitials(instructor.name)}
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight flex items-center gap-3">
                  {instructor.name}
                  {!instructor.isActive && (
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-bold px-2.5 py-1 rounded-md">
                      غير نشط
                    </span>
                  )}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {(instructor.specializations || []).map((spec, i) => (
                    <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">
                      {spec}
                    </span>
                  ))}
                  {(instructor.specializations || []).length === 0 && (
                    <span className="text-sm text-gray-400">لا يوجد تخصص</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {canEditInfo && (
                <button
                  onClick={handleEditOpen}
                  className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  تعديل المعلومات
                </button>
              )}
              {canEditRates && (
                <button
                  onClick={handleRatesOpen}
                  className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  تعديل الأسعار
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "delete", isOpen: true })}
                  className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 p-2.5 rounded-xl transition-all"
                  aria-label="حذف المدرب"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* INFO CARDS (2x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              معلومات الملف
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">سنة التخرج</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{instructor.graduationYear || "غير محدد"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">رابط السي في</p>
                {instructor.cvLink ? (
                  <a href={instructor.cvLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate block w-full" dir="ltr">
                    {instructor.cvLink}
                  </a>
                ) : (
                  <p className="font-semibold text-gray-800 dark:text-gray-200">غير محدد</p>
                )}
              </div>
            </div>
          </div>

          {canSeeRates && (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                الأسعار
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">اليوم التدريبي:</p>
                  <p className="font-bold text-gray-900 dark:text-white">{instructor.dailyTrainingRate} ج</p>
                </div>
                <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">سعر الساعة التدريبية:</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400">{instructor.hourlyTrainingRate} ج</p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">اليوم الاستشاري:</p>
                  <p className="font-bold text-gray-900 dark:text-white">{instructor.dailyConsultationRate} ج</p>
                </div>
                <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">سعر الساعة الاستشارية:</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400">{instructor.hourlyConsultationRate} ج</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              إجمالي الخبرة
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الجلسات:</p>
                <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{dashboard?.totalSessions ?? 0}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">عدد التخصصات:</p>
                <p className="font-bold text-gray-900 dark:text-white">{(instructor.specializations || []).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              حالة الحساب
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">الحالة</p>
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                  instructor.isActive 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {instructor.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">تاريخ الإضافة</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(instructor.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PERIOD FILTER */}
        <div className="flex justify-center my-6">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 inline-flex">
            {(["month", "3months", "6months", "year"] as PeriodType[]).map((p) => {
              const labels: Record<PeriodType, string> = { month: "شهر", "3months": "3 أشهر", "6months": "6 أشهر", year: "سنة", custom: "مخصص" };
              return (
                <button
                  key={p}
                  onClick={() => dispatch({ type: "DASHBOARD_FETCH", period: p })}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedPeriod === p
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* DASHBOARD CONTENT */}
        {state.dashboardLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : dashboard ? (
          <>
            {/* STATS CARDS ROW */}
            {dashboard.totalSessions === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-lg font-bold text-gray-500 dark:text-gray-400">لا توجد جلسات في هذه الفترة</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {dashboard.totalSessions > 0 && (
                  <div className="flex-1 min-w-[160px] bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-blue-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">إجمالي الجلسات</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.totalSessions}</p>
                  </div>
                )}
                {dashboard.totalDays > 0 && (
                  <div className="flex-1 min-w-[160px] bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-purple-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">إجمالي الأيام</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.totalDays}</p>
                  </div>
                )}
                {dashboard.totalHours > 0 && (
                  <div className="flex-1 min-w-[160px] bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-teal-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">إجمالي الساعات</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboard.totalHours}</p>
                  </div>
                )}
                {dashboard.avgHoursPerSession > 0 && (
                  <div className="flex-1 min-w-[160px] bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-green-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">متوسط ساعات الجلسة</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">
                      {dashboard.avgHoursPerSession} <span className="text-sm font-semibold text-gray-400">س/جلسة</span>
                    </p>
                  </div>
                )}
                {dashboard.avgAttendeesPerSession > 0 && (
                  <div className="flex-1 min-w-[160px] bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-amber-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">متوسط الحضور</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">
                      {Math.ceil(dashboard.avgAttendeesPerSession)} <span className="text-sm font-semibold text-gray-400">متدرب/جلسة</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CHARTS & FINANCIALS */}
            {dashboard.totalSessions > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Chart A: Programs Donut */}
                {dashboard.programBreakdown.length > 0 && (
                  <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">توزيع الجلسات حسب البرنامج</h3>
                    <div className="h-64 relative">
                      {state.dashboardLoading ? (
      <div style={{ height: "100%", width: "100%" }} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg absolute inset-0" />
    ) : dashboard ? (
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                        <PieChart>
                          <Pie
                            data={dashboard.programBreakdown}
                            dataKey="sessions"
                            nameKey="program"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            stroke="none"
                          >
                            {dashboard.programBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[entry.program] || "#64748b"} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              borderRadius: '12px', 
                              border: '1px solid rgba(75, 85, 99, 0.3)', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                              color: '#f3f4f6',
                              direction: 'rtl'
                            }}
                            itemStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                            labelStyle={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: '4px' }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any, name: any, props: any) => {
                              const amountText = canSeeRates && props.payload.totalAmount > 0 
                                ? ` | ${props.payload.totalAmount} ج` 
                                : '';
                              return [`${value} جلسة (${props.payload.hours} ساعة)${amountText}`, name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
    ) : null}
                      {/* Center Total */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-gray-800 dark:text-gray-200">{dashboard.totalSessions}</span>
                        <span className="text-xs text-gray-500 font-bold">جلسة</span>
                      </div>
                    </div>
                    {/* Legend */}
                    {dashboard.programBreakdown.length > 1 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {dashboard.programBreakdown.map((b, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROGRAM_COLORS[b.program] || "#64748b" }}></span>
                            {b.program}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Chart B: Online vs Offline */}
                  {(dashboard.onlineCount > 0 || dashboard.offlineCount > 0) && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">أونلاين مقابل أوفلاين</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-teal-700 dark:text-teal-400">أونلاين ({dashboard.onlineCount} جلسة)</span>
                            <span className="text-teal-700 dark:text-teal-400">{dashboard.onlinePct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-teal-500 h-3 rounded-full" style={{ width: `${dashboard.onlinePct}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm font-bold mb-1">
                            <span className="text-gray-600 dark:text-gray-300">أوفلاين ({dashboard.offlineCount} جلسة)</span>
                            <span className="text-gray-600 dark:text-gray-300">{dashboard.offlinePct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-gray-400 dark:bg-gray-500 h-3 rounded-full" style={{ width: `${dashboard.offlinePct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  {canSeeRates && (
                    <div className="bg-gradient-to-l from-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex-1 flex flex-col justify-center">
                      <svg className="absolute left-0 bottom-0 opacity-10 w-32 h-32 -translate-x-8 translate-y-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.1-.96-2.15-1.92H8.03c.05 1.68 1.14 2.88 2.87 3.29V19h2.36v-1.67c1.67-.34 2.94-1.35 2.94-3.03-.01-2.07-1.68-2.88-3.89-3.16z" />
                      </svg>
                      <h3 className="text-teal-100 font-bold mb-1">إجمالي الاستحقاق للفترة</h3>
                      <div className="text-4xl font-black mb-4">{dashboard.periodTotalAmount} ج</div>
                      
                      <div className="flex gap-6 mt-auto">
                        <div>
                          <p className="text-teal-100 text-xs font-bold mb-1">منها تدريب</p>
                          <p className="text-xl font-bold">{dashboard.trainingAmount} ج</p>
                        </div>
                        <div>
                          <p className="text-teal-100 text-xs font-bold mb-1">منها استشارات</p>
                          <p className="text-xl font-bold">{dashboard.consultationAmount} ج</p>
                        </div>
                      </div>

                      {dashboard.periodTotalAmount === 0 && (instructor.dailyTrainingRate === 0 && instructor.dailyConsultationRate === 0) && (
                        <div className="mt-4 bg-black/20 rounded-lg p-2 text-xs font-bold">
                          الأسعار غير محددة — يرجى إضافة الأسعار لحساب الاستحقاق
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHARTS ROW 2: Type Breakdown */}
            {dashboard.totalSessions > 0 && dashboard.typeBreakdown && dashboard.typeBreakdown.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">عدد الجلسات حسب نوع التدريب</h3>
                  <div className="h-64 relative">
                    {state.dashboardLoading ? (
      <div style={{ height: "100%", width: "100%" }} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg absolute inset-0" />
    ) : dashboard ? (
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                      <BarChart data={dashboard.typeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="type" tickFormatter={(v) => v === "Consultation" ? "استشارة" : v === "Training" ? "تدريب" : v} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} 
                            contentStyle={{ 
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              borderRadius: '12px', 
                              border: '1px solid rgba(75, 85, 99, 0.3)', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                              color: '#f3f4f6',
                              direction: 'rtl'
                            }}
                            itemStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                            labelStyle={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: '4px' }}
                            labelFormatter={(label) => label === "Consultation" ? "استشارة" : label === "Training" ? "تدريب" : label}
                          />
                          <Bar dataKey="sessions" name="عدد الجلسات" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
    ) : null}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">عدد الساعات حسب نوع التدريب</h3>
                  <div className="h-64 relative">
                    {state.dashboardLoading ? (
      <div style={{ height: "100%", width: "100%" }} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg absolute inset-0" />
    ) : dashboard ? (
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                      <BarChart data={dashboard.typeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="type" tickFormatter={(v) => v === "Consultation" ? "استشارة" : v === "Training" ? "تدريب" : v} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} 
                            contentStyle={{ 
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              borderRadius: '12px', 
                              border: '1px solid rgba(75, 85, 99, 0.3)', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                              color: '#f3f4f6',
                              direction: 'rtl'
                            }}
                            itemStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                            labelStyle={{ color: '#9ca3af', fontWeight: 'bold', marginBottom: '4px' }}
                            labelFormatter={(label) => label === "Consultation" ? "استشارة" : label === "Training" ? "تدريب" : label}
                          />
                          <Bar dataKey="hours" name="عدد الساعات" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* SESSIONS TABLE */}
            {dashboard.sessions.length > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">جلسات الفترة المحددة</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">#</th>
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3 min-w-[200px]">اسم الجلسة</th>
                        <th className="px-4 py-3 whitespace-nowrap">النوع</th>
                        <th className="px-4 py-3 whitespace-nowrap">البرنامج</th>
                        <th className="px-4 py-3 text-center">الساعات</th>
                        <th className="px-4 py-3 text-center">أيام العمل</th>
                        <th className="px-4 py-3 text-center">الحضور</th>
                        <th className="px-4 py-3 text-center">الطريقة</th>
                        {canSeeRates && (
                          <>
                            <th className="px-4 py-3 text-center">سعر الوحدة</th>
                            <th className="px-4 py-3 text-left">الإجمالي</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {dashboard.sessions.map((session, index) => {
                        const isConsultation = session.isConsultation;
                        const isZeroAmount = session.sessionAmount === 0 && canSeeRates;
                        return (
                          <tr 
                            key={session._id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                              ${isConsultation ? "border-r-4 border-r-amber-400" : ""}
                              ${session.isPaid === false ? "bg-red-50/20 dark:bg-red-900/10 text-gray-400 dark:text-gray-500 hover:bg-red-50/40 dark:hover:bg-red-900/20" : (isZeroAmount ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200")}
                            `}
                          >
                            <td className="px-4 py-3 text-center font-medium">{index + 1}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {session.dateFrom === session.dateTo ? session.date : `${session.dateFrom} - ${session.dateTo}`}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {session.sessionName}
                              {session.isPaid === false && (
                                <span className="mr-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                                  غير مدفوع
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                              <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-md">
                                {session.type === "Consultation" ? "استشارة" : session.type === "Training" ? "تدريب" : session.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold">
                              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{session.programName}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{session.hours}</td>
                            <td className="px-4 py-3 text-center font-bold">{session.dayValue}</td>
                            <td className="px-4 py-3 text-center font-bold">{session.attendeesCount}</td>
                            <td className="px-4 py-3 text-center text-xs font-bold">
                              {session.mode === "online" ? (
                                <span className="text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-md">أونلاين</span>
                              ) : (
                                <span className="text-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">أوفلاين</span>
                              )}
                            </td>
                            {canSeeRates && (
                              <>
                                <td className="px-4 py-3 text-center font-medium">{session.unitRate} ج</td>
                                <td className="px-4 py-3 text-left font-bold text-teal-600 dark:text-teal-400">{session.sessionAmount} ج</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* TOTALS ROW */}
                      <tr className="bg-gray-50 dark:bg-gray-700/50 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-600">
                        <td colSpan={5} className="px-4 py-4 text-left">الإجمالي</td>
                        <td className="px-4 py-4 text-center">{dashboard.totalHours}</td>
                        <td className="px-4 py-4 text-center">{dashboard.totalDays}</td>
                        <td className="px-4 py-4 text-center">{dashboard.sessions.reduce((acc, s) => acc + s.attendeesCount, 0)}</td>
                        <td className="px-4 py-4 text-center"></td>
                        {canSeeRates && (
                          <>
                            <td className="px-4 py-4"></td>
                            <td className="px-4 py-4 text-left text-teal-600 dark:text-teal-400 text-lg">{dashboard.periodTotalAmount} ج</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXPORT BUTTONS */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleExportProfile}
                className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                تصدير ملف المدرب
              </button>
              <button
                onClick={handleExportSessions}
                disabled={dashboard.sessions.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                تصدير جلسات الفترة
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* EDIT INFO MODAL */}
      {state.editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">تعديل معلومات المدرب</h2>
              <button onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "edit", isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الاسم</label>
                <input
                  type="text" required
                  value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">التخصصات</label>
                <CustomSelect
                  multiple searchable options={PROGRAM_OPTIONS}
                  value={editData.specializations}
                  onChange={(val) => setEditData({ ...editData, specializations: val as string[] })}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "edit", isOpen: false })} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700">{submitting ? "جاري الحفظ..." : "حفظ التعديلات"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RATES MODAL */}
      {state.ratesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">تعديل الأسعار والمعلومات الإضافية</h2>
              <button onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "rates", isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleRatesSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">سنة التخرج</label>
                  <input
                    type="number" min="1900" max="2100"
                    value={ratesData.graduationYear} onChange={e => setRatesData({ ...ratesData, graduationYear: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">رابط السي في</label>
                  <input
                    type="url" dir="ltr"
                    value={ratesData.cvLink} onChange={e => setRatesData({ ...ratesData, cvLink: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">اليوم التدريبي</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={ratesData.dailyTrainingRate} onChange={e => setRatesData({ ...ratesData, dailyTrainingRate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  {ratesData.dailyTrainingRate && (
                    <p className="text-xs text-amber-600 mt-1 font-bold">الساعة: {(Number(ratesData.dailyTrainingRate)/7).toFixed(2)} ج</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">اليوم الاستشاري</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={ratesData.dailyConsultationRate} onChange={e => setRatesData({ ...ratesData, dailyConsultationRate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  {ratesData.dailyConsultationRate && (
                    <p className="text-xs text-amber-600 mt-1 font-bold">الساعة: {(Number(ratesData.dailyConsultationRate)/7).toFixed(2)} ج</p>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "rates", isOpen: false })} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/80">{submitting ? "جاري الحفظ..." : "حفظ الأسعار"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {state.deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من رغبتك في حذف هذا المدرب؟ سيتم إخفاؤه من النظام ولكن لن تحذف جلساته السابقة.</p>
            <div className="flex gap-3">
              <button onClick={() => dispatch({ type: "TOGGLE_MODAL", modal: "delete", isOpen: false })} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2.5 rounded-xl font-bold transition-colors">إلغاء</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-colors">{submitting ? "جاري..." : "نعم، احذف"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
