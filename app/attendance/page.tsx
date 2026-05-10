"use client";

import React, { useState, useRef } from "react";
import { readExcel, Person } from "@/lib/excel";
import { addManyToBlacklist, getBlacklistIds } from "@/lib/blacklist";
import { validateNationalId } from "@/lib/validation";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from "@/lib/audit";

type ParsedFileState = { name: string; size: number; data: Person[] };

export default function Home() {
  const { user } = useAuth();
  const [registeredFile, setRegisteredFile] = useState<ParsedFileState | null>(null);
  const [attendedFile, setAttendedFile] = useState<ParsedFileState | null>(null);
  const [isParsingRegistered, setIsParsingRegistered] = useState(false);
  const [isParsingAttended, setIsParsingAttended] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [result, setResult] = useState<{
    registeredCount: number;
    attendedCount: number;
    addedCount: number;
    absentees: Person[];
    invalidEntries?: { name: string; nationalId: string; reason: string }[];
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleRegisteredFileSelect = async (file: File) => {
    setIsParsingRegistered(true);
    try {
      const data = await readExcel(file);
      setRegisteredFile({ name: file.name, size: file.size, data });
      showToast(`تم تحميل ملف المسجلين بنجاح.`, "success");
    } catch (error) {
      console.error(error);
      showToast("تعذر قراءة ملف المسجلين. يرجى التأكد من صيغة الملف.", "error");
    } finally {
      setIsParsingRegistered(false);
    }
  };

  const handleAttendedFileSelect = async (file: File) => {
    setIsParsingAttended(true);
    try {
      const data = await readExcel(file);
      setAttendedFile({ name: file.name, size: file.size, data });
      showToast(`تم تحميل ملف الحضور بنجاح.`, "success");
    } catch (error) {
      console.error(error);
      showToast("تعذر قراءة ملف الحضور. يرجى التأكد من صيغة الملف.", "error");
    } finally {
      setIsParsingAttended(false);
    }
  };

  const handleProcess = async () => {
    if (!registeredFile || !attendedFile) {
      showToast("الرجاء رفع كلا الملفين (المسجلون والحضور) أولاً.", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const registeredPeople = registeredFile.data;
      const attendedPeople = attendedFile.data;

      if (registeredPeople.length === 0) {
        showToast("ملف المسجلين فارغ أو لم يتم قراءته بشكل صحيح.", "error");
        setLoading(false);
        return;
      }

      if (attendedPeople.length === 0) {
        showToast("ملف الحضور فارغ أو لم يتم قراءته بشكل صحيح.", "error");
        setLoading(false);
        return;
      }

      // 2. المقارنة لاستخراج الغائبين
      const attendedIds = new Set(attendedPeople.map((p) => p.nationalId));
      const absentees = registeredPeople.filter((p) => !attendedIds.has(p.nationalId));

      // 3. التحقق من البلاك ليست لتجنب التكرار
      const existingBlacklistIds = await getBlacklistIds();
      const newAbsentees = absentees.filter((p) => !existingBlacklistIds.has(p.nationalId));

      // 4. الإضافة إلى البلاك ليست (الجدد فقط)
      const validToBlacklist: Person[] = [];
      const invalidEntries: { name: string; nationalId: string; reason: string }[] = [];

      newAbsentees.forEach((p) => {
        const validation = validateNationalId(p.nationalId);
        if (validation.isValid) {
          validToBlacklist.push(p);
        } else {
          invalidEntries.push({ ...p, reason: validation.reason! });
        }
      });

      if (validToBlacklist.length > 0) {
        await addManyToBlacklist(
          validToBlacklist.map((p) => ({
            name: p.name,
            nationalId: p.nationalId,
          }))
        );
      }

      setResult({
        registeredCount: registeredPeople.length,
        attendedCount: attendedPeople.length,
        addedCount: validToBlacklist.length,
        absentees: validToBlacklist,
        invalidEntries,
      });

      if (user) {
        await logAction({
          action: "attendance_upload",
          performedBy: user.uid,
          performedByName: user.displayName,
          performedByRole: user.role,
          targetId: "",
          targetName: "",
          details: `تم رفع كشف الحضور — ${newAbsentees.length} غائب أضيفوا للبلاك ليست`,
        });
      }

      showToast("تمت المقارنة والإضافة بنجاح!", "success");
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء معالجة الملفات. يرجى التأكد من صيغة الملفات.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard allowedRoles={["admin", "employee"]}>
    <main className="flex-1 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 p-6 sm:p-12 font-sans w-full">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">
            نظام تتبع الحضور - Creativa
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            قم برفع ملفات الإكسل للمسجلين والحضور لمقارنتها وإضافة المتغيبين للبلاك ليست
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FileUploadCard 
            title="ملف المسجلين (File A)" 
            description="الرجاء رفع ملف الإكسل الذي يحتوي على جميع المسجلين."
            fileState={registeredFile}
            isParsing={isParsingRegistered}
            onFileSelect={handleRegisteredFileSelect}
            onClear={() => setRegisteredFile(null)}
            id="file-registered"
          />
          <FileUploadCard 
            title="ملف الحضور (File B)" 
            description="الرجاء رفع ملف الإكسل الذي يحتوي على الحاضرين فقط."
            fileState={attendedFile}
            isParsing={isParsingAttended}
            onFileSelect={handleAttendedFileSelect}
            onClear={() => setAttendedFile(null)}
            id="file-attended"
          />
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={handleProcess}
            disabled={loading}
            className={`px-8 py-4 rounded-full text-lg font-bold text-white shadow-xl transition-all duration-300 w-full sm:w-auto min-w-[300px]
              ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105"}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري المعالجة...
              </span>
            ) : (
              "مقارنة وإضافة للبلاك ليست"
            )}
          </button>
        </div>

        {result && (
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b pb-4">ملخص العملية</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <StatCard title="إجمالي المسجلين" value={result.registeredCount} color="text-blue-600" bgColor="bg-blue-50" />
              <StatCard title="إجمالي الحضور" value={result.attendedCount} color="text-green-600" bgColor="bg-green-50" />
              <StatCard title="المنضمين للبلاك ليست" value={result.addedCount} color="text-red-600" bgColor="bg-red-50" subtitle="(متغيبين جدد)" />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                المتغيبون الجدد ({result.absentees.length})
              </h3>
              {result.absentees.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <table className="w-full text-sm text-right text-gray-600">
                    <thead className="bg-transparent dark:bg-transparent text-gray-700 dark:text-gray-300 font-semibold border-b">
                      <tr>
                        <th className="px-6 py-4">الاسم</th>
                        <th className="px-6 py-4">الرقم القومي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.absentees.map((person, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-transparent dark:bg-transparent transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{person.name}</td>
                          <td className="px-6 py-3">{person.nationalId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-transparent dark:bg-transparent text-center rounded-lg text-gray-500 dark:text-gray-400">
                  لا يوجد متغيبين جدد لإضافتهم للبلاك ليست.
                </div>
              )}
            </div>

            {/* Invalid Entries Warning Card */}
            {result.invalidEntries && result.invalidEntries.length > 0 && (
              <div className="mt-8 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-r-xl p-6 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400">
                    تحذير: تم تجاهل {result.invalidEntries.length} سجل بسبب أرقام قومية غير صالحة
                  </h3>
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-300 select-none outline-none">
                    عرض التفاصيل
                  </summary>
                  <div className="mt-4 overflow-hidden overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800/50">
                    <table className="w-full text-sm text-right text-gray-600 dark:text-gray-300">
                      <thead className="bg-amber-100/50 dark:bg-amber-900/30 font-semibold border-b border-amber-200 dark:border-amber-800">
                        <tr>
                          <th className="px-4 py-3">الاسم</th>
                          <th className="px-4 py-3">الرقم القومي</th>
                          <th className="px-4 py-3">السبب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.invalidEntries.map((entry, idx) => (
                          <tr key={idx} className="border-b border-amber-100 dark:border-amber-800/50 last:border-0 hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.name}</td>
                            <td className="px-4 py-3">{entry.nationalId}</td>
                            <td className="px-4 py-3 text-red-600 dark:text-red-400">{entry.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
    </RouteGuard>
  );
}

function StatCard({ title, value, color, bgColor, subtitle }: { title: string, value: number, color: string, bgColor: string, subtitle?: string }) {
  return (
    <div className={`rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 ${bgColor}`}>
      <span className="text-gray-600 font-medium">{title}</span>
      <span className={`text-4xl font-bold ${color}`}>{value}</span>
      {subtitle && <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
    </div>
  );
}

function FileUploadCard({ 
  title, 
  description, 
  fileState, 
  isParsing,
  onFileSelect, 
  onClear, 
  id 
}: { 
  title: string, 
  description: string, 
  fileState: ParsedFileState | null, 
  isParsing: boolean,
  onFileSelect: (f: File) => Promise<void>, 
  onClear: () => void, 
  id: string 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
         await onFileSelect(droppedFile);
      }
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      
      <div 
        className={`mt-auto relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-8 text-center cursor-pointer min-h-[200px]
          ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 bg-transparent dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"}
          ${fileState ? "border-green-400 bg-green-50 dark:bg-green-900/20" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          id={id}
          className="hidden"
          accept=".xlsx, .xls, .csv"
          onChange={handleChange}
        />
        
        {isParsing ? (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">جاري قراءة الملف...</p>
            </div>
          </div>
        ) : fileState ? (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all">{fileState.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{(fileState.size / 1024).toFixed(1)} KB • {fileState.data.length} سجل</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); if(inputRef.current) inputRef.current.value=''; }}
              className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium inline-flex items-center gap-1 bg-red-50 px-3 py-1 rounded-full dark:bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              إزالة الملف
            </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="w-14 h-14 bg-white dark:bg-gray-800 text-blue-500 shadow-sm rounded-full flex items-center justify-center mx-auto border border-gray-100 dark:border-gray-800">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-base text-gray-600 font-medium dark:text-gray-300">
                اسحب وأفلت الملف هنا
              </p>
              <p className="text-sm text-gray-400 mt-1">أو اضغط لاختيار ملف</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
