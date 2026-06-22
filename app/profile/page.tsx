"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usersAPI } from "@/lib/api";
import RouteGuard from "@/components/RouteGuard";
import ImageCropper from "@/components/ImageCropper";
import getCroppedImg from "@/lib/cropImage";
import type { Area } from "react-easy-crop";
import imageCompression from 'browser-image-compression';

// ─── Egyptian Validation Helpers ─────────────────────────────────────────────

interface ValidationErrors {
  displayName?: string;
  phone?: string;
  nationalId?: string;
  age?: string;
  address?: string;
  password?: string;
}

function validateProfile(fields: {
  displayName: string;
  phone: string;
  nationalId: string;
  age: number | "";
  address: string;
  password: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (fields.displayName.trim() && fields.displayName.trim().length < 2) {
    errors.displayName = "الاسم الكامل يجب أن يكون حرفين على الأقل";
  }

  // Egyptian phone: exactly 11 digits, starts with 010/011/012/015
  if (fields.phone.trim()) {
    if (!/^(010|011|012|015)\d{8}$/.test(fields.phone.trim())) {
      errors.phone = "رقم هاتف مصري غير صحيح (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقم)";
    }
  }

  // Egyptian National ID: exactly 14 digits
  if (fields.nationalId.trim()) {
    if (!/^\d{14}$/.test(fields.nationalId.trim())) {
      errors.nationalId = "الرقم القومي يجب أن يكون 14 رقماً فقط";
    }
  }

  // Age: integer between 15 and 100
  if (fields.age !== "") {
    const ageNum = Number(fields.age);
    if (!Number.isInteger(ageNum) || ageNum < 15 || ageNum > 100) {
      errors.age = "العمر يجب أن يكون رقماً صحيحاً بين 15 و100";
    }
  }

  // Address: min 5 characters
  if (fields.address.trim() && fields.address.trim().length < 5) {
    errors.address = "العنوان يجب أن يكون 5 أحرف على الأقل";
  }

  // Password: optional but if given must be >= 8 chars, contain letter + number
  if (fields.password.trim()) {
    if (fields.password.length < 8) {
      errors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    } else if (!/[a-zA-Z]/.test(fields.password) || !/[0-9]/.test(fields.password)) {
      errors.password = "يجب أن تحتوي كلمة المرور على حروف وأرقام";
    }
  }

  return errors;
}

const inputBase =
  "w-full px-4 py-3.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-base";
const inputNormal = `${inputBase} border-gray-200 dark:border-gray-700`;
const inputError = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400`;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500 font-medium">{msg}</p> : null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [age, setAge] = useState<number | "">(user?.age || "");
  const [address, setAddress] = useState(user?.address || "");
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture || null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setDisplayName(user?.displayName || "");
    setAge(user?.age || "");
    setAddress(user?.address || "");
    setNationalId(user?.nationalId || "");
    setPhone(user?.phone || "");
    setProfilePicture(user?.profilePicture || null);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImageFile) {
        setLoading(true);
        const base64String = await compressAndConvertToBase64(croppedImageFile);
        const res = await usersAPI.uploadProfilePicture(base64String);
        if (res.data.success) {
          if (res.data.data?.profilePicture) {
            setProfilePicture(res.data.data.profilePicture);
          }
          showSuccess("تم تحديث الصورة بنجاح!");
          refreshUser();
        }
      }
    } catch {
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "حدث خطأ أثناء حفظ الصورة" }));
    } finally {
      setImageSrc(null);
      setLoading(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!profilePicture) return;
    setDeleteLoading(true);
    try {
      const res = await usersAPI.deleteProfilePicture();
      if (res.data.success) {
        setProfilePicture(null);
        showSuccess("تم حذف الصورة بنجاح");
        refreshUser();
      }
    } catch {
      window.dispatchEvent(new CustomEvent("global-toast", { detail: "حدث خطأ أثناء حذف الصورة" }));
    } finally {
      setDeleteLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    const validationErrors = validateProfile({ displayName, phone, nationalId, age, address, password });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (displayName.trim()) payload.displayName = displayName.trim();
      if (age !== "") payload.age = Number(age);
      if (address.trim()) payload.address = address.trim();
      if (nationalId.trim()) payload.nationalId = nationalId.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (password.trim()) payload.password = password.trim();

      const res = await usersAPI.updateProfile(payload);
      if (res.data.success) {
        showSuccess("تم حفظ التعديلات بنجاح!");
        setPassword("");
        refreshUser();
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "حدث خطأ أثناء حفظ البيانات";
      window.dispatchEvent(new CustomEvent("global-toast", { detail: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "؟";

  const compressAndConvertToBase64 = async (file: File): Promise<string> => {
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 500,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Constants and FieldError components are defined at the module level outside the component.

  return (
    <RouteGuard>
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 font-sans" dir="rtl">
        {imageSrc && (
          <ImageCropper
            imageSrc={imageSrc}
            onCropComplete={setCroppedAreaPixels}
            onCancel={() => setImageSrc(null)}
            onSave={handleSaveCroppedImage}
          />
        )}

        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold shadow-lg animate-bounce-short">
            {successMsg}
          </div>
        )}

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">الملف الشخصي</h1>
            <p className="text-blue-200 mt-2 text-base sm:text-lg">إدارة بياناتك وصورتك الشخصية</p>
          </div>
        </div>

        {/* Card lifted over hero */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 -mt-16 pb-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

            {/* Avatar Section */}
            <div className="flex flex-row items-center gap-6 px-6 sm:px-10 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl ring-4 ring-blue-500/20">
                  {profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl sm:text-4xl font-extrabold">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -left-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  title="تغيير الصورة"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              </div>

              {/* Name & info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white truncate">{user?.displayName}</h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    تغيير الصورة
                  </button>
                  {profilePicture && (
                    <button
                      onClick={handleDeletePicture}
                      disabled={deleteLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-60"
                    >
                      {deleteLoading ? (
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      حذف الصورة
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="px-6 sm:px-10 py-6 space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setErrors(v => ({ ...v, displayName: undefined })); }}
                    placeholder="أدخل اسمك الكامل"
                    className={errors.displayName ? inputError : inputNormal}
                  />
                  <FieldError msg={errors.displayName} />
                </div>

                {/* Email - readonly */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      disabled
                      type="email"
                      value={user?.email || ""}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 outline-none text-base cursor-not-allowed"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors(v => ({ ...v, phone: undefined })); }}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    maxLength={11}
                    className={`${errors.phone ? inputError : inputNormal} text-right`}
                  />
                  <FieldError msg={errors.phone} />
                </div>

                {/* National ID */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">الرقم القومي</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "")); setErrors(v => ({ ...v, nationalId: undefined })); }}
                    placeholder="14 رقم"
                    maxLength={14}
                    inputMode="numeric"
                    className={errors.nationalId ? inputError : inputNormal}
                  />
                  <FieldError msg={errors.nationalId} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Age */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">العمر</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => { setAge(e.target.value === "" ? "" : Number(e.target.value)); setErrors(v => ({ ...v, age: undefined })); }}
                    min={15}
                    max={100}
                    placeholder="مثال: 25"
                    className={errors.age ? inputError : inputNormal}
                  />
                  <FieldError msg={errors.age} />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">كلمة مرور جديدة</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })); }}
                      placeholder="اتركها فارغة لعدم التغيير"
                      className={`${errors.password ? inputError : inputNormal} pl-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <FieldError msg={errors.password} />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setErrors(v => ({ ...v, address: undefined })); }}
                  placeholder="المدينة، الشارع (5 أحرف على الأقل)"
                  className={errors.address ? inputError : inputNormal}
                />
                <FieldError msg={errors.address} />
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      حفظ التعديلات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
