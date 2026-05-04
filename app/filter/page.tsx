"use client";

import React, { useState, useRef, useMemo } from "react";
import { readExcel, downloadExcel, Person } from "@/lib/excel";
import { getBlacklistIds } from "@/lib/blacklist";

export default function FilterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [candidates, setCandidates] = useState<Person[] | null>(null);
  const [cleanList, setCleanList] = useState<Person[] | null>(null);
  const [blacklistedList, setBlacklistedList] = useState<Person[] | null>(null);

  // Pagination state for clean list
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Collapsible state for blacklisted
  const [showBlacklisted, setShowBlacklisted] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleProcess = async () => {
    if (!file) {
      showToast("الرجاء رفع ملف الإكسل أولاً.", "error");
      return;
    }

    setLoading(true);
    setCandidates(null);
    setCleanList(null);
    setBlacklistedList(null);
    setCurrentPage(1);
    setShowBlacklisted(false);

    try {
      // 1. Read the Excel file
      const allCandidates = await readExcel(file);
      if (allCandidates.length === 0) {
        showToast("الملف فارغ أو لم يتم قراءته بشكل صحيح.", "error");
        setLoading(false);
        return;
      }

      // 2. Fetch blacklist
      const blacklistIds = await getBlacklistIds();

      // 3. Filter candidates
      const clean: Person[] = [];
      const blacklisted: Person[] = [];

      allCandidates.forEach(candidate => {
        if (blacklistIds.has(candidate.nationalId)) {
          blacklisted.push(candidate);
        } else {
          clean.push(candidate);
        }
      });

      setCandidates(allCandidates);
      setCleanList(clean);
      setBlacklistedList(blacklisted);

      showToast("تم فلترة القائمة بنجاح!", "success");
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء معالجة الملف. تأكد من صيغة الأعمدة.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!cleanList) return;
    downloadExcel(cleanList, "القائمة_النظيفة.xlsx");
  };

  // Pagination calculation
  const paginatedCleanList = useMemo(() => {
    if (!cleanList) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return cleanList.slice(startIndex, startIndex + itemsPerPage);
  }, [cleanList, currentPage]);

  const totalPages = cleanList ? Math.ceil(cleanList.length / itemsPerPage) : 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6 sm:p-12 font-sans">
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-3 border-b pb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-900 tracking-tight">
            فلترة قائمة المرشحين
          </h1>
          <p className="text-gray-500 text-lg">
            قم برفع قائمة المرشحين لمطابقتها مع البلاك ليست واستخراج القائمة النظيفة للتدريب
          </p>
        </header>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <FileUploadArea file={file} setFile={setFile} />
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleProcess}
              disabled={loading || !file}
              className={`px-8 py-3 rounded-full text-lg font-bold text-white shadow-md transition-all duration-300 w-full sm:w-auto min-w-[200px]
                ${(loading || !file) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:scale-105"}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الفلترة...
                </span>
              ) : (
                "فلترة القائمة"
              )}
            </button>
            
            {cleanList && (
              <button
                onClick={handleDownload}
                className="px-8 py-3 rounded-full text-lg font-bold text-white shadow-md transition-all duration-300 w-full sm:w-auto bg-green-600 hover:bg-green-700 hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                تحميل الشيت النظيف
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {candidates && cleanList && blacklistedList && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard title="إجمالي المرشحين" value={candidates.length} color="text-blue-600" bgColor="bg-blue-50" />
              <StatCard title="في البلاك ليست" value={blacklistedList.length} color="text-red-600" bgColor="bg-red-50" />
              <StatCard title="سيتم إرسالهم (النظيفة)" value={cleanList.length} color="text-green-600" bgColor="bg-green-50" />
            </div>

            {/* Blacklisted Collapsible */}
            {blacklistedList.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowBlacklisted(!showBlacklisted)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-red-100/50 hover:bg-red-100 transition-colors text-red-800 font-bold"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    الأشخاص المستبعدين (موجودين في البلاك ليست)
                  </span>
                  <svg className={`w-5 h-5 transition-transform ${showBlacklisted ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showBlacklisted && (
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {blacklistedList.map((person, idx) => (
                        <span key={idx} className="bg-white text-red-700 text-sm px-3 py-1.5 rounded-full border border-red-200 shadow-sm font-medium">
                          {person.name} ({person.nationalId})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clean List Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  القائمة النظيفة (المقبولين)
                </h3>
                <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {cleanList.length} شخص
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">الاسم</th>
                      <th className="px-6 py-4">الرقم القومي</th>
                      <th className="px-6 py-4">رقم التواصل</th>
                      <th className="px-6 py-4">الإيميل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCleanList.length > 0 ? (
                      paginatedCleanList.map((person, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{person.name}</td>
                          <td className="px-6 py-4">{person.nationalId}</td>
                          <td className="px-6 py-4">{person.phone || "-"}</td>
                          <td className="px-6 py-4">{person.email || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          لا يوجد مرشحين مقبولين.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                  <span className="text-sm text-gray-600">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value, color, bgColor }: { title: string, value: number, color: string, bgColor: string }) {
  return (
    <div className={`rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 ${bgColor}`}>
      <span className="text-gray-600 font-medium">{title}</span>
      <span className={`text-4xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function FileUploadArea({ file, setFile }: { file: File | null, setFile: (f: File | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
         setFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  return (
    <div 
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-10 text-center cursor-pointer
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
        ${file ? "border-green-400 bg-green-50" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".xlsx, .xls, .csv"
        onChange={handleChange}
      />
      
      {file ? (
        <div className="space-y-3">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setFile(null); if(inputRef.current) inputRef.current.value=''; }}
            className="mt-3 text-sm text-red-500 hover:text-red-700 font-bold inline-flex items-center gap-1 bg-white px-4 py-1.5 rounded-full shadow-sm border border-red-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            إلغاء واختيار ملف آخر
          </button>
        </div>
      ) : (
        <div className="space-y-4">
           <div className="w-16 h-16 bg-white text-blue-600 shadow-sm rounded-full flex items-center justify-center mx-auto border border-gray-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xl text-gray-700 font-bold">
              اسحب وأفلت شيت المرشحين هنا
            </p>
            <p className="text-base text-gray-400 mt-2">أو اضغط لاختيار ملف من جهازك</p>
          </div>
        </div>
      )}
    </div>
  );
}
