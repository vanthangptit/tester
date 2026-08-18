import type { Brand } from "@/lib/id";
import type { TeacherId } from "@/features/personnel/domain/teacher";
import type { RoomId } from "@/features/personnel/domain/room";
import { allow, deny, type Guard } from "@/lib/guard";

export type CourseId = Brand<string, "CourseId">;

// Lifecycle:
//   draft     — đang soạn, chưa mở đăng ký
//   open      — đang tuyển sinh (nhận đăng ký)
//   running   — đã khai giảng, đang diễn ra
//   completed — đã kết thúc
//   cancelled — đã hủy
export type CourseStatus = "draft" | "open" | "running" | "completed" | "cancelled";

export const courseStatusLabels: Record<CourseStatus, string> = {
  draft: "Đang soạn",
  open: "Đang tuyển sinh",
  running: "Đang diễn ra",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
};

// Business rule: a course may only khai giảng (open → running) with at least
// this many confirmed enrollments.
export const MIN_ENROLLMENT_TO_START = 8;

export interface Course {
  id: CourseId;
  code: string; // mã khóa, e.g. "KH2026-01"
  title: string;
  teacherId: TeacherId; // giảng viên phụ trách
  roomId: RoomId;
  startDate: string; // "YYYY-MM-DD" ngày khai giảng
  capacity: number; // số học viên tối đa (<= sức chứa phòng)
  status: CourseStatus;
  createdAt: string; // ISO datetime
}

// A terminal course is one that has finished for good. Terminal courses no
// longer count as "hoạt động chưa kết thúc" for delete guards.
export function isCourseTerminal(status: CourseStatus): boolean {
  return status === "completed" || status === "cancelled";
}

// Allowed status transitions. Empty arrays for terminal states.
export const courseTransitions: Record<CourseStatus, readonly CourseStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["running", "cancelled"],
  running: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionCourse(from: CourseStatus, to: CourseStatus): boolean {
  return courseTransitions[from].includes(to);
}

// Guard for khai giảng (open → running): enough confirmed students AND the
// transition itself is legal.
export function checkCanStartCourse(status: CourseStatus, confirmedCount: number): Guard {
  if (!canTransitionCourse(status, "running")) {
    return deny(`Chỉ khóa đang tuyển sinh mới được khai giảng (trạng thái hiện tại: ${courseStatusLabels[status]}).`);
  }
  if (confirmedCount < MIN_ENROLLMENT_TO_START) {
    return deny(
      `Khóa cần tối thiểu ${MIN_ENROLLMENT_TO_START} học viên đã xác nhận để khai giảng ` +
        `(hiện có ${confirmedCount}).`,
    );
  }
  return allow;
}

// Delete rule: a course attached to unfinished activity (any non-terminal
// status, or having scheduled sessions/active enrollments) cannot be deleted.
export function checkCourseDeletable(
  status: CourseStatus,
  sessionCount: number,
  activeEnrollmentCount: number,
): Guard {
  if (!isCourseTerminal(status)) {
    if (activeEnrollmentCount > 0) {
      return deny(
        `Không thể xóa: khóa "${courseStatusLabels[status]}" đang có ${activeEnrollmentCount} đăng ký ` +
          `chưa kết thúc. Hãy hủy khóa trước khi xóa.`,
      );
    }
    if (sessionCount > 0) {
      return deny(
        `Không thể xóa: khóa đang có ${sessionCount} buổi học đã lên lịch. Hãy hủy khóa trước khi xóa.`,
      );
    }
  }
  return allow;
}
