"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api, { hoursAPI, createCancelToken } from "@/lib/api";
import { DashboardStatsResponse, TrainingStatsResponse } from "./lib/viewerDashboardTypes";

function getCurrentFiscalYear() {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  if (m >= 4) return `FY${y}-${y + 1}`;
  return `FY${y - 1}-${y}`;
}

import { KpiStrip } from "./components/KpiStrip";
import { ModeSplitPanel } from "./components/ModeSplitPanel";
import { TypeDistributionPanel } from "./components/TypeDistributionPanel";
import { WarningsBlacklistTiles } from "./components/WarningsBlacklistTiles";
import { MostAbsentTracksPanel } from "./components/MostAbsentTracksPanel";
import { MonthlyTrendPanel } from "./components/MonthlyTrendPanel";
import { AdditionRatePanel } from "./components/AdditionRatePanel";
import { ProgramBarChartPanel } from "./components/ProgramBarChartPanel";
import { TopInstructorsPanel } from "./components/TopInstructorsPanel";
import { PlanVsActualPanel } from "./components/PlanVsActualPanel";

function DashboardSkeleton() {
  return (
    <div className="w-full h-[calc(100vh-64px)] p-3 grid grid-cols-12 grid-rows-[auto_1fr_1.5fr_1.5fr] gap-2 overflow-hidden bg-gray-50 dark:bg-[#0f172a]">
      <div className="col-span-12 h-[80px] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      
      <div className="col-span-12 xl:col-span-8 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 xl:col-span-4 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      
      <div className="col-span-12 xl:col-span-8 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="col-span-12 xl:col-span-4 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  );
}

export default function ViewerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const selectedFY = searchParams.get('fiscalYear') || getCurrentFiscalYear();
  const selectedQuarter = searchParams.get('quarter') || "all";

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "viewer") {
        router.push("/");
      } else {
        const { signal, cancel } = createCancelToken();
        
        const fetchDashboardData = async () => {
          setLoading(true);
          try {
            const [statsRes, trainingRes] = await Promise.all([
              api.get<DashboardStatsResponse>(`/dashboard/stats?range=monthly&fiscalYear=${selectedFY}&quarter=${selectedQuarter}&_t=${Date.now()}`, { signal }),
              hoursAPI.getDashboardStats(selectedFY, selectedQuarter)
            ]);
            
            if (statsRes.data?.success) {
              setDashboardStats(statsRes.data);
            }
            
            // `trainingRes.data` is the actual JSON payload, not wrapped in { success, data }
            if (trainingRes.data) {
              setTrainingStats(trainingRes.data as unknown as TrainingStatsResponse);
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.name !== "CanceledError") {
              console.error("Dashboard fetch error:", err);
              setError("فشل تحميل بيانات لوحة التحكم.");
            }
          } finally {
            setLoading(false);
          }
        };

        // Only fetch if selectedFY has been resolved
        if (selectedFY) {
          void fetchDashboardData();
        }
        return () => { cancel(); };
      }
    }
  }, [user, authLoading, router, selectedFY, selectedQuarter]);

  if (authLoading) return <DashboardSkeleton />;
  if (error) return <div className="w-full h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  const blacklist = dashboardStats?.blacklist || [];
  
  // Calculate this month's additions
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const thisMonthBlacklistCount = blacklist.filter((entry) => {
    const d = new Date(entry.addedAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  
  const warningsCount = blacklist.filter(e => e.status === "warning").length;

  return (
    <div className="w-full h-[calc(100vh-57px)] md:h-[calc(100vh-65px)] bg-gray-50 dark:bg-[#0f172a] p-2 md:p-3 overflow-y-auto xl:overflow-hidden flex flex-col">
      <div className="mx-auto w-full max-w-[1920px] h-full flex flex-col gap-2 min-h-0">
        
        {/* Data Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 xl:grid-rows-[auto_1fr_1.5fr_1.5fr] gap-2 xl:overflow-hidden min-h-0">
          
          {/* ROW 1: KPI Strip */}
        <div className="xl:col-span-12 shrink-0">
          <KpiStrip stats={trainingStats} thisMonthBlacklistCount={thisMonthBlacklistCount} warningsCount={warningsCount} loading={loading} />
        </div>
        
        {/* ROW 2: 4 Small Panels */}
        <div className="xl:col-span-3 min-h-[160px] xl:min-h-0">
          <ModeSplitPanel stats={trainingStats} loading={loading} />
        </div>
        <div className="xl:col-span-3 min-h-[160px] xl:min-h-0">
          <TypeDistributionPanel stats={trainingStats} loading={loading} />
        </div>
        <div className="xl:col-span-3 min-h-[160px] xl:min-h-0">
          <WarningsBlacklistTiles blacklist={blacklist} loading={loading} />
        </div>
        <div className="xl:col-span-3 min-h-[160px] xl:min-h-0">
          <MostAbsentTracksPanel blacklist={blacklist} loading={loading} />
        </div>
        
        {/* ROW 3: Trends */}
        <div className="xl:col-span-8 min-h-[300px] xl:min-h-0">
          <MonthlyTrendPanel stats={trainingStats} loading={loading} />
        </div>
        <div className="xl:col-span-4 min-h-[300px] xl:min-h-0">
          <AdditionRatePanel dashboardStats={dashboardStats} loading={loading} />
        </div>
        
        {/* ROW 4: Programs & Instructors */}
        <div className="xl:col-span-4 min-h-[300px] xl:min-h-0">
          <ProgramBarChartPanel stats={trainingStats} loading={loading} />
        </div>
        <div className="xl:col-span-4 min-h-[300px] xl:min-h-0">
          <PlanVsActualPanel fiscalYear={selectedFY} />
        </div>
        <div className="xl:col-span-4 min-h-[300px] xl:min-h-0 pb-4 xl:pb-0">
          <TopInstructorsPanel stats={trainingStats} loading={loading} />
        </div>
        
        </div>
      </div>
    </div>
  );
}
