"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { hoursAPI } from "@/lib/api";
import { useToast } from "./components/sharedHoursTypes";

const SessionsTab = dynamic(() => import("./components/SessionsTab"), {
  loading: () => <div className="p-8 text-center text-gray-500 font-bold">جاري التحميل...</div>,
});
const TimetableTab = dynamic(() => import("./components/TimetableTab"), {
  loading: () => <div className="p-8 text-center text-gray-500 font-bold">جاري التحميل...</div>,
});
const ArchiveTab = dynamic(() => import("./components/ArchiveTab"), {
  loading: () => <div className="p-8 text-center text-gray-500 font-bold">جاري التحميل...</div>,
});
const PlannedTimetableTab = dynamic(() => import("./components/PlannedTimetableTab"), {
  loading: () => <div className="p-8 text-center text-gray-500 font-bold">جاري التحميل...</div>,
});
const ComparisonTab = dynamic(() => import("./components/ComparisonTab"), {
  loading: () => <div className="p-8 text-center text-gray-500 font-bold">جاري التحميل...</div>,
});

const TABS = [
  { key: "tracking", label: "تسجيل الحضور" },
  { key: "timetable", label: "جدول التوقيت" },
  { key: "archive", label: "السنوات السابقة" },
  { key: "planned", label: "الخطة السنوية" },
  { key: "comparison", label: "المقارنة والتقرير" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function HoursPageContent() {
  const { toasts, show: showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("tracking");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(new Set(["tracking"]));
  const [fiscalYears, setFiscalYears] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const timetableRef = useRef<{ reload: () => void; setYear: (year: string) => void }>(null);


  const handleViewArchiveTimetable = (fy: string) => {
    handleTabChange("timetable");
    setTimeout(() => {
      timetableRef.current?.setYear(fy);
    }, 0);
  };



  useEffect(() => {
    hoursAPI
      .getFiscalYears()
      .then((res) => {
        setFiscalYears(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (tab: TabKey) => {
    if (activeTab === "planned" && isDirty && tab !== "planned") {
      if (!window.confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة؟")) return;
    }
    setActiveTab(tab);
    setVisitedTabs(prev => new Set(prev).add(tab));
  };

  return (
    <div className="pb-12 bg-gray-50 dark:bg-gray-950" dir="rtl">
      {/* Toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 animate-fade-in ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {t.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              متابعة الساعات التدريبية
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mr-12">
            تسجيل وإدارة جلسات التدريب وعرض الجدول الزمني السنوي
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 w-fit max-w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              {tab.key === "planned" && isDirty && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mb-1 mr-1" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content with Mount-Once Keep-Alive pattern */}
        {visitedTabs.has("tracking") && (
          <div style={{ display: activeTab === "tracking" ? "block" : "none" }}>
            <SessionsTab 
              showToast={showToast} 
              onSessionsChanged={() => timetableRef.current?.reload?.()} 
            />
          </div>
        )}
        
        {visitedTabs.has("timetable") && (
          <div style={{ display: activeTab === "timetable" ? "block" : "none" }}>
            <TimetableTab 
              fiscalYears={fiscalYears} 
              showToast={showToast} 
              ref={timetableRef} 
            />
          </div>
        )}
        
        {visitedTabs.has("archive") && (
          <div style={{ display: activeTab === "archive" ? "block" : "none" }}>
            <ArchiveTab 
              fiscalYears={fiscalYears} 
              showToast={showToast} 
              onViewTimetable={handleViewArchiveTimetable} 
            />
          </div>
        )}
        
        {visitedTabs.has("planned") && (
          <div style={{ display: activeTab === "planned" ? "block" : "none" }}>
            <PlannedTimetableTab 
              fiscalYears={fiscalYears} 
              showToast={showToast} 
              onDirtyChange={setIsDirty} 
            />
          </div>
        )}
        
        {visitedTabs.has("comparison") && (
          <div style={{ display: activeTab === "comparison" ? "block" : "none" }}>
            <ComparisonTab
              fiscalYears={fiscalYears}
              showToast={showToast}
              isActive={activeTab === "comparison"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
