// Data layer for enrollments (student ↔ course registrations). Enforces: only
// active students may register, only into a course that is accepting
// registration; no duplicate live registration; and seat capacity when a
// registration is moved into a seat (confirmed / attending), auto-waitlisting
// when the course is full.
import { db, delay, clone } from "@/mock/db";
import { nextId } from "@/lib/id";
import { paginate, type Paginated } from "@/lib/pagination";
import { type PageParams, type StatusFilter } from "@/lib/query";
import { matchesQuery } from "@/lib/text";
import { allow, deny, type Guard } from "@/lib/guard";
import {
  type Enrollment,
  type EnrollmentId,
  type EnrollmentStatus,
  canTransitionEnrollment,
  enrollmentStatusLabels,
  isEnrollmentBlocking,
  occupiesSeat,
} from "@/features/enrollments/domain/enrollment";
import { type StudentId, isStudentActive } from "@/features/personnel/domain/student";
import { type CourseId, type CourseStatus, courseStatusLabels } from "@/features/courses/domain/course";

const NOW = () => new Date().toISOString();

// Courses accept new registration while tuyển sinh or đang diễn ra.
function isCourseAcceptingRegistration(status: CourseStatus): boolean {
  return status === "open" || status === "running";
}

function seatedCount(courseId: CourseId): number {
  return db.enrollments.filter((e) => e.courseId === courseId && occupiesSeat(e.status)).length;
}

function hasLiveEnrollment(studentId: StudentId, courseId: CourseId): boolean {
  return db.enrollments.some(
    (e) => e.studentId === studentId && e.courseId === courseId && isEnrollmentBlocking(e.status),
  );
}

export interface EnrollmentQuery extends PageParams {
  search?: string; // matches student code/name or course code/title
  status?: StatusFilter<EnrollmentStatus>;
  courseId?: CourseId;
  studentId?: StudentId;
}

export interface EnrollmentInput {
  studentId: StudentId;
  courseId: CourseId;
}

// Text fields for search join the related student and course.
function searchFields(e: Enrollment): string[] {
  const student = db.students.find((s) => s.id === e.studentId);
  const course = db.courses.find((c) => c.id === e.courseId);
  return [
    student?.code ?? "",
    student?.fullName ?? "",
    course?.code ?? "",
    course?.title ?? "",
  ];
}

export const enrollmentRepo = {
  async list(query: EnrollmentQuery): Promise<Paginated<Enrollment>> {
    await delay();
    const filtered = db.enrollments.filter((e) => {
      const byStatus = !query.status || query.status === "all" || e.status === query.status;
      const byCourse = !query.courseId || e.courseId === query.courseId;
      const byStudent = !query.studentId || e.studentId === query.studentId;
      const bySearch = matchesQuery(searchFields(e), query.search);
      return byStatus && byCourse && byStudent && bySearch;
    });
    return clone(paginate(filtered, query.page, query.pageSize));
  },

  async getById(id: EnrollmentId): Promise<Enrollment> {
    await delay();
    const found = db.enrollments.find((e) => e.id === id);
    if (!found) throw new Error("Không tìm thấy đăng ký.");
    return clone(found);
  },

  async countByStatus(courseId: CourseId): Promise<Record<EnrollmentStatus, number>> {
    await delay(120);
    const counts = {} as Record<EnrollmentStatus, number>;
    for (const status of Object.keys(enrollmentStatusLabels) as EnrollmentStatus[]) {
      counts[status] = 0;
    }
    for (const e of db.enrollments) {
      if (e.courseId === courseId) counts[e.status] += 1;
    }
    return counts;
  },

  // Non-throwing pre-check for the registration dialog.
  checkRegister(input: EnrollmentInput): Guard {
    const student = db.students.find((s) => s.id === input.studentId);
    if (!student) return deny("Học viên không tồn tại.");
    if (!isStudentActive(student)) return deny("Không thể đăng ký: học viên đang bảo lưu.");
    const course = db.courses.find((c) => c.id === input.courseId);
    if (!course) return deny("Khóa học không tồn tại.");
    if (!isCourseAcceptingRegistration(course.status)) {
      return deny(`Khóa "${courseStatusLabels[course.status]}" không nhận đăng ký.`);
    }
    if (hasLiveEnrollment(input.studentId, input.courseId)) {
      return deny("Học viên đã có đăng ký còn hiệu lực trong khóa này.");
    }
    return allow;
  },

  async register(input: EnrollmentInput): Promise<Enrollment> {
    await delay();
    const guard = enrollmentRepo.checkRegister(input);
    if (!guard.ok) throw new Error(guard.reason);
    const course = db.courses.find((c) => c.id === input.courseId)!;
    // Full course → land on the waitlist; otherwise chờ duyệt.
    const full = seatedCount(input.courseId) >= course.capacity;
    const enrollment: Enrollment = {
      id: nextId<"EnrollmentId">("e"),
      studentId: input.studentId,
      courseId: input.courseId,
      status: full ? "waitlisted" : "pending",
      createdAt: NOW(),
    };
    db.enrollments.push(enrollment);
    return clone(enrollment);
  },

  // Non-throwing transition check for the UI.
  checkTransition(id: EnrollmentId, to: EnrollmentStatus): Guard {
    const enrollment = db.enrollments.find((e) => e.id === id);
    if (!enrollment) return deny("Không tìm thấy đăng ký.");
    if (!canTransitionEnrollment(enrollment.status, to)) {
      return deny(
        `Không thể chuyển từ "${enrollmentStatusLabels[enrollment.status]}" sang "${enrollmentStatusLabels[to]}".`,
      );
    }
    // Moving into a seat: student must be active and the course must have room.
    if (occupiesSeat(to) && !occupiesSeat(enrollment.status)) {
      const student = db.students.find((s) => s.id === enrollment.studentId);
      if (!student || !isStudentActive(student)) {
        return deny("Không thể xếp chỗ: học viên đang bảo lưu.");
      }
      const course = db.courses.find((c) => c.id === enrollment.courseId);
      if (course && seatedCount(enrollment.courseId) >= course.capacity) {
        return deny(`Khóa đã đủ ${course.capacity} chỗ. Hãy chuyển học viên khác hoặc dùng danh sách chờ.`);
      }
    }
    return allow;
  },

  async setStatus(id: EnrollmentId, to: EnrollmentStatus): Promise<Enrollment> {
    await delay();
    const guard = enrollmentRepo.checkTransition(id, to);
    if (!guard.ok) throw new Error(guard.reason);
    const enrollment = db.enrollments.find((e) => e.id === id)!;
    enrollment.status = to;
    return clone(enrollment);
  },

  async remove(id: EnrollmentId): Promise<void> {
    await delay();
    const idx = db.enrollments.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Không tìm thấy đăng ký.");
    db.enrollments.splice(idx, 1);
  },
};
