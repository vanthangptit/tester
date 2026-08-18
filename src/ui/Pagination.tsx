import { cn } from "@/lib/utils";
import { Button } from "@/ui/Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Hiển thị <span className="font-medium text-zinc-700 dark:text-zinc-300">{from}</span>–
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{to}</span> trên{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          Trước
        </Button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Trang <span className="font-medium text-zinc-700 dark:text-zinc-300">{page}</span> /{" "}
          {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Trang sau"
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
