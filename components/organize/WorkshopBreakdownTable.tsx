"use client";

type WorkshopBreakdownTableProps = {
  groups: Map<string, Record<string, unknown>[]>;
  total: number;
};

export default function WorkshopBreakdownTable({
  groups,
  total,
}: WorkshopBreakdownTableProps) {
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "غير محدد") return 1;
    if (b === "غير محدد") return -1;
    return a.localeCompare(b);
  });

  const bgColors = [
    "bg-teal-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-blue-500",
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
          الـ Workshops المكتشفة
        </h3>
      </div>
      <div className="max-h-[250px] overflow-x-auto overflow-y-auto">
        <table className="w-full text-right text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th className="w-1/2 px-4 py-2 font-medium text-gray-500 dark:text-gray-400">
                Workshop Name
              </th>
              <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">
                عدد المتدربين
              </th>
              <th className="w-1/3 px-4 py-2 font-medium text-gray-500 dark:text-gray-400">
                نسبة من الإجمالي
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {sortedKeys.map((key, idx) => {
              const count = groups.get(key)!.length;
              const percent = total > 0 ? (count / total) * 100 : 0;
              const colorClass = bgColors[idx % bgColors.length];

              return (
                <tr
                  key={key}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${colorClass}`} />
                      <span className="truncate">{key}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                    {count}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${colorClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs font-medium text-gray-500">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
