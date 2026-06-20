"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import RouteGuard from "@/components/RouteGuard";
import CustomSelect from "@/components/ui/CustomSelect";

import { instructorsAPI } from "@/lib/api";
import type { IInstructor, CreateInstructorData } from "@/lib/types/instructors";

const ALL_PROGRAMS = [
  "Career Development",
  "Tech",
  "Freelancing",
  "Entrepreneurship",
  "Acceleration program",
  "Incubation",
];

const PROGRAM_OPTIONS = ALL_PROGRAMS.map(p => ({ value: p, label: p }));

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

export default function InstructorsPage() {
  return (
    <RouteGuard allowedRoles={["admin", "employee", "accountant"]}>
      <InstructorsContent />
    </RouteGuard>
  );
}

function InstructorsContent() {
  const { user } = useRequireAuth(["admin", "employee", "accountant"]);
  
  const [instructors, setInstructors] = useState<IInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Instructor Form State
  const [formData, setFormData] = useState<{
    name: string;
    specializations: string[];
    graduationYear: string;
    cvLink: string;
    dailyTrainingRate: string;
    dailyConsultationRate: string;
  }>({
    name: "",
    specializations: [],
    graduationYear: "",
    cvLink: "",
    dailyTrainingRate: "",
    dailyConsultationRate: "",
  });

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const isAccountant = user?.role === "accountant";
  const canSeeRates = isAdmin || isAccountant;
  const canAddInstructor = isAdmin || isEmployee;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch data
  const fetchInstructors = async () => {
    await Promise.resolve(); // Prevent synchronous setState in useEffect
    setLoading(true);
    try {
      const res = await instructorsAPI.list({
        search: debouncedSearch || undefined,
        specialization: selectedSpecializations.length > 0 ? selectedSpecializations.join(",") : undefined,
        includeInactive: false,
        limit: 1000, // Fetch all for now, or implement pagination
      });
      if (res.data.success) {
        setInstructors(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch instructors", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstructors();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedSpecializations]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setSubmitting(true);
    try {
      const payload: CreateInstructorData = {
        name: formData.name.trim(),
        specializations: formData.specializations,
        cvLink: formData.cvLink.trim() || undefined,
      };
      
      if (formData.graduationYear) {
        payload.graduationYear = parseInt(formData.graduationYear, 10);
      }
      if (canSeeRates && formData.dailyTrainingRate) {
        payload.dailyTrainingRate = parseFloat(formData.dailyTrainingRate);
      }
      if (canSeeRates && formData.dailyConsultationRate) {
        payload.dailyConsultationRate = parseFloat(formData.dailyConsultationRate);
      }

      await instructorsAPI.create(payload);
      setModalOpen(false);
      setFormData({
        name: "",
        specializations: [],
        graduationYear: "",
        cvLink: "",
        dailyTrainingRate: "",
        dailyConsultationRate: "",
      });
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم إضافة المدرب بنجاح" }));
      fetchInstructors();
    } catch (error) {
      console.error("Failed to add instructor", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F7] dark:bg-gray-900 transition-colors" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-blue-900 dark:text-blue-400 mb-2 tracking-tight">المدربون</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium">إدارة قائمة المدربين وعرض بياناتهم المالية</p>
          </div>
          
          <div className="flex items-center gap-3">
            {canAddInstructor && (
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة مدرب
              </button>
            )}
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-col md:flex-row gap-4 items-center">
          
          <div className="w-full md:w-1/2 relative">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          <div className="w-full md:w-1/2">
            <CustomSelect
              multiple
              searchable
              options={PROGRAM_OPTIONS}
              value={selectedSpecializations}
              onChange={(val) => setSelectedSpecializations(val as string[])}
            />
          </div>

          {/* Reset Filters Button — visible when any filter is active */}
          {(search || selectedSpecializations.length > 0) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedSpecializations([]);
              }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50"
              title="إعادة ضبط الفلاتر"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              إعادة ضبط
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              title="عرض كشبكة"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${viewMode === "table" ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              title="عرض كجدول"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* INSTRUCTORS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse h-48"></div>
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">لا يوجد مدربون مسجلون</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">لم يتم العثور على أي مدربين يطابقون معايير البحث الخاصة بك.</p>
            {canAddInstructor && (
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 px-6 py-2.5 rounded-xl font-bold transition-all"
              >
                إضافة مدرب جديد
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {instructors.map((instructor) => {
              const avatarColor = generateAvatarColor(instructor.name);
              const initials = getInitials(instructor.name);

              return (
                <div key={instructor.id || instructor._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 relative overflow-hidden">
                  
                  {!instructor.isActive && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-md">
                        غير نشط
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${avatarColor}`}>
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={instructor.name}>
                        {instructor.name}
                      </h3>
                      {/* Specializations Pills */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(instructor.specializations || []).slice(0, 3).map((spec, i) => (
                          <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {spec}
                          </span>
                        ))}
                        {(instructor.specializations || []).length > 3 && (
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            +{(instructor.specializations || []).length - 3}
                          </span>
                        )}
                        {(instructor.specializations || []).length === 0 && (
                          <span className="text-xs text-gray-400">لا يوجد تخصص</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canSeeRates && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 mb-4 mt-auto">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400 font-medium text-xs">سعر الساعة التدريبية:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{instructor.hourlyTrainingRate > 0 ? `${instructor.hourlyTrainingRate} ج` : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium text-xs">سعر الساعة الاستشارية:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{instructor.hourlyConsultationRate > 0 ? `${instructor.hourlyConsultationRate} ج` : "—"}</span>
                      </div>
                    </div>
                  )}

                  {!canSeeRates && <div className="mt-auto pt-4" />}

                  <Link
                    href={`/instructors/${instructor.id || instructor._id}`}
                    className="mt-auto w-full text-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl font-bold transition-colors text-sm"
                  >
                    عرض الملف
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">اسم المدرب</th>
                    <th className="px-4 py-3">التخصص</th>
                    <th className="px-4 py-3 text-center">تاريخ الخبرة</th>
                    <th className="px-4 py-3 text-center">رابط السي في</th>
                    {canSeeRates && (
                      <>
                        <th className="px-4 py-3 text-center">تكلفة اليوم التدريبي</th>
                        <th className="px-4 py-3 text-center">تكلفة اليوم الاستشاري</th>
                        <th className="px-4 py-3 text-center">سعر الساعة التدريبية</th>
                        <th className="px-4 py-3 text-center">سعر الساعة الاستشارية</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {instructors.map((instructor, index) => (
                    <tr key={instructor.id || instructor._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                        <Link href={`/instructors/${instructor.id || instructor._id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {instructor.name}
                        </Link>
                        {!instructor.isActive && (
                          <span className="mr-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                            غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(instructor.specializations || []).map((spec, i) => (
                            <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              {spec}
                            </span>
                          ))}
                          {(instructor.specializations || []).length === 0 && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                        {instructor.graduationYear || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {instructor.cvLink ? (
                          <a href={instructor.cvLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors" title="عرض السيرة الذاتية">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {canSeeRates && (
                        <>
                          <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{instructor.dailyTrainingRate > 0 ? `${instructor.dailyTrainingRate} ج` : "—"}</td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{instructor.dailyConsultationRate > 0 ? `${instructor.dailyConsultationRate} ج` : "—"}</td>
                          <td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">{instructor.hourlyTrainingRate > 0 ? `${instructor.hourlyTrainingRate} ج` : "—"}</td>
                          <td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">{instructor.hourlyConsultationRate > 0 ? `${instructor.hourlyConsultationRate} ج` : "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD INSTRUCTOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة مدرب جديد</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="add-instructor-form" onSubmit={handleAddSubmit} className="space-y-5">
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الاسم <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="الاسم الثلاثي أو الرباعي"
                  />
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">التخصصات</label>
                  <CustomSelect
                    multiple
                    options={PROGRAM_OPTIONS}
                    value={formData.specializations}
                    onChange={(val) => setFormData({ ...formData, specializations: val as string[] })}
                  />
                </div>

                {/* Graduation Year */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تاريخ الخبرة (سنة التخرج)</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.graduationYear}
                    onChange={e => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="مثال: 2015"
                  />
                </div>

                {/* CV Link */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">رابط السي في</label>
                  <input
                    type="url"
                    value={formData.cvLink}
                    onChange={e => setFormData({ ...formData, cvLink: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="https://linkedin.com/in/..."
                    dir="ltr"
                  />
                </div>

                {canSeeRates && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {/* Training Rate */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تكلفة اليوم التدريبي</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.dailyTrainingRate}
                          onChange={e => setFormData({ ...formData, dailyTrainingRate: e.target.value })}
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium"
                          placeholder="0"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">ج</span>
                      </div>
                      {formData.dailyTrainingRate && !isNaN(Number(formData.dailyTrainingRate)) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-bold">
                          سعر الساعة: {(Number(formData.dailyTrainingRate) / 7).toFixed(2)} ج
                        </p>
                      )}
                    </div>

                    {/* Consultation Rate */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تكلفة اليوم الاستشاري</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.dailyConsultationRate}
                          onChange={e => setFormData({ ...formData, dailyConsultationRate: e.target.value })}
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium"
                          placeholder="0"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">ج</span>
                      </div>
                      {formData.dailyConsultationRate && !isNaN(Number(formData.dailyConsultationRate)) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-bold">
                          سعر الساعة: {(Number(formData.dailyConsultationRate) / 7).toFixed(2)} ج
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="add-instructor-form"
                disabled={submitting || !formData.name.trim()}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ المدرب"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
