import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Presentational only. The caller decides which message to show — in particular
// "empty because there is no data" vs "empty because filters matched nothing".
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? <div className="text-zinc-300 dark:text-zinc-600">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
