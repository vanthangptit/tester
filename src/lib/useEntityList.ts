import { useState } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, type StatusFilter } from "@/lib/query";
import type { Paginated } from "@/lib/pagination";

export interface EntityListParams<S extends string> {
  page: number;
  pageSize: number;
  search?: string;
  status?: StatusFilter<S>;
}

export interface EntityList<T, S extends string> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  search: string;
  setSearch: (value: string) => void;
  status: StatusFilter<S>;
  setStatus: (value: StatusFilter<S>) => void;
  setPage: (page: number) => void;
  isLoading: boolean; // first load, no data yet
  isRefreshing: boolean; // re-querying while showing previous data
  error: string | undefined;
  reload: () => void;
  isFiltering: boolean; // a search term or a status filter is active
  clearFilters: () => void;
}

// Generic list state: owns page/search/status, debounces search, resets to page
// 1 when filters change, and drives an async fetcher that returns a Paginated<T>.
// Reused by every entity list (personnel now; courses/enrollments later).
export function useEntityList<T, S extends string>(
  fetcher: (params: EntityListParams<S>) => Promise<Paginated<T>>,
  options?: { pageSize?: number; initialStatus?: StatusFilter<S> },
): EntityList<T, S> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<StatusFilter<S>>(options?.initialStatus ?? "all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };
  const setStatus = (value: StatusFilter<S>) => {
    setStatusState(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchState("");
    setStatusState(options?.initialStatus ?? "all");
    setPage(1);
  };

  const result = useAsyncData<Paginated<T>>(
    () => fetcher({ page, pageSize, search: debouncedSearch, status }),
    [page, pageSize, debouncedSearch, status],
  );

  const data = result.data;
  const isFiltering = debouncedSearch.trim() !== "" || status !== "all";

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageCount: data?.pageCount ?? 1,
    pageSize,
    search,
    setSearch,
    status,
    setStatus,
    setPage,
    isLoading: result.isLoading && data === undefined,
    isRefreshing: result.isLoading && data !== undefined,
    error: result.error,
    reload: result.reload,
    isFiltering,
    clearFilters,
  };
}
