import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";
import { COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface ModeSplitPanelProps {
  stats: TrainingStatsResponse | null;
  loading: boolean;
}

export const ModeSplitPanel = React.memo(function ModeSplitPanel({ stats, loading }: ModeSplitPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!stats?.modeBreakdown) return [];
    return [
      { name: "أونلاين", value: stats.modeBreakdown.online, color: isDark ? COLORS.primary.dark : COLORS.primary.light },
      { name: "أوفلاين", value: stats.modeBreakdown.offline, color: isDark ? COLORS.secondary.dark : COLORS.secondary.light },
      { name: "مدمج", value: stats.modeBreakdown.hybrid || 0, color: isDark ? COLORS.warning.dark : COLORS.warning.light },
    ].filter(item => item.value > 0);
  }, [stats?.modeBreakdown, isDark]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="توزيع الجلسات (أونلاين / أوفلاين)" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#f3f4f6' : '#1f2937',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '4px 8px'
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={20}
              iconType="circle"
              iconSize={10}
              formatter={(value) => <span className="mx-2">{value}</span>}
              wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
});
