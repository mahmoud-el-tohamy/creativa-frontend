"use client";

import React, { useReducer, useEffect, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type * as XLSX from "xlsx";
import CustomSelect from "@/components/ui/CustomSelect";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { hoursAPI, TrainingSession, TrainingSessionPayload, Instructor, ProgramName } from "@/lib/api";
import type {
  } from "@/lib/types/planned";

import axios from "axios";
import { getCurrentFiscalYear, formatDate, downloadBlob, PROGRAM_NAMES, CONSULTATION_TARGET_PROGRAMS, PROGRAM_COLORS, getTypeColor, getTypeLabel, INITIAL_STATE, reducer, EMPTY_FORM } from "./sharedHoursTypes";

interface SessionModalProps {
  open: boolean;
  editing: TrainingSession | null;
  instructors: Instructor[];
  onClose: () => void;
  onSaved: () => void;
  onAddInstructor: (name: string) => Promise<Instructor>;
  showToast: (msg: string, type: "success" | "error") => void;
}

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
  const [errors, setErrors] = useState<
    Partial<Record<keyof TrainingSessionPayload, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [addingInstructor, setAddingInstructor] = useState(false);
  const [newInstructorName, setNewInstructorName] = useState("");
  const [savingInstructor, setSavingInstructor] = useState(false);

  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("16:00");

  const handleTimeChange = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    if (start && end) {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let diff = endH * 60 + endM - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60;
      const hours = Number((diff / 60).toFixed(2));
      setForm((f) => ({ ...f, hours }));
    }
  };

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
          isPaid: editing.isPaid ?? true,
          instructorId: editing.instructorId ?? "",
          instructorName: editing.instructorName,
          attendeesCount: editing.attendeesCount,
          type: editing.type,
          evaluationReportUrl: editing.evaluationReportUrl ?? "",
          trainingReportUrl: editing.trainingReportUrl ?? "",
        });
        setStartTime("");
        setEndTime("");
      } else {
        setForm(EMPTY_FORM);
        setStartTime("10:00");
        setEndTime("16:00");
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
    if (!form.hours || form.hours < 0.5 || form.hours > 24)
      e.hours = "يجب أن تكون الساعات بين 0.5 و 24";
    if (!form.type) e.type = "اختر النوع";
    if (
      form.evaluationReportUrl &&
      !/^https?:\/\/.+/.test(form.evaluationReportUrl)
    )
      e.evaluationReportUrl = "رابط غير صالح";
    if (
      form.trainingReportUrl &&
      !/^https?:\/\/.+/.test(form.trainingReportUrl)
    )
      e.trainingReportUrl = "رابط غير صالح";
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
      setForm((f) => ({
        ...f,
        instructorId: instr._id,
        instructorName: instr.name,
      }));
      setAddingInstructor(false);
      setNewInstructorName("");
    } catch {
      showToast("فشل إضافة المدرب", "error");
    } finally {
      setSavingInstructor(false);
    }
  };

  const instructorOptions = useMemo(
    () => [
      { value: "", label: "لا مدرب" },
      ...instructors.map((i) => ({ value: i._id, label: i.name })),
      { value: "__add__", label: "+ إضافة مدرب جديد" },
    ],
    [instructors],
  );

  const dayValueBadge = form.hours < 5 ? "نصف يوم (0.5)" : "يوم كامل (1.0)";
  const dayValueColor =
    form.hours < 5
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editing ? "تعديل الجلسة التدريبية" : "إضافة تدريب جديد"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 overflow-y-auto max-h-[75vh] space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                اسم البرنامج *
              </label>
              <CustomSelect
                value={
                  form.type === "Consultation"
                    ? "Consultation"
                    : form.programName
                }
                options={[
                  ...PROGRAM_NAMES.map((p) => ({ value: p, label: p })),
                  { value: "Consultation", label: "Consultation" },
                ]}
                onChange={(v) => {
                  const val = v as ProgramName | "Consultation";
                  setForm((f) => {
                    const nextForm = { ...f };
                    if (val === "Consultation") {
                      nextForm.programName =
                        CONSULTATION_TARGET_PROGRAMS.includes(f.programName)
                          ? f.programName
                          : "Career Development";
                      nextForm.type = "Consultation";
                    } else {
                      nextForm.programName = val;
                      if (val === "Awareness event") {
                        nextForm.type = "Awareness Event";
                      } else if (val === "Incubation") {
                        nextForm.type = "Incubation";
                      } else if (f.type === "Consultation") {
                        nextForm.type = "Training";
                      }
                    }
                    return nextForm;
                  });
                }}
              />
              {errors.programName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.programName}
                </p>
              )}
            </div>
            {form.type === "Consultation" ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  البرنامج المستهدف *
                </label>
                <CustomSelect
                  value={form.programName}
                  options={CONSULTATION_TARGET_PROGRAMS.map((p) => ({
                    value: p,
                    label: p,
                  }))}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, programName: v as ProgramName }))
                  }
                />
                {errors.type && (
                  <p className="text-xs text-red-500 mt-1">{errors.type}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  النوع *
                </label>
                <CustomSelect
                  value={form.type}
                  disabled={
                    form.programName === "Awareness event" ||
                    form.programName === "Incubation"
                  }
                  options={[
                    { value: "Training", label: "تدريب" },
                    { value: "Awareness Event", label: "فعالية توعوية" },
                    { value: "Incubation", label: "احتضان" },
                  ]}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as "Training" | "Awareness Event" | "Incubation",
                    }))
                  }
                />
                {errors.type && (
                  <p className="text-xs text-red-500 mt-1">{errors.type}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اسم الجلسة *
            </label>
            <input
              type="text"
              value={form.sessionName}
              onChange={(e) =>
                setForm((f) => ({ ...f, sessionName: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل اسم الجلسة..."
            />
            {errors.sessionName && (
              <p className="text-xs text-red-500 mt-1">{errors.sessionName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التاريخ *
              </label>
              <input
                type="date"
                value={form.date}
                max={(() => {
                  const now = new Date();
                  // Allow up to the last day of next month
                  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                  return nextMonth.toISOString().split("T")[0];
                })()}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>
            <div className="sm:col-span-5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التوقيت (من - إلى)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange(e.target.value, endTime)}
                  className="w-full px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500 font-bold">-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange(startTime, e.target.value)}
                  className="w-full px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                عدد الساعات *
              </label>
              <input
                type="number"
                value={form.hours}
                disabled
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm focus:outline-none"
              />
              {errors.hours && (
                <p className="text-xs text-red-500 mt-1">{errors.hours}</p>
              )}
              {form.hours > 0 && (
                <span
                  className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${dayValueColor}`}
                >
                  = {dayValueBadge}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                طريقة التدريب
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${!form.mode || form.mode === "offline" ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}`}
                >
                  أوفلاين
                </span>
                <ToggleSwitch
                  checked={form.mode === "online"}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      mode: f.mode === "online" ? "offline" : "online",
                    }))
                  }
                  title="أونلاين / أوفلاين"
                />
                <span
                  className={`text-sm font-medium ${form.mode === "online" ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}
                >
                  أونلاين
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                مدفوع / غير مدفوع
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${!form.isPaid ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}
                >
                  غير مدفوع
                </span>
                <ToggleSwitch
                  checked={form.isPaid}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      isPaid: !f.isPaid,
                    }))
                  }
                  title="مدفوع / غير مدفوع"
                />
                <span
                  className={`text-sm font-medium ${form.isPaid ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}
                >
                  مدفوع
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                عدد الحضور
              </label>
              <input
                type="number"
                value={form.attendeesCount}
                min={0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    attendeesCount: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                المدرب (اختياري)
              </label>
              <CustomSelect
                value={form.instructorId}
                options={instructorOptions}
                searchable={true}
                onChange={(v) => {
                  if (v === "__add__") {
                    setAddingInstructor(true);
                  } else {
                    const instr = instructors.find((i) => i._id === v);
                    setForm((f) => ({
                      ...f,
                      instructorId: v,
                      instructorName: instr?.name ?? "",
                    }));
                    setAddingInstructor(false);
                  }
                }}
              />
              {errors.instructorId && (
                <p className="text-xs text-red-500 mt-1">{errors.instructorId}</p>
              )}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رابط تقرير التقييم
              </label>
              <input
                type="url"
                value={form.evaluationReportUrl}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    evaluationReportUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.evaluationReportUrl && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.evaluationReportUrl}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رابط تقرير التدريب
              </label>
              <input
                type="url"
                value={form.trainingReportUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trainingReportUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.trainingReportUrl && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.trainingReportUrl}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {submitting
                ? "جاري الحفظ..."
                : editing
                  ? "حفظ التعديلات"
                  : "إضافة الجلسة"}
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
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
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            تأكيد
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          {message ||
            "هل تريد حذف هذا التدريب؟ لا يمكن التراجع عن هذا الإجراء."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors"
          >
            {loading ? "جاري..." : "تأكيد"}
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

// ─── Import Modal Helpers ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  programName: "اسم البرنامج",
  hours: "عدد الساعات",
  mode: "نمط التدريب",
  attendeesCount: "عدد الحضور",
  type: "نوع الجلسة",
  evaluationReportUrl: "رابط تقرير التقييم",
  trainingReportUrl: "رابط تقرير التدريب والاستشارات",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  mode: { online: "أونلاين", offline: "حضوري" },
  type: {
    Training: "تدريب",
    "Awareness Event": "فعالية توعية",
    Incubation: "احتضان",
    Consultation: "استشارة",
  },
};

const formatValue = (field: string, val: unknown): string => {
  if (val === null || val === undefined || val === "") return "[فارغ]";
  if (typeof val === "boolean") return val ? "نعم" : "لا";
  const value = String(val);
  return VALUE_LABELS[field]?.[value] ?? value;
};

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ConsultationReviewRow {
  rowIdx: number;
  sessionName: string;
  date: string;
  targetProgram: ProgramName | "";
}

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
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; errors: string[] }>;
    updatedDetails?: Array<{
      row: number;
      sessionName: string;
      date: string;
      instructorName: string;
      changes: Array<{ field: string; old: unknown; new: unknown }>;
    }>;
    unchangedDuplicates?: Array<{
      row: number;
      sessionName: string;
      date: string;
      instructorName: string;
    }>;
  } | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [consultationsToReview, setConsultationsToReview] = useState<
    ConsultationReviewRow[] | null
  >(null);
  const [workbookCache, setWorkbookCache] = useState<XLSX.WorkBook | null>(
    null,
  );
  const [applyToAllTarget, setApplyToAllTarget] = useState<ProgramName | "">(
    "",
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFile(null);
      setResult(null);
      setConsultationsToReview(null);
      setWorkbookCache(null);
      setApplyToAllTarget("");
      setShowUpdates(false);
      setShowDuplicates(false);
    }
  }, [open]);

  const handleFile = async (f: File) => {
    // PERF FIX 1 — Dynamic import for xlsx
    const XLSX: typeof import("xlsx") = await import("xlsx");
    setFile(f);
    setResult(null);
    setConsultationsToReview(null);
    setWorkbookCache(null);
    setApplyToAllTarget("");
    setAnalyzing(true);
    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: true,
        cellHTML: false,
        cellFormula: true,
      });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const sheetRange = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
      const COLUMN_ALIASES: Record<string, string[]> = {
        programName: ["program name", "program"],
        sessionName: ["session name", "session"],
        date: ["date"],
        type: ["type"],
      };
      const allAliasesFlat = new Set(
        Object.values(COLUMN_ALIASES)
          .flat()
          .map((a) => a.trim().toLowerCase()),
      );

      let headerRowIndex = -1;
      let bestMatchCount = 0;
      for (
        let r = sheetRange.s.r;
        r <= Math.min(sheetRange.s.r + 4, sheetRange.e.r);
        r++
      ) {
        let matchCount = 0;
        for (let c = sheetRange.s.c; c <= sheetRange.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          if (
            cell &&
            cell.v &&
            allAliasesFlat.has(String(cell.v).trim().toLowerCase())
          ) {
            matchCount++;
          }
        }
        if (matchCount > bestMatchCount) {
          bestMatchCount = matchCount;
          headerRowIndex = r;
        }
      }

      if (headerRowIndex === -1) {
        setWorkbookCache(workbook);
        setAnalyzing(false);
        return;
      }

      const headerToColIndex: Record<string, number> = {};
      for (let c = sheetRange.s.c; c <= sheetRange.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
        if (cell && cell.v) {
          headerToColIndex[String(cell.v).trim().toLowerCase()] = c;
        }
      }

      const getFieldColIndex = (field: string): number => {
        for (const alias of COLUMN_ALIASES[field] || []) {
          const idx = headerToColIndex[alias.trim().toLowerCase()];
          if (idx !== undefined) return idx;
        }
        return -1;
      };

      const progCol = getFieldColIndex("programName");
      const typeCol = getFieldColIndex("type");
      const nameCol = getFieldColIndex("sessionName");
      const dateCol = getFieldColIndex("date");

      const toReview: ConsultationReviewRow[] = [];
      const firstDataRow = headerRowIndex + 1;

      for (let r = firstDataRow; r <= sheetRange.e.r; r++) {
        const progCell =
          progCol >= 0
            ? sheet[XLSX.utils.encode_cell({ r, c: progCol })]
            : null;
        const typeCell =
          typeCol >= 0
            ? sheet[XLSX.utils.encode_cell({ r, c: typeCol })]
            : null;
        const nameCell =
          nameCol >= 0
            ? sheet[XLSX.utils.encode_cell({ r, c: nameCol })]
            : null;
        const dateCell =
          dateCol >= 0
            ? sheet[XLSX.utils.encode_cell({ r, c: dateCol })]
            : null;

        const progVal = String(progCell?.v ?? "")
          .trim()
          .toLowerCase();
        const typeVal = String(typeCell?.v ?? "")
          .trim()
          .toLowerCase();

        if (
          typeVal.includes("consult") ||
          progVal.includes("consult") ||
          typeVal.includes("استشارة") ||
          progVal.includes("استشارة")
        ) {
          const rawDate = dateCell?.v;
          let dateStr = "";
          if (rawDate instanceof Date) {
            dateStr = rawDate.toLocaleDateString("en-US");
          } else {
            dateStr = String(rawDate ?? "");
          }
          toReview.push({
            rowIdx: r,
            sessionName: String(nameCell?.v ?? "بدون اسم"),
            date: dateStr,
            targetProgram: "",
          });
        }
      }

      setWorkbookCache(workbook);
      if (toReview.length > 0) {
        setConsultationsToReview(toReview);
      }
    } catch (err) {
      console.error("Error analyzing excel:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !workbookCache) return;
    setLoading(true);
    try {
      let consultationsMap: Record<number, string> | undefined = undefined;

      if (consultationsToReview && consultationsToReview.length > 0) {
        consultationsMap = {};
        for (const reviewRow of consultationsToReview) {
          consultationsMap[reviewRow.rowIdx] = reviewRow.targetProgram;
        }
      }

      const res = await hoursAPI.importSessions(file, consultationsMap);
      setResult({
        imported: res.data.imported,
        updated: res.data.updated,
        skipped: res.data.skipped,
        errors: res.data.errors,
        updatedDetails: res.data.updatedDetails,
        unchangedDuplicates: res.data.unchangedDuplicates,
      });
      setShowUpdates(
        res.data.updated > 0 || Boolean(res.data.updatedDetails?.length),
      );
      setShowDuplicates(false);
      if (res.data.imported > 0 || res.data.updated > 0) {
        showToast(
          `تم الاستيراد بنجاح: إضافة ${res.data.imported} وتحديث ${res.data.updated} جلسة.`,
          "success",
        );
        onImported();
      }
    } catch (err: unknown) {
      const errMsg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
          ? err.message
          : "فشل الاستيراد";
      showToast(`فشل الاستيراد: ${errMsg}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const canUpload =
    file &&
    !analyzing &&
    (!consultationsToReview ||
      consultationsToReview.every((r) => r.targetProgram));

  const updatedDetails = result?.updatedDetails ?? [];
  const missingUpdatedDetailsCount = result
    ? Math.max(result.updated - updatedDetails.length, 0)
    : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/90 backdrop-blur">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            استيراد من Excel
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
          >
            <svg
              className="w-10 h-10 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            {analyzing ? (
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                جاري فحص الملف...
              </p>
            ) : file ? (
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {file.name}
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  اسحب الملف هنا أو انقر للاختيار
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx أو .xls فقط</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
            />
          </div>

          {file && !analyzing && (
            <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-4 flex items-center justify-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>{" "}
              تم اختيار: {file.name}
            </p>
          )}

          {consultationsToReview && consultationsToReview.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="text-blue-600 dark:text-blue-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <h3 className="font-bold text-blue-800 dark:text-blue-300">
                  جلسات الاستشارة المكتشفة ({consultationsToReview.length})
                </h3>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-4">
                يحتوي الملف على جلسات استشارة. يرجى تحديد البرنامج المستهدف لكل
                جلسة لإكمال الاستيراد.
              </p>

              <div className="mb-4 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    تطبيق على الكل:
                  </label>
                  <div className="relative">
                    <select
                      value={applyToAllTarget}
                      onChange={(e) => {
                        const val = e.target.value as ProgramName | "";
                        setApplyToAllTarget(val);
                        if (consultationsToReview) {
                          setConsultationsToReview(
                            consultationsToReview.map((r) => ({
                              ...r,
                              targetProgram: val,
                            })),
                          );
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">اختر برنامج</option>
                      {CONSULTATION_TARGET_PROGRAMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {consultationsToReview.map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <p
                        className="text-sm font-bold text-gray-900 dark:text-white truncate"
                        title={row.sessionName}
                      >
                        {row.sessionName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{row.date}</p>
                    </div>
                    <div className="w-full md:w-48 shrink-0 relative">
                      <select
                        value={row.targetProgram}
                        onChange={(e) => {
                          const newRows = [...consultationsToReview];
                          newRows[idx].targetProgram = e.target.value as
                            | ProgramName
                            | "";
                          setConsultationsToReview(newRows);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">اختر برنامج</option>
                        {CONSULTATION_TARGET_PROGRAMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!consultationsToReview && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                أعمدة الملف المتوقعة:
              </p>
              <div className="flex flex-wrap gap-1">
                {[
                  "Program Name",
                  "Session Name",
                  "Date",
                  "No. of Hrs",
                  "Online/Offline",
                  "Instructor",
                  "No. of Attendees",
                  "Type",
                ].map((col) => (
                  <span
                    key={col}
                    className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-gray-600 dark:text-gray-300"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30 rounded-xl p-3">
                  <span className="block text-xl font-black text-green-600 dark:text-green-400">
                    {result.imported}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    جلسات جديدة
                  </span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-xl p-3">
                  <span className="block text-xl font-black text-blue-600 dark:text-blue-400">
                    {result.updated}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    جلسات محدثة
                  </span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3">
                  <span className="block text-xl font-black text-amber-600 dark:text-amber-400">
                    {result.skipped}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    أخطاء متخطاة
                  </span>
                </div>
              </div>

              {/* Updated details */}
              {result.updated > 0 && (
                <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl overflow-hidden bg-white dark:bg-gray-900/40">
                  <button
                    type="button"
                    onClick={() => setShowUpdates(!showUpdates)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-blue-50/80 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-right"
                  >
                    <span className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="flex items-center gap-1.5 font-bold text-sm text-blue-900 dark:text-blue-200">
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            showUpdates ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        الصفوف المحدثة ({result.updated})
                      </span>
                      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300/80">
                        رقم الصف والقيم التي تغيرت في كل جلسة
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">
                      {result.updated} تحديث
                    </span>
                  </button>

                  {showUpdates && (
                    <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800">
                      {updatedDetails.map((item, idx) => (
                        <div
                          key={`${item.row}-${idx}`}
                          className="p-3 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                  صف {item.row}
                                </span>
                                <span className="max-w-full break-words text-sm font-bold text-gray-900 dark:text-white">
                                  {item.sessionName}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                <span>{formatDate(item.date)}</span>
                                <span className="hidden sm:inline">|</span>
                                <span>{item.instructorName}</span>
                              </div>
                            </div>
                            <span className="w-fit rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {item.changes.length} حقول تغيرت
                            </span>
                          </div>

                          <div className="space-y-2 border-r-2 border-blue-500 pr-3">
                            {item.changes.map((ch, cIdx) => {
                              const oldValue = formatValue(ch.field, ch.old);
                              const newValue = formatValue(ch.field, ch.new);
                              return (
                                <div
                                  key={cIdx}
                                  className="rounded-lg border border-gray-200 bg-gray-50/80 p-2 dark:border-gray-800 dark:bg-gray-950/30"
                                >
                                  <div className="mb-2 text-[11px] font-black text-blue-700 dark:text-blue-300">
                                    {FIELD_LABELS[ch.field] || ch.field}
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="min-w-0 rounded-md bg-red-50 px-2 py-1.5 dark:bg-red-950/20">
                                      <span className="mb-0.5 block text-[10px] font-bold text-red-700 dark:text-red-300">
                                        قبل
                                      </span>
                                      <span
                                        className="block break-words text-[11px] font-semibold text-red-700 line-through [overflow-wrap:anywhere] dark:text-red-300"
                                        title={oldValue}
                                      >
                                        {oldValue}
                                      </span>
                                    </div>
                                    <div className="min-w-0 rounded-md bg-green-50 px-2 py-1.5 dark:bg-green-950/20">
                                      <span className="mb-0.5 block text-[10px] font-bold text-green-700 dark:text-green-300">
                                        بعد
                                      </span>
                                      <span
                                        className="block break-words text-[11px] font-black text-green-700 [overflow-wrap:anywhere] dark:text-green-300"
                                        title={newValue}
                                      >
                                        {newValue}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {missingUpdatedDetailsCount > 0 && (
                        <div className="m-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                          تم تحديث {missingUpdatedDetailsCount} صف، لكن الخادم
                          لم يرجع تفاصيل التغييرات لهذه الصفوف. أعد تشغيل الباك
                          إند المحلي ثم جرّب الاستيراد مرة أخرى لعرض القيم قبل
                          وبعد.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Unchanged duplicates */}
              {result.unchangedDuplicates &&
                result.unchangedDuplicates.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowDuplicates(!showDuplicates)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-xs text-gray-800 dark:text-gray-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            showDuplicates ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        الصفوف المتكررة والمطابقة بالكامل (
                        {result.unchangedDuplicates.length})
                      </span>
                    </button>

                    {showDuplicates && (
                      <div className="p-3 bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800 max-h-52 overflow-y-auto custom-scrollbar space-y-1">
                        {result.unchangedDuplicates.map((item, idx) => (
                          <div
                            key={idx}
                            className="py-1.5 first:pt-0 flex justify-between items-center text-xs"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  صف {item.row}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white break-words">
                                  {item.sessionName}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {item.instructorName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {formatDate(item.date)}
                              </span>
                              <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                مكرر ومطابق
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Errors list */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-xl p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                  <span className="text-xs font-bold text-red-800 dark:text-red-400 block mb-2">
                    أخطاء في الصفوف:
                  </span>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-2 custom-scrollbar pr-1">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30"
                      >
                        <span className="font-bold block mb-1">
                          صف {err.row !== -1 ? err.row : "عام"}:
                        </span>
                        <ul className="list-disc list-inside">
                          {err.errors.map((msg, j) => (
                            <li key={j}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-none flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/90">
          <button
            onClick={handleUpload}
            disabled={!canUpload || loading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors"
          >
            {loading ? "جاري الاستيراد..." : "استيراد"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="py-2.5 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Table Tab ────────────────────────────────────────────────────────



export interface SessionsTabProps {
  showToast: (msg: string, type: "success" | "error") => void;
  onSessionsChanged: () => void;
}

function SessionsTab({ showToast, onSessionsChanged }: SessionsTabProps) {

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [page, setPage] = useState(1);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const observerRef = useRef<HTMLTableRowElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const instructorsLoadedRef = useRef(false);

  const ensureInstructorsLoaded = async () => {
    if (instructorsLoadedRef.current) return;
    try {
      const res = await hoursAPI.getInstructors({ lite: true });
      dispatch({ type: "SET_INSTRUCTORS", instructors: res.data.data });
      instructorsLoadedRef.current = true;
    } catch {}
  };

  const handleOpenModal = (session?: TrainingSession) => {
    ensureInstructorsLoaded();
    dispatch({ type: "OPEN_MODAL", session });
  };

  const handleAddInstructor = useCallback(
    async (name: string): Promise<Instructor> => {
      const res = await hoursAPI.addInstructor(name);
      const instr = res.data.data;
      dispatch({
        type: "SET_INSTRUCTORS",
        instructors: [...state.instructors, instr],
      });
      return instr;
    },
    [state.instructors],
  );

  const { sessionsFilters } = state;
  const loadSessions = useCallback(
    async (p = page) => {
      if (p === 1) {
        dispatch({ type: "SET_SESSIONS_LOADING", loading: true });
      } else {
        setIsFetchingNextPage(true);
      }
      try {
        const flt = sessionsFilters;
        const res = await hoursAPI.getSessions({
          page: p,
          limit: 20,
          sort: flt.sort,
          search: flt.search || undefined,
          fiscalYear: flt.fiscalYear || undefined,
          programName: flt.programName || undefined,
          type: flt.type || undefined,
          dateFrom: flt.dateFrom || undefined,
          dateTo: flt.dateTo || undefined,
        });
        if (p === 1) {
          dispatch({
            type: "SET_SESSIONS",
            sessions: res.data.data,
            pagination: res.data.pagination,
          });
        } else {
          dispatch({
            type: "APPEND_SESSIONS",
            sessions: res.data.data,
            pagination: res.data.pagination,
          });
        }
      } catch (err) {
        if (!axios.isAxiosError(err) || err.response?.status !== 401) {
          dispatch({ type: "SET_SESSIONS_LOADING", loading: false });
        }
      } finally {
        setIsFetchingNextPage(false);
      }
    },
    [sessionsFilters, page],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSessions(page);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [state.sessionsFilters, page, loadSessions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hoursAPI.deleteSession(deleteTarget._id);
      showToast("تم حذف الجلسة", "success");
      setDeleteTarget(null);
      await loadSessions(page);
      onSessionsChanged(); // Notify parent
    } catch {
      showToast("فشل الحذف", "error");
    } finally {
      setDeleting(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(
      () => dispatch({ type: "SET_FILTER", key: "search", value: val }),
      250,
    );
  };

  const handleExport = async (type: "hours" | "timetable") => {
    const fy = state.sessionsFilters.fiscalYear || getCurrentFiscalYear();
    try {
      const res =
        type === "hours"
          ? await hoursAPI.exportTracking(fy)
          : await hoursAPI.exportTimetable(fy);
      downloadBlob(
        res.data as Blob,
        `${type === "hours" ? "hours-tracking" : "timetable"}-${fy}.xlsx`,
      );
    } catch {
      showToast("فشل التحميل", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    try {
      const res = await hoursAPI.deleteMultipleSessions(
        Array.from(selectedIds),
      );
      if (res.data.success) {
        showToast("تم الحذف الجماعي بنجاح", "success");
        setSelectedIds(new Set());
        dispatch({ type: "SET_SESSIONS_LOADING", loading: true });
        dispatch({
          type: "SET_FILTER",
          key: "search",
          value: state.sessionsFilters.search,
        });
      }
    } catch {
      showToast("فشل الحذف الجماعي", "error");
    } finally {
      setIsDeletingBulk(false);
      setShowBulkConfirm(false);
    }
  };

  const fyOptions = useMemo(
    () => [
      { value: "", label: "كل السنوات" },
      ...state.fiscalYears.map((fy) => ({ value: fy, label: fy })),
    ],
    [state.fiscalYears],
  );

  const programOptions = useMemo(
    () => [
      { value: "", label: "كل البرامج" },
      ...PROGRAM_NAMES.map((p) => ({ value: p, label: p })),
    ],
    [],
  );

  const sortOptions = [
    { value: "newest", label: "الأحدث أولاً" },
    { value: "oldest", label: "الأقدم أولاً" },
    { value: "name", label: "حسب الاسم" },
  ];

  const {
    sessions,
    sessionsLoading,
    sessionsPagination: pag,
    sessionsFilters: flt,
  } = state;

  const hasMore = pag.page < pag.totalPages;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage && !sessionsLoading) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "100px" }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, sessionsLoading]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          إضافة تدريب
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm hover:border-blue-400 transition-colors"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          استيراد من Excel
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={isDeletingBulk}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold rounded-xl text-sm hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
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
            {isDeletingBulk
              ? "جاري الحذف..."
              : `حذف المحدد (${selectedIds.size})`}
          </button>
        )}
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
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
            onChange={(v) =>
              dispatch({ type: "SET_FILTER", key: "programName", value: v })
            }
          />
          <CustomSelect
            value={flt.type}
            options={[
              { value: "", label: "كل الأنواع" },
              { value: "Training", label: "تدريب" },
              { value: "Awareness Event", label: "فعالية توعوية" },
              { value: "Incubation", label: "احتضان" },
              { value: "Consultation", label: "استشارة" },
            ]}
            onChange={(v) =>
              dispatch({ type: "SET_FILTER", key: "type", value: v })
            }
          />
          <CustomSelect
            value={flt.fiscalYear}
            options={fyOptions}
            onChange={(v) =>
              dispatch({ type: "SET_FILTER", key: "fiscalYear", value: v })
            }
          />
          <input
            type="date"
            value={flt.dateFrom}
            onChange={(e) =>
              dispatch({
                type: "SET_FILTER",
                key: "dateFrom",
                value: e.target.value,
              })
            }
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={flt.dateTo}
            onChange={(e) =>
              dispatch({
                type: "SET_FILTER",
                key: "dateTo",
                value: e.target.value,
              })
            }
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <CustomSelect
              value={flt.sort}
              options={sortOptions}
              onChange={(v) =>
                dispatch({ type: "SET_FILTER", key: "sort", value: v })
              }
            />
            <button
              onClick={() => dispatch({ type: "RESET_FILTERS" })}
              title="إعادة تعيين الفلاتر"
              className="p-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
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
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    checked={
                      sessions.length > 0 &&
                      selectedIds.size === sessions.length
                    }
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedIds(new Set(sessions.map((s) => s._id)));
                      else setSelectedIds(new Set());
                    }}
                  />
                </th>
                <th className="px-3 py-3 text-right whitespace-nowrap">
                  البرنامج
                </th>
                <th className="px-3 py-3 text-right whitespace-nowrap">
                  الجلسة
                </th>
                <th className="px-3 py-3 text-right whitespace-nowrap">
                  التاريخ
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  الساعات
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  الطريقة
                </th>
                <th className="px-3 py-3 text-right whitespace-nowrap">
                  المدرب
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  الحضور
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  النوع
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  تقرير التقييم
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  تقرير التدريب
                </th>
                <th className="px-3 py-3 text-center whitespace-nowrap">
                  إجراءات
                </th>
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
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      لا توجد جلسات تدريبية بعد
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      ابدأ بإضافة جلسة أو استيراد من Excel
                    </p>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s._id}
                    className={`transition-colors ${s.isPaid === false ? "bg-red-50/30 dark:bg-red-900/10 text-gray-400 dark:text-gray-500 hover:bg-red-50/50 dark:hover:bg-red-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
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
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${PROGRAM_COLORS[s.programName] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {s.programName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[180px] truncate">
                      {s.sessionName}
                      {s.isPaid === false && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                          غير مدفوع
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {s.hours} س
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.mode === "online" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}
                      >
                        {s.mode === "online" ? "أونلاين" : "أوفلاين"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {s.instructorId && s.instructorName ? (
                        <Link href={`/instructors/${s.instructorId}`} className="hover:text-blue-600 hover:underline transition-colors dark:hover:text-blue-400">
                          {s.instructorName}
                        </Link>
                      ) : (
                        s.instructorName || "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">
                      {s.attendeesCount}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeColor(s.type)}`}
                      >
                        {getTypeLabel(s.type)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {s.evaluationReportUrl ? (
                        <a
                          href={s.evaluationReportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
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
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {s.trainingReportUrl ? (
                        <a
                          href={s.trainingReportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors"
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
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {isFetchingNextPage && (
                <tr>
                  <td colSpan={12} className="py-6 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                  </td>
                </tr>
              )}
              {hasMore && !sessionsLoading && (
                <tr ref={observerRef} className="h-10 opacity-0 pointer-events-none">
                  <td colSpan={12}></td>
                </tr>
              )}
              {!hasMore && sessions.length > 0 && (
                <tr>
                  <td colSpan={12} className="py-4 text-center text-sm text-gray-500 font-semibold bg-gray-50/50 dark:bg-gray-800/50">
                    لا يوجد المزيد من الجلسات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirm
        open={showBulkConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
        loading={isDeletingBulk}
        message={`هل أنت متأكد من حذف ${selectedIds.size} جلسات؟ لا يمكن التراجع عن هذا الإجراء.`}
      />

      <SessionModal
        open={state.modalOpen}
        editing={state.editingSession}
        instructors={state.instructors}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onSaved={() => {
          loadSessions(page);
          onSessionsChanged();
        }}
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
        onImported={() => {
          loadSessions(page);
          onSessionsChanged();
        }}
        showToast={showToast}
      />

    </div>
  );
}

// ─── Timetable Calendar Tab ────────────────────────────────────────────────────


export default SessionsTab;
