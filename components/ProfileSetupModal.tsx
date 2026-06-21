"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usersAPI } from "@/lib/api";

export default function ProfileSetupModal() {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const [age, setAge] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if essential profile fields are missing
      const isMissingInfo = !user.age || !user.address || !user.nationalId || !user.phone;
      
      // Check if user has already skipped this session
      const hasSkipped = sessionStorage.getItem("skippedProfileSetup") === "true";
      
      if (isMissingInfo && !hasSkipped) {
        setTimeout(() => setIsOpen(true), 0);
      }
    }
  }, [user]);

  const handleSkip = () => {
    sessionStorage.setItem("skippedProfileSetup", "true");
    setIsOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await usersAPI.updateProfile({
        age: age === "" ? undefined : Number(age),
        address,
        nationalId,
        phone,
      });
      if (res.data.success) {
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "تم حفظ بياناتك بنجاح!" }));
        await refreshUser();
        setIsOpen(false);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (err as any).response?.data?.message || "حدث خطأ أثناء الحفظ";
      window.dispatchEvent(new CustomEvent("global-toast", { detail: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            استكمال بيانات الملف الشخصي
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
            يرجى تعبئة البيانات التالية لتسهيل استخدام النظام وإصدار الشهادات بدقة.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">الرقم القومي</label>
              <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="14 رقم"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">العمر</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-right w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={handleSkip}
              className="px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-1/3"
            >
              تخطي
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
