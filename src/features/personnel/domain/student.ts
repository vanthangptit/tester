import type { Brand } from "@/lib/id";
import { allow, deny, type Guard } from "@/lib/guard";
import type { FieldErrors } from "@/lib/useForm";
import { isEmail, isVNPhone, isIsoDate, isFutureDate } from "@/lib/validators";

export type StudentId = Brand<string, "StudentId">;

// "reserved" = bảo lưu: the student is on hold and may not join new activities.
export type StudentStatus = "active" | "reserved";

export const studentStatusLabels: Record<StudentStatus, string> = {
  active: "Đang học",
  reserved: "Bảo lưu",
};

export interface Student {
  id: StudentId;
  code: string; // mã học viên, e.g. "HV0001"
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // "YYYY-MM-DD"
  status: StudentStatus;
  createdAt: string; // ISO datetime
}

export function isStudentActive(s: Student): boolean {
  return s.status === "active";
}

export interface StudentFormValues {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  status: StudentStatus;
}

export function emptyStudentForm(): StudentFormValues {
  return { code: "", fullName: "", email: "", phone: "", dateOfBirth: "", status: "active" };
}

export function validateStudent(v: StudentFormValues): FieldErrors<StudentFormValues> {
  const errors: FieldErrors<StudentFormValues> = {};
  if (v.code.trim() === "") errors.code = "Mã học viên là bắt buộc.";
  else if (v.code.trim().length > 20) errors.code = "Mã tối đa 20 ký tự.";
  if (v.fullName.trim().length < 2) errors.fullName = "Họ tên phải có ít nhất 2 ký tự.";
  if (v.email.trim() === "") errors.email = "Email là bắt buộc.";
  else if (!isEmail(v.email)) errors.email = "Email không hợp lệ.";
  if (v.phone.trim() === "") errors.phone = "Số điện thoại là bắt buộc.";
  else if (!isVNPhone(v.phone)) errors.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";
  if (v.dateOfBirth.trim() === "") errors.dateOfBirth = "Ngày sinh là bắt buộc.";
  else if (!isIsoDate(v.dateOfBirth)) errors.dateOfBirth = "Ngày sinh không hợp lệ.";
  else if (isFutureDate(v.dateOfBirth)) errors.dateOfBirth = "Ngày sinh không thể ở tương lai.";
  return errors;
}

// Delete rule: cannot delete a student who still holds an enrollment that has
// not finished. The caller resolves the blocking course titles (enrollments in
// a non-terminal state) and passes them in.
export function checkStudentDeletable(activeCourseTitles: readonly string[]): Guard {
  if (activeCourseTitles.length > 0) {
    return deny(
      `Không thể xóa: học viên đang có ${activeCourseTitles.length} đăng ký chưa kết thúc ` +
        `(${activeCourseTitles.join(", ")}). Hãy hủy các đăng ký này trước.`,
    );
  }
  return allow;
}
