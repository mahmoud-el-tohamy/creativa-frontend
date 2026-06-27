import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { DashboardStatsResponse } from "../lib/viewerDashboardTypes";
import { COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface AdditionRatePanelProps {
  dashboardStats: DashboardStatsResponse | null;
  loading: boolean;
}

export const AdditionRatePanel = React.memo(function AdditionRatePanel({ dashboardStats, loading }: AdditionRatePanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!dashboardStats?.data || dashboardStats.data.length === 0) return [];
    
    // Convert array to match chart expected format and remove items where both are 0 if we want
    return dashboardStats.data.map(item => ({
      name: item.label,
      fullName: item.fullLabel || item.label,
      additions: item.additions,
      cumulative: item.cumulative
    }));
  }, [dashboardStats]);

  const isEmpty = data.length === 0 || data.every(d => d.cumulative === 0 && d.additions === 0);

  return (
    <Panel title="معدل الإضافة للبلاك ليست" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? COLORS.gridLine.dark : COLORS.gridLine.light} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? COLORS.textMuted.dark : COLORS.textMuted.light }}
              dy={5}
            />
            <YAxis 
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
              labelStyle={{ color: isDark ? '#9ca3af' : '#4b5563', marginBottom: '4px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="mx-2">{value}</span>}
            />
            <Area 
              type="monotone" 
              dataKey="cumulative" 
              name="الإجمالي" 
              stroke={isDark ? COLORS.secondary.dark : COLORS.secondary.light} 
              fill={isDark ? COLORS.secondary.dark : COLORS.secondary.light} 
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="additions" 
              name="الجديد" 
              stroke={isDark ? COLORS.danger.dark : COLORS.danger.light} 
              fill={isDark ? COLORS.danger.dark : COLORS.danger.light} 
              fillOpacity={0.5}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
});
