"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional color classes applied to the option row and trigger badge */
  color?: string;
}

interface CustomSelectProps {
  value: string | string[];
  options: SelectOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: any) => void;
  /** Extra classes on the trigger button */
  className?: string;
  /** Render the trigger as a small colored badge (for role cells in tables) */
  asBadge?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  /** Enables an internal search input to filter options */
  searchable?: boolean;
  /** Enables multiple selection */
  multiple?: boolean;
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
  multiple = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItems = multiple 
    ? options.filter((o) => (value as string[]).includes(o.value))
    : options.filter((o) => o.value === value);
    
  const displayLabel = multiple
    ? (selectedItems.length > 0 ? selectedItems.map(o => o.label).join(", ") : "اختر...")
    : (selectedItems[0]?.label ?? options[0]?.label ?? "اختر...");
    
  const selected = selectedItems[0] ?? options[0];

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
          type="button"
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
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
                type="button"
                key={o.value}
                onClick={(e) => { 
                  e.preventDefault();
                  if (multiple) {
                    const currentValues = (value as string[]) || [];
                    if (currentValues.includes(o.value)) {
                      onChange(currentValues.filter(v => v !== o.value));
                    } else {
                      onChange([...currentValues, o.value]);
                    }
                  } else {
                    onChange(o.value); 
                    setOpen(false); 
                  }
                }}
                className={`w-full text-right px-4 py-2.5 text-xs font-semibold transition-colors flex justify-between items-center
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  ${multiple ? ((value as string[]).includes(o.value) ? "bg-gray-50 dark:bg-gray-700" : "") : (o.value === value ? "bg-gray-50 dark:bg-gray-700" : "")}
                  ${o.color ? o.color : "text-gray-700 dark:text-gray-200"}`}
              >
                <span>{o.label}</span>
                {multiple && (value as string[]).includes(o.value) && (
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
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
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
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
        <span className="truncate">{displayLabel}</span>
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
          <div className="overflow-y-auto overflow-x-hidden custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={(e) => { 
                  e.preventDefault();
                  if (multiple) {
                    const currentValues = (value as string[]) || [];
                    if (currentValues.includes(o.value)) {
                      onChange(currentValues.filter(v => v !== o.value));
                    } else {
                      onChange([...currentValues, o.value]);
                    }
                  } else {
                    onChange(o.value); 
                    setOpen(false); 
                  }
                }}
                className={`w-full text-right px-4 py-2.5 text-sm transition-colors break-words whitespace-normal flex justify-between items-center
                  hover:bg-blue-50 dark:hover:bg-gray-700
                  ${multiple 
                    ? ((value as string[]).includes(o.value) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" : "text-gray-700 dark:text-gray-200 font-medium")
                    : (o.value === value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" : "text-gray-700 dark:text-gray-200 font-medium")
                  }`}
              >
                <span>{o.label}</span>
                {multiple && (value as string[]).includes(o.value) && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
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
