"use client";

import React, { useState, useMemo } from "react";
import axios from "axios";
import useSWR from "swr";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { usersAPI, AppUser } from "@/lib/api";
import CustomSelect from "@/components/ui/CustomSelect";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

type UserRole = "admin" | "employee" | "viewer" | "accountant";

const ROLE_LABELS: Record<UserRole, string> = { admin: "مدير", employee: "موظف", viewer: "مشاهد", accountant: "محاسب" };

function formatDate(d: string | Date | undefined) {
  if (!d) return "—";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(dateObj);
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
interface AddUserModalProps {
  onClose: () => void;
  onCreated: (user: AppUser) => void;
}

function AddUserModal({ onClose, onCreated }: AddUserModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }

    setSubmitting(true);
    try {
      const res = await usersAPI.create({
        email,
        password,
        displayName,
        role,
      });

      if (res.data.success) {
        onCreated(res.data.data);
      } else {
        setError("حدث خطأ ما");
        setSubmitting(false);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "تعذّر الاتصال بالخادم");
      } else {
        setError("حدث خطأ غير متوقع");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-visible">
        <div className="bg-blue-600 px-6 py-5 text-white rounded-t-2xl">
          <h2 className="text-xl font-bold">إضافة مستخدم جديد</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-sm">{error}</div>
          )}
          {[
            { key: "displayName", label: "الاسم الكامل", value: displayName, set: setDisplayName, type: "text", placeholder: "مثال: أحمد محمد" },
            { key: "email", label: "البريد الإلكتروني", value: email, set: setEmail, type: "email", placeholder: "example@email.com" },
            { key: "password", label: "كلمة المرور", value: password, set: setPassword, type: "password", placeholder: "8 أحرف على الأقل" },
          ].map(({ key, label, value, set, type, placeholder }) => (
            <div key={label}>
              <label htmlFor={`add-user-${key}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                id={`add-user-${key}`}
                name={key}
                required type={type} value={value} placeholder={placeholder}
                onChange={(e) => set(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          ))}
          <div>
            <label htmlFor="add-user-role" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">الدور</label>
            <CustomSelect
              id="add-user-role"
              value={role}
              onChange={(v) => setRole(v as UserRole)}
              options={[
                { value: "admin",      label: "مدير" },
                { value: "employee",   label: "موظف" },
                { value: "viewer",     label: "مشاهد" },
                { value: "accountant", label: "محاسب" },
              ]}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>جاري الإنشاء...</>
              ) : "إنشاء الحساب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
function ConfirmDialog({ message, onConfirm, onCancel, danger }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <p className="text-gray-800 dark:text-gray-200 font-medium text-center">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">
            إلغاء
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2 rounded-xl font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const fetcher = async () => {
    const res = await usersAPI.list();
    return res.data.data;
  };

  const { data: usersData, mutate, isLoading: loading } = useSWR("/api/users", fetcher, {
    revalidateOnFocus: true,
    onError: () => {
      showToast("فشل تحميل المستخدمين", "error");
    }
  });

  const users = useMemo(() => usersData || [], [usersData]);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; danger?: boolean } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  }), [users]);

  const handleRoleChange = (id: string, newRole: UserRole, name: string) => {
    setConfirmDialog({
      message: `هل تريد تغيير دور ${name} إلى "${ROLE_LABELS[newRole]}"؟`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await usersAPI.changeRole(id, newRole);
          mutate((prev: AppUser[] | undefined) => (prev || []).map((u) => u.id === id ? { ...u, role: newRole } : u), false);
          showToast(`تم تحديث دور ${name}`);
        } catch {
          showToast("حدث خطأ أثناء تحديث الدور", "error");
        }
      },
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean, name: string) => {
    if (id === currentUser?.id) { showToast("لا يمكنك تعطيل حسابك الخاص", "error"); return; }
    const action = currentActive ? "تعطيل" : "تفعيل";
    setConfirmDialog({
      message: `هل تريد ${action} حساب "${name}"؟`,
      danger: currentActive,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await usersAPI.toggleActive(id, !currentActive);
          mutate((prev: AppUser[] | undefined) => (prev || []).map((u) => u.id === id ? { ...u, isActive: !currentActive } : u), false);
          showToast(`تم ${action} حساب ${name} بنجاح`);
        } catch {
          showToast(`حدث خطأ أثناء ${action} الحساب`, "error");
        }
      },
    });
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (id === currentUser?.id) { showToast("لا يمكنك حذف حسابك الخاص", "error"); return; }
    setConfirmDialog({
      message: `تحذير: هل أنت متأكد من حذف حساب "${name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء!`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await usersAPI.deleteUser(id);
          mutate((prev: AppUser[] | undefined) => (prev || []).filter((u) => u.id !== id), false);
          showToast(`تم حذف حساب ${name} بنجاح`);
        } catch {
          showToast(`حدث خطأ أثناء حذف الحساب`, "error");
        }
      },
    });
  };

  const handleUserCreated = (newUser: AppUser) => {
    mutate((prev: AppUser[] | undefined) => [newUser, ...(prev || [])], false);
    setShowAddModal(false);
    showToast(`تم إنشاء حساب ${newUser.displayName} بنجاح`);
  };

  return (
    <RouteGuard allowedRoles={["admin"]}>
      <main className="flex-1 p-6 sm:p-10 font-sans text-gray-900 dark:text-gray-100" dir="rtl">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-white font-semibold transition-all ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.msg}
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            danger={confirmDialog.danger}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {/* Add User Modal */}
        {showAddModal && currentUser && (
          <AddUserModal onClose={() => setShowAddModal(false)} onCreated={handleUserCreated} />
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">إدارة المستخدمين</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة حسابات الفريق وصلاحياتهم</p>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة مستخدم
            </button>
          </header>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "إجمالي المستخدمين", value: stats.total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: "المفعّلون", value: stats.active, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
              { label: "المعطّلون", value: stats.inactive, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-5 text-center`}>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-3xl font-extrabold ${color}`}>{loading ? "—" : value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="users-search"
              name="usersSearch"
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
              className="w-full pr-12 pl-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
            <div className="overflow-x-auto lg:overflow-visible">
              <table className="w-full text-sm text-right">
                <thead className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                  <tr>
                    {["الاسم", "البريد الإلكتروني", "الدور", "الحالة", "تاريخ الإنشاء", "إجراءات"].map((col) => (
                      <th key={col} className="px-5 py-4 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">لا يوجد مستخدمون مطابقون</td>
                    </tr>
                  ) : (
                    filtered.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {u.displayName?.charAt(0) || "؟"}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{u.displayName}</p>
                            </div>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{u.email}</td>
                        {/* Role — custom badge dropdown */}
                        <td className="px-5 py-4">
                          <CustomSelect
                            asBadge
                            id={`user-role-${u.id}`}
                            ariaLabel={`تغيير دور المستخدم ${u.displayName}`}
                            value={u.role}
                            onChange={(v) => handleRoleChange(u.id, v as UserRole, u.displayName)}
                            options={[
                              { value: "admin",      label: "مدير",   color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
                              { value: "employee",   label: "موظف",   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
                              { value: "viewer",     label: "مشاهد", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
                              { value: "accountant", label: "محاسب", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
                            ]}
                          />
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`} />
                            {u.isActive ? "نشط" : "معطّل"}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                        {/* Actions — toggle switch & delete button */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ToggleSwitch
                              checked={u.isActive}
                              onChange={() => handleToggleActive(u.id, u.isActive, u.displayName)}
                              disabled={u.id === currentUser?.id}
                              title={u.id === currentUser?.id ? "لا يمكنك تعطيل حسابك" : u.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                            />
                            <button
                              onClick={() => handleDeleteUser(u.id, u.displayName)}
                              disabled={u.id === currentUser?.id}
                              className={`p-1.5 rounded-lg transition-colors ${(u.id === currentUser?.id) ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                              title={u.id === currentUser?.id ? "لا يمكنك حذف حسابك" : "حذف الحساب نهائياً"}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}

