import { useForm } from "@/lib/useForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/ui/Dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/ui/Select";
import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { Spinner } from "@/ui/Spinner";
import { roomRepo, type RoomInput } from "@/features/personnel/api/personnelRepo";
import {
  type Room,
  type RoomStatus,
  type RoomFormValues,
  emptyRoomForm,
  validateRoom,
  parseCapacity,
  roomStatusLabels,
} from "@/features/personnel/domain/room";

const statusOptions: ReadonlyArray<{ value: RoomStatus; label: string }> = [
  { value: "available", label: roomStatusLabels.available },
  { value: "maintenance", label: roomStatusLabels.maintenance },
];

function toValues(r: Room): RoomFormValues {
  return { code: r.code, name: r.name, capacity: String(r.capacity), status: r.status };
}

// The form keeps capacity as text; validation guarantees it parses here.
function toInput(values: RoomFormValues): RoomInput {
  return {
    code: values.code,
    name: values.name,
    capacity: parseCapacity(values.capacity) ?? 0,
    status: values.status,
  };
}

export interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Room | null;
  onSaved: () => void;
}

export function RoomFormDialog({ open, onOpenChange, entity, onSaved }: RoomFormDialogProps) {
  const form = useForm<RoomFormValues>(entity ? toValues(entity) : emptyRoomForm(), validateRoom);

  const submit = (values: RoomFormValues) => {
    form.setSubmitting(true);
    const input = toInput(values);
    const action = entity ? roomRepo.update(entity.id, input) : roomRepo.create(input);
    action
      .then(() => onSaved())
      .catch((e: unknown) => {
        form.setFormError(e instanceof Error ? e.message : "Lưu không thành công.");
        form.setSubmitting(false);
      });
  };

  const onStatusChange = (raw: string) => {
    const option = statusOptions.find((o) => o.value === raw);
    if (option) form.setValues((v) => ({ ...v, status: option.value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entity ? "Sửa phòng học" : "Thêm phòng học"}</DialogTitle>
          <DialogDescription>
            {entity ? `Cập nhật thông tin phòng ${entity.code}.` : "Điền thông tin phòng học mới."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(submit);
          }}
          className="space-y-4"
        >
          {form.formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">
              {form.formError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mã phòng" htmlFor="r-code" required error={form.showError("code")}>
              <Input
                id="r-code"
                value={form.values.code}
                onChange={(e) => form.setValues((v) => ({ ...v, code: e.target.value }))}
                onBlur={() => form.touch("code")}
                placeholder="VD: P.303"
              />
            </Field>
            <Field label="Trạng thái" htmlFor="r-status">
              <Select value={form.values.status} onValueChange={onStatusChange}>
                <SelectTrigger id="r-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Tên phòng" htmlFor="r-name" required error={form.showError("name")}>
            <Input
              id="r-name"
              value={form.values.name}
              onChange={(e) => form.setValues((v) => ({ ...v, name: e.target.value }))}
              onBlur={() => form.touch("name")}
              placeholder="VD: Phòng Ánh Dương"
            />
          </Field>

          <Field
            label="Sức chứa"
            htmlFor="r-capacity"
            required
            error={form.showError("capacity")}
            description="Số học viên tối đa phòng có thể chứa."
            className="sm:max-w-48"
          >
            <Input
              id="r-capacity"
              type="number"
              min={1}
              inputMode="numeric"
              value={form.values.capacity}
              onChange={(e) => form.setValues((v) => ({ ...v, capacity: e.target.value }))}
              onBlur={() => form.touch("capacity")}
              placeholder="VD: 30"
            />
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.submitting}>
              {form.submitting ? <Spinner className="h-4 w-4" /> : null}
              {entity ? "Lưu thay đổi" : "Thêm phòng học"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
