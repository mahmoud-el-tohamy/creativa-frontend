"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { user, signIn } = useAuth();

  React.useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(identifier, password);
      router.replace("/");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.message || "تعذّر الاتصال بالخادم");
      } else {
        setError("بيانات الدخول غير صحيحة");
      }
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen overflow-hidden bg-[#070B14] px-4 py-8 font-sans text-white sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.26),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(15,23,42,0.95),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/8 to-transparent" />
      </div>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_460px]">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-blue-100 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,.9)]" />
              منصة داخلية آمنة لإدارة عمليات التدريب
            </div>
            <h2 className="text-5xl font-black leading-tight tracking-tight text-white">
              إدارة أكثر هدوءاً،
              <span className="block bg-gradient-to-l from-blue-200 via-white to-sky-200 bg-clip-text text-transparent">
                وقرارات أسرع.
              </span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              نظام كرياتيفا يجمع الحضور، الفلترة، البلاك ليست، الشهادات، وسجلات
              الإدارة في تجربة واحدة مصممة للفريق التشغيلي بثقة ووضوح.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.075] p-6 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/95 p-3 shadow-2xl shadow-black/30">
                <Image
                  src="/logo.png"
                  alt="Creativa Logo"
                  width={72}
                  height={72}
                  priority
                  sizes="72px"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-blue-200/80">
                Creativa Mansoura
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                مرحباً بك في نظام إدارة كرياتيفا
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                سجّل الدخول للوصول إلى أدوات إدارة الحضور والفلترة والتقارير.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100 shadow-lg shadow-red-950/20"
                >
                  <svg
                    className="h-5 w-5 shrink-0 text-red-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-bold text-slate-100"
                >
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors group-focus-within:text-blue-300">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 10-8 0 4 4 0 008 0zM12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"
                      />
                    </svg>
                  </div>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 pr-12 text-sm font-semibold text-white shadow-inner shadow-black/20 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-blue-300/60 focus:bg-slate-950/65 focus:ring-4 focus:ring-blue-400/10"
                    placeholder="example@creativa.gov.eg أو اسم المستخدم"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-bold text-slate-100"
                >
                  كلمة المرور
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors group-focus-within:text-blue-300">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 pr-12 pl-12 text-sm font-semibold text-white shadow-inner shadow-black/20 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-blue-300/60 focus:bg-slate-950/65 focus:ring-4 focus:ring-blue-400/10"
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute left-4 inset-y-0 flex items-center text-slate-500 hover:text-blue-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-700 via-blue-600 to-sky-500 px-4 font-black text-white shadow-[0_18px_45px_rgba(37,99,235,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(37,99,235,.38)] focus:outline-none focus:ring-4 focus:ring-blue-300/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    دخول النظام
                    <svg
                      className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 17l-5-5m0 0l5-5m-5 5h12"
                      />
                    </svg>
                  </>
                )}
              </button>

              <p className="pt-2 text-center text-xs leading-6 text-slate-400">
                هذا النظام مخصص لفريق Creativa Innovation Hub - Mansoura فقط.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
