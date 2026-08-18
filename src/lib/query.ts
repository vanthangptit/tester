// Shared shape for list queries. Each repository extends this with its own
// entity-specific `status` filter union.

export const DEFAULT_PAGE_SIZE = 10;

export interface PageParams {
  page: number; // 1-based
  pageSize: number;
}

// "all" is the sentinel meaning "do not filter by status".
export type StatusFilter<S extends string> = S | "all";
