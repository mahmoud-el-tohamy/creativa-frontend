import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";
import { COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface MonthlyTrendPanelProps {
  stats: TrainingStatsResponse | null;
  loading: boolean;
}

export const MonthlyTrendPanel = React.memo(function MonthlyTrendPanel({ stats, loading }: MonthlyTrendPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!stats?.monthlyActivity || stats.monthlyActivity.length === 0) return [];
    // The backend provides 'month', 'sessions', 'hours', 'attendees', 'days'
    // Keep it ordered chronologically (it should already be, but verify it if needed).
    return stats.monthlyActivity.map(item => ({
      name: item.month.substring(0, 3), // short month name
      fullName: item.month,
      sessions: item.sessions,
      hours: item.hours
    }));
  }, [stats?.monthlyActivity]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="النشاط التدريبي الشهري" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? COLORS.gridLine.dark : COLORS.gridLine.light} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
              dy={5}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#f3f4f6' : '#1f2937',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '4px 8px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="mx-2">{value}</span>}
            />
            <Bar 
              yAxisId="left"
              dataKey="hours" 
              name="الساعات" 
              fill={isDark ? COLORS.secondary.dark : COLORS.secondary.light} 
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="sessions" 
              name="الجلسات" 
              stroke={isDark ? COLORS.primary.dark : COLORS.primary.light} 
              strokeWidth={3}
              dot={{ r: 3, fill: isDark ? COLORS.primary.dark : COLORS.primary.light }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
});
