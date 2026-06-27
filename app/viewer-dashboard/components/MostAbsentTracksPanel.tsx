import React, { useMemo } from "react";
import { Panel } from "./Panel";
import { BlacklistEntry } from "@/lib/api";
import { PROGRAM_COLORS } from "../lib/viewerDashboardColors";
import { useTheme } from "next-themes";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface MostAbsentTracksPanelProps {
  blacklist: BlacklistEntry[];
  loading: boolean;
}

export const MostAbsentTracksPanel = React.memo(function MostAbsentTracksPanel({ blacklist, loading }: MostAbsentTracksPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const data = useMemo(() => {
    if (!blacklist || blacklist.length === 0) return [];
    
    // Count absences per track
    const trackCounts: Record<string, number> = {};
    blacklist.forEach(entry => {
      entry.absences.forEach(absence => {
        const track = absence.track || "غير محدد";
        trackCounts[track] = (trackCounts[track] || 0) + 1;
      });
    });

    const entries = Object.entries(trackCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Group small items into "Other" to fit the dense grid panel if > 3
    let finalData = entries;
    if (entries.length > 3) {
      const top3 = entries.slice(0, 3);
      const others = entries.slice(3).reduce((sum, item) => sum + item.value, 0);
      if (others > 0) {
        finalData = [...top3, { name: "أخرى", value: others }];
      }
    }

    // Shorten names for the legend
    const cleanName = (name: string) => {
      if (name.includes("Awareness")) return "Awareness";
      if (name.includes("Consultation")) return "Consultation";
      if (name.length > 15) return name.substring(0, 15) + "..";
      return name;
    };

    return finalData.map((item, index) => ({
      name: cleanName(item.name),
      fullName: item.name,
      value: item.value,
      color: isDark ? PROGRAM_COLORS[index % PROGRAM_COLORS.length].dark : PROGRAM_COLORS[index % PROGRAM_COLORS.length].light
    }));
  }, [blacklist, isDark]);

  const isEmpty = data.length === 0;

  return (
    <Panel title="أكثر المسارات غياباً" isEmpty={isEmpty} loading={loading} className="h-full">
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
              formatter={(value, name, props) => [value, props?.payload?.fullName]}
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
