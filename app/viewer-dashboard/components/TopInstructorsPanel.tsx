import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";
import { COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface TopInstructorsPanelProps {
  stats: TrainingStatsResponse | null;
  loading: boolean;
}

export const TopInstructorsPanel = React.memo(function TopInstructorsPanel({ stats, loading }: TopInstructorsPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!stats?.topInstructors || stats.topInstructors.length === 0) return [];
    
    return stats.topInstructors
      .slice(0, 5) // Top 5
      .map(item => ({
        name: item.name.split(" ").slice(0, 2).join(" "), // First two names max
        fullName: item.name,
        sessions: item.sessions
      }))
      .reverse(); // For Recharts horizontal bar, to show highest on top it usually needs to be at the end, but let's check
  }, [stats?.topInstructors]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="أكثر المدربين نشاطاً" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <div className="w-full h-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? COLORS.gridLine.dark : COLORS.gridLine.light} />
            <XAxis 
              type="number" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
            />
            <YAxis 
              type="category" 
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMain.dark : COLORS.textMain.light, fontWeight: 600, textAnchor: 'end', dx: -3 }}
              width={75}
            />
            <Tooltip 
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
              formatter={(value) => [value, "الجلسات"]}
              labelFormatter={(label, payload) => payload?.[0]?.payload.fullName || label}
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#f3f4f6' : '#1f2937',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '4px 8px'
              }}
            />
            <Bar dataKey="sessions" fill={isDark ? COLORS.secondary.dark : COLORS.secondary.light} radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </Panel>
  );
});
