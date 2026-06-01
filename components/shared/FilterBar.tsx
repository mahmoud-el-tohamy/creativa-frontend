import React, { useState, useRef } from "react";
import CustomSelect from "@/components/ui/CustomSelect";
import { FilterState, FilterAction } from "@/hooks/useTableFilters";

const sortOptions = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "name_asc", label: "الاسم أبجدياً" },
];

interface FilterBarProps {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  totalCount: number;
  filteredCount: number;
  canWrite: boolean;
  validSelectedIds: string[];
  setIsBulkDeleteModalOpen: (open: boolean) => void;
}

export default function FilterBar({ 
  filters, 
  dispatch, 
  totalCount, 
  filteredCount,
  canWrite,
  validSelectedIds,
  setIsBulkDeleteModalOpen
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [prevSearch, setPrevSearch] = useState(filters.search);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setLocalSearch(filters.search);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      dispatch({ type: "SET_SEARCH", payload: value });
    }, 250);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    dispatch({ type: "SET_SEARCH", payload: "" });
  };

  const hasActiveFilters = 
    filters.search !== "" || 
    filters.status !== "all" || 
    filters.dateFrom !== "" || 
    filters.dateTo !== "" || 
    filters.sort !== "newest";

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-6 w-full backdrop-blur-md transition-all duration-300">
      {/* Top Header: Stats + Search */}
      <div className="flex flex-col lg:flex-row-reverse items-stretch lg:items-center gap-4">
        {/* Main Stat Card */}
        <div className="flex items-center justify-between lg:justify-start gap-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 px-5 py-4 dark:from-teal-900/20 dark:to-blue-900/20 border border-teal-100/50 dark:border-teal-800/30 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white dark:bg-gray-800 p-2.5 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-teal-100 dark:ring-teal-900/50">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-0.5">إجمالي القائمة</p>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-50 leading-none">{totalCount}</p>
            </div>
          </div>
        </div>

        {/* Search Integrated */}
        <div className="relative flex-1">
          <label htmlFor="blacklist-search" className="sr-only">ابحث بالاسم أو الرقم القومي</label>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="blacklist-search"
            name="search"
            type="text"
            aria-label="ابحث بالاسم أو الرقم القومي"
            className="block w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 pr-12 pl-12 text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100 dark:placeholder-gray-600"
            placeholder="ابحث بالاسم أو الرقم القومي..."
            value={localSearch}
            onChange={handleSearchChange}
          />
          {localSearch && (
            <button onClick={handleClearSearch} className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Action Row: Filters & Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Status Pills */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mr-1">تصفية حسب الحالة</span>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700/50">
            {['all', 'expiring', 'active'].map((s) => (
              <button
                key={s}
                onClick={() => dispatch({ type: "SET_STATUS", payload: s as FilterState["status"] })}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${filters.status === s ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"}`}
              >
                {s === 'all' ? 'الكل' : s === 'expiring' ? 'سيُحذف قريباً' : 'نشط'}
              </button>
            ))}
          </div>
        </div>

        {/* Date From */}
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-date-from" className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mr-1">من تاريخ</label>
          <input 
            id="filter-date-from"
            name="dateFrom"
            type="date"
            aria-label="من تاريخ"
            value={filters.dateFrom}
            onChange={(e) => dispatch({ type: "SET_DATE_FROM", payload: e.target.value })}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100 transition-all outline-none"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-date-to" className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mr-1">إلى تاريخ</label>
          <input 
            id="filter-date-to"
            name="dateTo"
            type="date"
            aria-label="إلى تاريخ"
            value={filters.dateTo}
            onChange={(e) => dispatch({ type: "SET_DATE_TO", payload: e.target.value })}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100 transition-all outline-none"
          />
        </div>

        {/* Sort */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mr-1">ترتيب النتائج</span>
          <CustomSelect
            value={filters.sort}
            onChange={(val) => dispatch({ type: "SET_SORT", payload: val })}
            options={sortOptions}
            className="w-full"
          />
        </div>
      </div>

      {/* Footer: Results Count + Bulk Actions */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 transition-all duration-300 ${hasActiveFilters ? 'opacity-100' : 'opacity-50'}`}>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
          تم العثور على <span className="font-black text-teal-600 dark:text-teal-400 mx-1">{filteredCount}</span> نتيجة مطابقة
          {hasActiveFilters && (
            <button 
              onClick={() => dispatch({ type: "RESET" })}
              className="mr-3 text-xs text-red-500 hover:text-red-600 font-bold underline underline-offset-2"
            >
              إلغاء التصفية
            </button>
          )}
        </div>

        {/* Bulk Actions Button */}
        {canWrite && validSelectedIds.length > 0 && (
          <div className="flex w-full sm:w-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-800/30 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              حذف المحدد ({validSelectedIds.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
