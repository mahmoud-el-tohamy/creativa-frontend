"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional color classes applied to the option row and trigger badge */
  color?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Extra classes on the trigger button */
  className?: string;
  /** Render the trigger as a small colored badge (for role cells in tables) */
  asBadge?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  /** Enables an internal search input to filter options */
  searchable?: boolean;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  className = "",
  asBadge = false,
  disabled = false,
  id,
  ariaLabel,
  searchable = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open, searchable]);

  // Focus input when opened
  useEffect(() => {
    if (open && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, searchable]);

  const filteredOptions = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  if (asBadge) {
    // Compact badge-style trigger used in the users table role column
    return (
      <div ref={ref} className="relative inline-block">
        <button
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            if (!open && searchable) setSearch("");
            setOpen((o) => !o);
          }}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all
            hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50
            ${selected.color ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}
            ${className}`}
        >
          {selected.label}
          <svg
            className={`w-3 h-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-[100] top-full mt-1.5 min-w-[8rem] bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl overflow-hidden"
            style={{ right: 0 }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-right px-4 py-2.5 text-xs font-semibold transition-colors
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  ${o.value === value ? "bg-gray-50 dark:bg-gray-700" : ""}
                  ${o.color ? o.color : "text-gray-700 dark:text-gray-200"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-width filter-style trigger
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!open && searchable) setSearch("");
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-700
          text-gray-800 dark:text-gray-100
          text-sm font-medium
          hover:border-blue-400 dark:hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{selected.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[100] top-full mt-1.5 w-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-600
          rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-64"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-right px-4 py-2.5 text-sm transition-colors
                  hover:bg-blue-50 dark:hover:bg-gray-700
                  ${o.value === value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-gray-700 dark:text-gray-200 font-medium"
                  }`}
              >
                {o.label}
              </button>
            )) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
