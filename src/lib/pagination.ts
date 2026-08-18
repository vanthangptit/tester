// Generic, framework-free pagination. Lists here can run to hundreds of records,
// so every repository returns a Paginated<T> slice rather than the whole array.

export interface Paginated<T> {
  items: T[];
  total: number; // total matching records (before slicing)
  page: number; // 1-based, clamped into range
  pageSize: number;
  pageCount: number; // always >= 1 so the UI never shows "page 1 of 0"
}

export function paginate<T>(all: readonly T[], page: number, pageSize: number): Paginated<T> {
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (safePage - 1) * pageSize;
  return {
    items: all.slice(startIndex, startIndex + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}
