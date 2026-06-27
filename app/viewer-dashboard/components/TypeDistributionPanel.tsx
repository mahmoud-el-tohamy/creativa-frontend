import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { TrainingStatsResponse } from "../lib/viewerDashboardTypes";
import { PROGRAM_COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface TypeDistributionPanelProps {
  stats: TrainingStatsResponse | null;
  loading: boolean;
}

export const TypeDistributionPanel = React.memo(function TypeDistributionPanel({ stats, loading }: TypeDistributionPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!stats?.typeBreakdown || stats.typeBreakdown.length === 0) return [];
    
    // Instead of Object.entries mapping, the backend returns array of { type, count, pct }
    const entries = stats.typeBreakdown
      .map(item => ({ name: item.type, value: item.count }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Group small items if more than 3 categories to avoid cramped legend
    let finalData = entries;
    if (entries.length > 3) {
      const top3 = entries.slice(0, 3);
      const others = entries.slice(3).reduce((sum, item) => sum + item.value, 0);
      
      // Look for an existing "أخرى" in top 3
      const existingOtherIndex = top3.findIndex(item => item.name === "أخرى");
      
      if (existingOtherIndex >= 0) {
        top3[existingOtherIndex].value += others;
        finalData = top3;
      } else if (others > 0) {
        finalData = [...top3, { name: "أخرى", value: others }];
      } else {
        finalData = top3;
      }
    }

    // Shorten names for legend
    const cleanName = (name: string) => {
      if (name.includes("(")) return name.split("(")[0].trim();
      return name;
    };

    return finalData.map((item, index) => ({
      name: cleanName(item.name),
      value: item.value,
      color: isDark ? PROGRAM_COLORS[index % PROGRAM_COLORS.length].dark : PROGRAM_COLORS[index % PROGRAM_COLORS.length].light
    }));
  }, [stats?.typeBreakdown, isDark]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="توزيع الفعاليات" isEmpty={isEmpty} loading={loading} className="h-full">
      {!isEmpty && !loading && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="40%"
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
