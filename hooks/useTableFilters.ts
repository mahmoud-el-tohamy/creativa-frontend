import { useReducer } from "react";

export type FilterState = {
  search: string;
  status: "all" | "expiring" | "active";
  dateFrom: string;
  dateTo: string;
  sort: string;
};

export type FilterAction = 
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_STATUS"; payload: FilterState["status"] }
  | { type: "SET_DATE_FROM"; payload: string }
  | { type: "SET_DATE_TO"; payload: string }
  | { type: "SET_SORT"; payload: string }
  | { type: "RESET" };

const initialFilters: FilterState = {
  search: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_SEARCH": return { ...state, search: action.payload };
    case "SET_STATUS": return { ...state, status: action.payload };
    case "SET_DATE_FROM": return { ...state, dateFrom: action.payload };
    case "SET_DATE_TO": return { ...state, dateTo: action.payload };
    case "SET_SORT": return { ...state, sort: action.payload };
    case "RESET": return initialFilters;
    default: return state;
  }
}

export function useTableFilters(initialState: Partial<FilterState> = {}) {
  return useReducer(filterReducer, { ...initialFilters, ...initialState });
}
