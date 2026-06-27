import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";
import { PROGRAM_COLORS, COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

interface ProgramBarChartPanelProps {
  stats: TrainingStatsResponse | null;
  loading: boolean;
}

export const ProgramBarChartPanel = React.memo(function ProgramBarChartPanel({ stats, loading }: ProgramBarChartPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!stats?.programDays || stats.programDays.length === 0) return [];
    
    return stats.programDays
      .map((item, index) => ({
        name: item.program.split(" ")[0], // extremely shortened for the cramped XAxis
        fullName: item.program,
        sessions: item.sessionCount,
        color: isDark ? PROGRAM_COLORS[index % PROGRAM_COLORS.length].dark : PROGRAM_COLORS[index % PROGRAM_COLORS.length].light
      }))
      .sort((a, b) => b.sessions - a.sessions); // Sort descending
  }, [stats?.programDays, isDark]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="توزيع الجلسات حسب البرنامج" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <div className="w-full h-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? COLORS.gridLine.dark : COLORS.gridLine.light} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light, angle: -45, textAnchor: 'end', dx: -5, dy: 5 }}
              height={60}
              interval={0}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
              width={40}
              tickMargin={5}
            />
            <Tooltip 
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
              formatter={(value) => [value, "عدد الجلسات"]}
              labelFormatter={(label, payload) => payload?.[0]?.payload.fullName || label}
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#f3f4f6' : '#1f2937',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '4px 8px'
              }}
              labelStyle={{ color: isDark ? '#9ca3af' : '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}
            />
            <Bar dataKey="sessions" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
});
