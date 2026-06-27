import React, { useEffect, useState, useCallback } from "react";
import { Panel } from "./Panel";
import { plannedAPI } from "@/lib/api";
import { ProgramComparison } from "@/lib/types/planned";
import { TIMETABLE_PROGRAM_COLORS } from "../../hours/components/sharedHoursTypes";

const getShortName = (name: string) => {
  if (name.includes("Entrepreneurship")) return "Entrepreneurship";
  if (name.includes("Freelancing")) return "Freelancing";
  if (name.includes("Awareness")) return "Awareness";
  if (name.includes("Hackathon")) return "Hackathons";
  if (name.includes("Acceleration")) return "Acceleration";
  if (name.includes("Career")) return "Career Dev";
  return name;
};

interface PlanVsActualPanelProps {
  fiscalYear: string;
}

export const PlanVsActualPanel = React.memo(function PlanVsActualPanel({ fiscalYear }: PlanVsActualPanelProps) {
  const [data, setData] = useState<ProgramComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (fy: string) => {
    setLoading(true);
    try {
      const res = await plannedAPI.getComparison(fy);
      setData(res.data.data.programComparisons || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fiscalYear && fiscalYear !== "all") {
      loadData(fiscalYear);
    } else {
      setData([]);
      setLoading(false);
    }
  }, [fiscalYear, loadData]);

  const isEmpty = data.length === 0;

  const pctColor = (pct: number) => {
    if (pct > 100) return "text-purple-600 dark:text-purple-400";
    if (pct >= 80) return "text-teal-600 dark:text-teal-400";
    if (pct >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Panel title="الخطة مقابل المنجز" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <div className="w-full h-[calc(100%-20px)] overflow-y-auto overflow-x-hidden pr-1">
          <table className="w-full text-left" dir="rtl">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="py-1 text-right text-xs font-bold text-gray-500 dark:text-gray-400">البرنامج</th>
                <th className="py-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400">الخطة</th>
                <th className="py-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400">المنجز</th>
                <th className="py-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400">الفرق</th>
                <th className="py-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pc) => {
                const color = TIMETABLE_PROGRAM_COLORS[pc.program] ?? "#E5E7EB";
                return (
                  <tr key={pc.program} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1.5 justify-start">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span 
                          className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-full text-right"
                          title={pc.program}
                        >
                          {getShortName(pc.program)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 text-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {pc.plannedTotal}
                    </td>
                    <td className="py-1.5 text-center text-[11px] font-bold text-teal-600 dark:text-teal-400">
                      {pc.actualTotal}
                    </td>
                    <td className={`py-1.5 text-center text-[11px] font-bold ${pc.diffTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {pc.diffTotal > 0 ? "+" : ""}{pc.diffTotal}
                    </td>
                    <td className={`py-1.5 text-center text-[11px] font-bold ${pctColor(pc.completionPct)}`}>
                      {pc.completionPct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
});
