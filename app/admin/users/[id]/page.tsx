"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { usersAPI, AppUser, UserRole } from "@/lib/api";
import Image from "next/image";
import RouteGuard from "@/components/RouteGuard";

export default function AdminUserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [age, setAge] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await usersAPI.getUser(id);
        if (res.data.success && res.data.data) {
          const u = res.data.data;
          setTargetUser(u);
          setDisplayName(u.displayName || "");
          setEmail(u.email || "");
          setRole(u.role || "viewer");
          setAge(u.age || "");
          setAddress(u.address || "");
          setNationalId(u.nationalId || "");
          setPhone(u.phone || "");
        }
      } catch {
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "المستخدم غير موجود" }));
        router.push("/admin/users");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchUser();
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update profile fields
      const res = await usersAPI.adminUpdateProfile(id, {
        displayName,
        email,
        age: age === "" ? undefined : Number(age),
        address,
        nationalId,
        phone,
        ...(password.trim() ? { password } : {})
      });
      
      // Update role if changed
      if (role !== targetUser?.role) {
        await usersAPI.changeRole(id, role);
      }

      if (res.data.success) {
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم تحديث بيانات المستخدم بنجاح!" }));
        setPassword("");
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (err as any).response?.data?.message || "حدث خطأ أثناء التحديث";
      window.dispatchEvent(new CustomEvent("global-toast", { detail: errorMsg }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RouteGuard>
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900" dir="rtl">
          <p className="text-gray-500">جاري التحميل...</p>
        </main>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <main className="flex-1 p-6 sm:p-10 font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
            <button onClick={() => router.push("/admin/users")} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h1 className="text-3xl font-extrabold">تعديل المستخدم</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-10 items-start">
              
              {/* Profile Image Preview */}
              <div className="flex flex-col items-center gap-4 w-full md:w-1/4">
                <div className="w-40 h-40 rounded-full border-4 border-gray-100 dark:border-gray-700 overflow-hidden shadow-md">
                  {targetUser?.profilePicture ? (
                     <Image src={targetUser.profilePicture} alt="Profile" width={160} height={160} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-6xl font-bold">
                      {displayName.charAt(0) || "؟"}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${targetUser?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {targetUser?.isActive ? "نشط" : "معطل"}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="w-full md:w-3/4 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input required type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">دور المستخدم <span className="text-red-500">*</span></label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="admin">مدير النظام</option>
                      <option value="employee">موظف</option>
                      <option value="accountant">محاسب</option>
                      <option value="viewer">مشاهد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">العمر</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} min={10} max={100}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">الرقم القومي</label>
                    <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="14 رقم"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-right w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">تغيير كلمة المرور</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="اتركه فارغاً إن لم ترغب بتغييرها"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2"
                  >
                    {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
