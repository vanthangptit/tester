import { useEffect, useState } from "react";
import type { Guard } from "@/lib/guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Spinner } from "@/ui/Spinner";

type Phase =
  | { kind: "checking" }
  | { kind: "ready" } // deletable — show confirm
  | { kind: "blocked"; reason: string } // cannot delete — show reason
  | { kind: "deleting" }
  | { kind: "failed"; message: string };

export interface PersonnelDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityNoun: string; // "giảng viên"
  name: string; // display name of the record
  canRemove: () => Promise<Guard>;
  remove: () => Promise<void>;
  onDeleted: () => void;
}

// Two-phase delete: on open it asks the data layer whether the record can be
// removed. If it is attached to unfinished activity, we show the exact reason
// and offer no confirm button (the rule is prevented, not just messaged).
export function PersonnelDeleteDialog({
  open,
  onOpenChange,
  entityNoun,
  name,
  canRemove,
  remove,
  onDeleted,
}: PersonnelDeleteDialogProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPhase({ kind: "checking" });
    canRemove()
      .then((guard) => {
        if (!active) return;
        setPhase(guard.ok ? { kind: "ready" } : { kind: "blocked", reason: guard.reason });
      })
      .catch((e: unknown) => {
        if (active) setPhase({ kind: "failed", message: e instanceof Error ? e.message : "Đã có lỗi xảy ra." });
      });
    return () => {
      active = false;
    };
    // canRemove is recreated per render by the caller; `open` is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onConfirm = () => {
    setPhase({ kind: "deleting" });
    remove()
      .then(() => onDeleted())
      .catch((e: unknown) =>
        setPhase({ kind: "failed", message: e instanceof Error ? e.message : "Xóa không thành công." }),
      );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Xóa {entityNoun}</DialogTitle>
          <DialogDescription>
            {phase.kind === "blocked"
              ? `Không thể xóa "${name}".`
              : `Bạn có chắc muốn xóa "${name}"? Hành động này không thể hoàn tác.`}
          </DialogDescription>
        </DialogHeader>

        {phase.kind === "checking" ? (
          <div className="flex items-center gap-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Spinner className="h-4 w-4" />
            Đang kiểm tra ràng buộc…
          </div>
        ) : null}

        {phase.kind === "blocked" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {phase.reason}
          </div>
        ) : null}

        {phase.kind === "failed" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {phase.message}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="md">
              {phase.kind === "blocked" ? "Đóng" : "Hủy"}
            </Button>
          </DialogClose>
          {phase.kind === "ready" || phase.kind === "deleting" || phase.kind === "failed" ? (
            <Button
              variant="danger"
              size="md"
              onClick={onConfirm}
              disabled={phase.kind === "deleting"}
            >
              {phase.kind === "deleting" ? <Spinner className="h-4 w-4" /> : null}
              Xóa
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
