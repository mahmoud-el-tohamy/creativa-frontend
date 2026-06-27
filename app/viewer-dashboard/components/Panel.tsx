import React from "react";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isEmpty?: boolean;
  loading?: boolean;
  contentClassName?: string;
}

export const Panel = React.memo(function Panel({ title, children, className = "", isEmpty = false, loading = false, contentClassName = "" }: PanelProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm flex flex-col h-full overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{title}</h3>
      </div>
      <div className={`flex-1 p-3 relative overflow-hidden ${contentClassName}`}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          </div>
        ) : isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/20">
            لا توجد بيانات
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
});
