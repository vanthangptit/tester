import { cn } from "@/lib/utils";
import type { StatusFilter } from "@/lib/query";
import type { EntityList } from "@/lib/useEntityList";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Spinner } from "@/ui/Spinner";
import { EmptyState } from "@/ui/EmptyState";
import { ErrorState } from "@/ui/ErrorState";
import { DataTable, type Column } from "@/ui/DataTable";
import { Pagination } from "@/ui/Pagination";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/ui/Select";

export interface StatusOption<S extends string> {
  value: StatusFilter<S>;
  label: string;
}

export interface EntityListViewProps<T, S extends string> {
  list: EntityList<T, S>;
  columns: ReadonlyArray<Column<T>>;
  getRowKey: (row: T) => string;
  statusOptions: ReadonlyArray<StatusOption<S>>;
  searchPlaceholder: string;
  entityNoun: string; // e.g. "giảng viên"
  emptyTitle: string; // shown when there is genuinely no data
  emptyDescription: string;
  onCreate?: () => void;
}

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
  </svg>
);

const InboxIcon = () => (
  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
  </svg>
);

export function EntityListView<T, S extends string>({
  list,
  columns,
  getRowKey,
  statusOptions,
  searchPlaceholder,
  entityNoun,
  emptyTitle,
  emptyDescription,
  onCreate,
}: EntityListViewProps<T, S>) {
  const onStatusChange = (raw: string) => {
    const option = statusOptions.find((o) => o.value === raw);
    if (option) list.setStatus(option.value);
  };

  const renderBody = () => {
    // Error takes precedence over everything.
    if (list.error) {
      return <ErrorState message={list.error} onRetry={list.reload} />;
    }
    // First load, nothing to show yet.
    if (list.isLoading) {
      return <TableSkeleton columns={columns.length} rows={list.pageSize} />;
    }
    // Success but nothing to show: distinguish the two empty cases.
    if (list.items.length === 0) {
      return list.isFiltering ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Không tìm thấy kết quả"
          description="Không có bản ghi nào khớp bộ lọc hiện tại. Thử đổi từ khóa hoặc trạng thái."
          action={
            <Button variant="secondary" size="sm" onClick={list.clearFilters}>
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<InboxIcon />}
          title={emptyTitle}
          description={emptyDescription}
          action={
            onCreate ? (
              <Button size="sm" onClick={onCreate}>
                {`Thêm ${entityNoun}`}
              </Button>
            ) : undefined
          }
        />
      );
    }
    // Success with data. Dim slightly while a refetch is in flight.
    return (
      <div className={cn(list.isRefreshing && "opacity-60 transition-opacity")}>
        <DataTable columns={columns} rows={list.items} getRowKey={getRowKey} />
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <Pagination
            page={list.page}
            pageCount={list.pageCount}
            pageSize={list.pageSize}
            total={list.total}
            onPageChange={list.setPage}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <SearchIcon />
            </span>
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchPlaceholder}
            />
          </div>
          <Select value={list.status} onValueChange={onStatusChange}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          {list.isRefreshing ? <Spinner className="h-4 w-4 text-zinc-400" /> : null}
          {onCreate ? (
            <Button size="md" onClick={onCreate}>
              <PlusIcon />
              {`Thêm ${entityNoun}`}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {renderBody()}
      </div>
    </div>
  );
}

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      {Array.from({ length: Math.min(rows, 8) }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800/70">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="h-3 flex-1 rounded bg-zinc-100 dark:bg-zinc-800/60" />
          ))}
        </div>
      ))}
    </div>
  );
}
