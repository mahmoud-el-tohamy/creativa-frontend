import React from "react";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";

interface KpiStripProps {
  stats: TrainingStatsResponse | null;
  thisMonthBlacklistCount: number;
  warningsCount: number;
  loading: boolean;
}

export const KpiStrip = React.memo(function KpiStrip({ stats, thisMonthBlacklistCount, warningsCount, loading }: KpiStripProps) {
  const kpis = [
    { label: "إجمالي الساعات", value: stats?.totalHours ?? 0, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "إجمالي المتدربين", value: stats?.totalAttendees ?? 0, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { label: "إجمالي الجلسات", value: stats?.totalSessions ?? 0, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { label: "أيام التدريب", value: stats?.totalTrainingDays ?? 0, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "بلاك ليست الشهر", value: thisMonthBlacklistCount, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", danger: true },
    { label: "الإنذارات الحالية", value: warningsCount, icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", warning: true }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
      {kpis.map((kpi, idx) => (
        <div key={idx} className={`bg-white dark:bg-gray-800 border rounded-xl p-3 flex flex-col justify-center relative overflow-hidden h-[80px] ${
          kpi.danger ? 'border-red-200 dark:border-red-900/50' : kpi.warning ? 'border-amber-200 dark:border-amber-900/50' : 'border-gray-100 dark:border-gray-700'
        }`}>
          {loading ? (
            <div className="w-full h-full flex flex-col gap-2 justify-center">
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1 z-10">
                <svg className={`w-3.5 h-3.5 ${kpi.danger ? 'text-red-500' : kpi.warning ? 'text-amber-500' : 'text-blue-500 dark:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kpi.icon} />
                </svg>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">{kpi.label}</span>
              </div>
              <div className={`text-xl font-extrabold z-10 ${kpi.danger ? 'text-red-600 dark:text-red-400' : kpi.warning ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                {kpi.value.toLocaleString('en-US')}
              </div>
              
              <div className={`absolute -left-2 -bottom-2 opacity-5 dark:opacity-10 pointer-events-none`}>
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kpi.icon} />
                </svg>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
});
