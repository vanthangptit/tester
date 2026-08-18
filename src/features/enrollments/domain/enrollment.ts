import type { Brand } from "@/lib/id";
import type { StudentId } from "@/features/personnel/domain/student";
import type { CourseId } from "@/features/courses/domain/course";

export type EnrollmentId = Brand<string, "EnrollmentId">;

// A student's registration can sit in several states over a course's life:
//   pending    — chờ duyệt
//   confirmed  — đã xác nhận (giữ chỗ, tính vào điều kiện khai giảng)
//   waitlisted — danh sách chờ (khi khóa đã đầy)
//   attending  — đang học (sau khai giảng)
//   reserved   — bảo lưu (tạm dừng, nhả chỗ)
//   completed  — hoàn thành
//   cancelled  — đã hủy
export type EnrollmentStatus =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "attending"
  | "reserved"
  | "completed"
  | "cancelled";

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  waitlisted: "Danh sách chờ",
  attending: "Đang học",
  reserved: "Bảo lưu",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export interface Enrollment {
  id: EnrollmentId;
  studentId: StudentId;
  courseId: CourseId;
  status: EnrollmentStatus;
  createdAt: string; // ISO datetime
}

// Terminal = the registration is closed out; it no longer blocks deleting the
// student or the course.
export function isEnrollmentTerminal(status: EnrollmentStatus): boolean {
  return status === "completed" || status === "cancelled";
}

// Blocking for delete guards: any registration that has not finished.
export function isEnrollmentBlocking(status: EnrollmentStatus): boolean {
  return !isEnrollmentTerminal(status);
}

// Occupies a physical seat toward the course capacity. A reserved (bảo lưu)
// student has released their seat; waitlisted/pending are not yet seated.
export function occupiesSeat(status: EnrollmentStatus): boolean {
  return status === "confirmed" || status === "attending";
}

// Counts toward the minimum-8 khai giảng threshold.
export function countsTowardStart(status: EnrollmentStatus): boolean {
  return status === "confirmed" || status === "attending";
}

// Allowed status transitions. Empty arrays for terminal states.
export const enrollmentTransitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
  pending: ["confirmed", "waitlisted", "cancelled"],
  waitlisted: ["confirmed", "cancelled"],
  confirmed: ["attending", "reserved", "cancelled"],
  reserved: ["attending", "cancelled"],
  attending: ["completed", "reserved", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionEnrollment(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
  return enrollmentTransitions[from].includes(to);
}
