import React from "react";
import { Panel } from "./Panel";
import { BlacklistEntry } from "@/lib/api";

interface WarningsBlacklistTilesProps {
  blacklist: BlacklistEntry[];
  loading: boolean;
}

export const WarningsBlacklistTiles = React.memo(function WarningsBlacklistTiles({ blacklist, loading }: WarningsBlacklistTilesProps) {
  const warning1 = blacklist.filter(e => e.status === "warning" && e.absences?.length === 1).length;
  const warning2 = blacklist.filter(e => e.status === "warning" && e.absences?.length === 2).length;
  const totalBlacklisted = blacklist.filter(e => e.status === "blacklisted").length;

  return (
    <Panel title="ملخص الحظر والإنذارات" loading={loading} className="h-full" contentClassName="flex flex-col gap-2 p-2">
      {!loading && (
        <>
          <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 block">إجمالي الإنذارات</span>
              <div className="flex gap-2 text-[9px] text-amber-500/80 dark:text-amber-500/70 mt-0.5">
                <span>إنذار أول: {warning1}</span>
                <span>إنذار ثاني: {warning2}</span>
              </div>
            </div>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{warning1 + warning2}</span>
          </div>

          <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-500">إجمالي البلاك ليست</span>
            <span className="text-lg font-extrabold text-red-600 dark:text-red-400">{totalBlacklisted}</span>
          </div>
        </>
      )}
    </Panel>
  );
});
