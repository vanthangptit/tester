import type { Brand } from "@/lib/id";
import { allow, deny, type Guard } from "@/lib/guard";
import type { FieldErrors } from "@/lib/useForm";
import { isEmail, isVNPhone } from "@/lib/validators";

export type TeacherId = Brand<string, "TeacherId">;

// A teacher on long-term leave is "ngừng hoạt động": still on file, but may not
// be assigned to new activities.
export type TeacherStatus = "active" | "on_leave";

export const teacherStatusLabels: Record<TeacherStatus, string> = {
  active: "Đang công tác",
  on_leave: "Nghỉ phép dài hạn",
};

export interface Teacher {
  id: TeacherId;
  code: string; // mã giảng viên, e.g. "GV001"
  fullName: string;
  email: string;
  phone: string;
  specialties: string[]; // kỹ năng / môn phụ trách
  status: TeacherStatus;
  createdAt: string; // ISO datetime
}

export function isTeacherActive(t: Teacher): boolean {
  return t.status === "active";
}

// Editable fields for the create/edit form. Structurally matches TeacherInput
// in the api layer, so validated values can be passed straight to the repo.
export interface TeacherFormValues {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  specialties: string[];
  status: TeacherStatus;
}

export function emptyTeacherForm(): TeacherFormValues {
  return { code: "", fullName: "", email: "", phone: "", specialties: [], status: "active" };
}

export function validateTeacher(v: TeacherFormValues): FieldErrors<TeacherFormValues> {
  const errors: FieldErrors<TeacherFormValues> = {};
  if (v.code.trim() === "") errors.code = "Mã giảng viên là bắt buộc.";
  else if (v.code.trim().length > 20) errors.code = "Mã tối đa 20 ký tự.";
  if (v.fullName.trim().length < 2) errors.fullName = "Họ tên phải có ít nhất 2 ký tự.";
  if (v.email.trim() === "") errors.email = "Email là bắt buộc.";
  else if (!isEmail(v.email)) errors.email = "Email không hợp lệ.";
  if (v.phone.trim() === "") errors.phone = "Số điện thoại là bắt buộc.";
  else if (!isVNPhone(v.phone)) errors.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";
  if (v.specialties.length === 0) errors.specialties = "Cần ít nhất một kỹ năng phụ trách.";
  return errors;
}

// Delete rule: a profile may not be deleted while it is attached to an activity
// that has not finished. For a teacher, that means being assigned to any course
// that is not yet terminal (see courses/domain/course.ts#isCourseTerminal).
// The caller resolves the blocking course titles and passes them in, keeping
// this module free of a dependency on the courses feature.
export function checkTeacherDeletable(activeCourseTitles: readonly string[]): Guard {
  if (activeCourseTitles.length > 0) {
    return deny(
      `Không thể xóa: giảng viên đang phụ trách ${activeCourseTitles.length} khóa chưa kết thúc ` +
        `(${activeCourseTitles.join(", ")}). Hãy kết thúc/hủy hoặc chuyển giao các khóa này trước.`,
    );
  }
  return allow;
}
