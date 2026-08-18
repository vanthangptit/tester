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
import { TagInput } from "@/ui/TagInput";
import { teacherRepo } from "@/features/personnel/api/personnelRepo";
import {
  type Teacher,
  type TeacherStatus,
  type TeacherFormValues,
  emptyTeacherForm,
  validateTeacher,
  teacherStatusLabels,
} from "@/features/personnel/domain/teacher";

const statusOptions: ReadonlyArray<{ value: TeacherStatus; label: string }> = [
  { value: "active", label: teacherStatusLabels.active },
  { value: "on_leave", label: teacherStatusLabels.on_leave },
];

function toValues(t: Teacher): TeacherFormValues {
  return {
    code: t.code,
    fullName: t.fullName,
    email: t.email,
    phone: t.phone,
    specialties: [...t.specialties],
    status: t.status,
  };
}

export interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Teacher | null; // null => create
  onSaved: () => void;
}

export function TeacherFormDialog({ open, onOpenChange, entity, onSaved }: TeacherFormDialogProps) {
  const form = useForm<TeacherFormValues>(
    entity ? toValues(entity) : emptyTeacherForm(),
    validateTeacher,
  );

  const submit = (values: TeacherFormValues) => {
    form.setSubmitting(true);
    const action = entity ? teacherRepo.update(entity.id, values) : teacherRepo.create(values);
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
          <DialogTitle>{entity ? "Sửa hồ sơ giảng viên" : "Thêm giảng viên"}</DialogTitle>
          <DialogDescription>
            {entity ? `Cập nhật thông tin của ${entity.fullName}.` : "Điền thông tin giảng viên mới."}
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
            <Field label="Mã giảng viên" htmlFor="t-code" required error={form.showError("code")}>
              <Input
                id="t-code"
                value={form.values.code}
                onChange={(e) => form.setValues((v) => ({ ...v, code: e.target.value }))}
                onBlur={() => form.touch("code")}
                placeholder="VD: GV009"
              />
            </Field>
            <Field label="Trạng thái" htmlFor="t-status">
              <Select value={form.values.status} onValueChange={onStatusChange}>
                <SelectTrigger id="t-status">
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

          <Field label="Họ và tên" htmlFor="t-name" required error={form.showError("fullName")}>
            <Input
              id="t-name"
              value={form.values.fullName}
              onChange={(e) => form.setValues((v) => ({ ...v, fullName: e.target.value }))}
              onBlur={() => form.touch("fullName")}
              placeholder="VD: Nguyễn Văn A"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="t-email" required error={form.showError("email")}>
              <Input
                id="t-email"
                type="email"
                value={form.values.email}
                onChange={(e) => form.setValues((v) => ({ ...v, email: e.target.value }))}
                onBlur={() => form.touch("email")}
                placeholder="ten@sasuco.edu.vn"
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="t-phone" required error={form.showError("phone")}>
              <Input
                id="t-phone"
                value={form.values.phone}
                onChange={(e) => form.setValues((v) => ({ ...v, phone: e.target.value }))}
                onBlur={() => form.touch("phone")}
                placeholder="0901234567"
              />
            </Field>
          </div>

          <Field
            label="Kỹ năng phụ trách"
            htmlFor="t-specialties"
            required
            error={form.showError("specialties")}
            description="Nhấn Enter hoặc dấu phẩy để thêm."
          >
            <TagInput
              id="t-specialties"
              value={form.values.specialties}
              onChange={(tags) => form.setValues((v) => ({ ...v, specialties: tags }))}
              onBlur={() => form.touch("specialties")}
              invalid={Boolean(form.showError("specialties"))}
              placeholder="VD: Giao tiếp"
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
              {entity ? "Lưu thay đổi" : "Thêm giảng viên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
