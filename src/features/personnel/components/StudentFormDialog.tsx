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
import { studentRepo } from "@/features/personnel/api/personnelRepo";
import {
  type Student,
  type StudentStatus,
  type StudentFormValues,
  emptyStudentForm,
  validateStudent,
  studentStatusLabels,
} from "@/features/personnel/domain/student";

const statusOptions: ReadonlyArray<{ value: StudentStatus; label: string }> = [
  { value: "active", label: studentStatusLabels.active },
  { value: "reserved", label: studentStatusLabels.reserved },
];

function toValues(s: Student): StudentFormValues {
  return {
    code: s.code,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    dateOfBirth: s.dateOfBirth,
    status: s.status,
  };
}

export interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Student | null;
  onSaved: () => void;
}

export function StudentFormDialog({ open, onOpenChange, entity, onSaved }: StudentFormDialogProps) {
  const form = useForm<StudentFormValues>(
    entity ? toValues(entity) : emptyStudentForm(),
    validateStudent,
  );

  const submit = (values: StudentFormValues) => {
    form.setSubmitting(true);
    const action = entity ? studentRepo.update(entity.id, values) : studentRepo.create(values);
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
          <DialogTitle>{entity ? "Sửa hồ sơ học viên" : "Thêm học viên"}</DialogTitle>
          <DialogDescription>
            {entity ? `Cập nhật thông tin của ${entity.fullName}.` : "Điền thông tin học viên mới."}
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
            <Field label="Mã học viên" htmlFor="s-code" required error={form.showError("code")}>
              <Input
                id="s-code"
                value={form.values.code}
                onChange={(e) => form.setValues((v) => ({ ...v, code: e.target.value }))}
                onBlur={() => form.touch("code")}
                placeholder="VD: HV0221"
              />
            </Field>
            <Field label="Trạng thái" htmlFor="s-status">
              <Select value={form.values.status} onValueChange={onStatusChange}>
                <SelectTrigger id="s-status">
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

          <Field label="Họ và tên" htmlFor="s-name" required error={form.showError("fullName")}>
            <Input
              id="s-name"
              value={form.values.fullName}
              onChange={(e) => form.setValues((v) => ({ ...v, fullName: e.target.value }))}
              onBlur={() => form.touch("fullName")}
              placeholder="VD: Trần Thị B"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="s-email" required error={form.showError("email")}>
              <Input
                id="s-email"
                type="email"
                value={form.values.email}
                onChange={(e) => form.setValues((v) => ({ ...v, email: e.target.value }))}
                onBlur={() => form.touch("email")}
                placeholder="ten@mail.sasuco.vn"
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="s-phone" required error={form.showError("phone")}>
              <Input
                id="s-phone"
                value={form.values.phone}
                onChange={(e) => form.setValues((v) => ({ ...v, phone: e.target.value }))}
                onBlur={() => form.touch("phone")}
                placeholder="0901234567"
              />
            </Field>
          </div>

          <Field
            label="Ngày sinh"
            htmlFor="s-dob"
            required
            error={form.showError("dateOfBirth")}
            className="sm:max-w-56"
          >
            <Input
              id="s-dob"
              type="date"
              value={form.values.dateOfBirth}
              onChange={(e) => form.setValues((v) => ({ ...v, dateOfBirth: e.target.value }))}
              onBlur={() => form.touch("dateOfBirth")}
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
              {entity ? "Lưu thay đổi" : "Thêm học viên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
