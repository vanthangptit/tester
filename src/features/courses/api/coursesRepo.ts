// Data layer for courses + their scheduled sessions. Enforces the scheduling
// business rules at write time: no teacher/room double-booking, the weekly load
// cap, only-active teachers/available rooms may be booked, and the min-8 rule
// for khai giảng (open → running).
import { db, delay, clone } from "@/mock/db";
import { nextId } from "@/lib/id";
import { paginate, type Paginated } from "@/lib/pagination";
import { type PageParams, type StatusFilter } from "@/lib/query";
import { matchesQuery } from "@/lib/text";
import { allow, deny, type Guard } from "@/lib/guard";
import {
  type Course,
  type CourseId,
  type CourseStatus,
  canTransitionCourse,
  checkCanStartCourse,
  checkCourseDeletable,
  courseStatusLabels,
  isCourseTerminal,
} from "@/features/courses/domain/course";
import type { Session, SessionId } from "@/features/courses/domain/session";
import {
  type Slot,
  MAX_SESSIONS_PER_WEEK,
  exceedsWeeklyCap,
  findClash,
} from "@/features/courses/domain/scheduling";
import { type TeacherId, isTeacherActive } from "@/features/personnel/domain/teacher";
import { type RoomId, isRoomAvailable } from "@/features/personnel/domain/room";
import {
  countsTowardStart,
  isEnrollmentBlocking,
  occupiesSeat,
} from "@/features/enrollments/domain/enrollment";

const NOW = () => new Date().toISOString();

// --- cross-entity read helpers (synchronous, operate on the store) ----------

function courseSessions(courseId: CourseId): Session[] {
  return db.sessions.filter((s) => s.courseId === courseId);
}

function courseIdsOfTeacher(teacherId: TeacherId): Set<CourseId> {
  return new Set(db.courses.filter((c) => c.teacherId === teacherId).map((c) => c.id));
}

function courseIdsOfRoom(roomId: RoomId): Set<CourseId> {
  return new Set(db.courses.filter((c) => c.roomId === roomId).map((c) => c.id));
}

function toSlot(s: Session): Slot {
  return { date: s.date, startTime: s.startTime, endTime: s.endTime };
}

// Slots already taken by a teacher across all their courses.
function teacherSlots(teacherId: TeacherId): Slot[] {
  const ids = courseIdsOfTeacher(teacherId);
  return db.sessions.filter((s) => ids.has(s.courseId)).map(toSlot);
}

// Slots already taken in a room across all courses booking it.
function roomSlots(roomId: RoomId): Slot[] {
  const ids = courseIdsOfRoom(roomId);
  return db.sessions.filter((s) => ids.has(s.courseId)).map(toSlot);
}

function teacherSessionDates(teacherId: TeacherId): string[] {
  const ids = courseIdsOfTeacher(teacherId);
  return db.sessions.filter((s) => ids.has(s.courseId)).map((s) => s.date);
}

function confirmedCount(courseId: CourseId): number {
  return db.enrollments.filter((e) => e.courseId === courseId && countsTowardStart(e.status)).length;
}

function seatedCount(courseId: CourseId): number {
  return db.enrollments.filter((e) => e.courseId === courseId && occupiesSeat(e.status)).length;
}

function activeEnrollmentCount(courseId: CourseId): number {
  return db.enrollments.filter((e) => e.courseId === courseId && isEnrollmentBlocking(e.status)).length;
}

// --- summary the list/detail screens need -----------------------------------

export interface CourseSummary {
  confirmed: number; // count toward the min-8 khai giảng rule
  seated: number; // occupied seats
  activeEnrollments: number; // non-terminal registrations
  sessions: number;
  canStart: Guard; // result of the khai giảng check
}

export interface TeacherLoad {
  teacherId: TeacherId;
  sessions: number;
}

// --- queries ----------------------------------------------------------------

export interface CourseQuery extends PageParams {
  search?: string;
  status?: StatusFilter<CourseStatus>;
  teacherId?: TeacherId;
  roomId?: RoomId;
}

export interface CourseInput {
  code: string;
  title: string;
  teacherId: TeacherId;
  roomId: RoomId;
  startDate: string;
  capacity: number;
  status: CourseStatus;
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

// Validate a teacher/room assignment: both must exist and be active/available,
// and capacity must fit the room. Returns a Guard rather than throwing.
function checkAssignment(teacherId: TeacherId, roomId: RoomId, capacity: number): Guard {
  const teacher = db.teachers.find((t) => t.id === teacherId);
  if (!teacher) return deny("Giảng viên không tồn tại.");
  if (!isTeacherActive(teacher)) return deny("Không thể gán: giảng viên đang ngừng hoạt động.");
  const room = db.rooms.find((r) => r.id === roomId);
  if (!room) return deny("Phòng học không tồn tại.");
  if (!isRoomAvailable(room)) return deny("Không thể chọn: phòng đang ngừng hoạt động.");
  if (capacity < 1) return deny("Sĩ số tối đa phải lớn hơn 0.");
  if (capacity > room.capacity) {
    return deny(`Sĩ số tối đa (${capacity}) vượt sức chứa phòng ${room.code} (${room.capacity}).`);
  }
  return allow;
}

export const courseRepo = {
  async list(query: CourseQuery): Promise<Paginated<Course>> {
    await delay();
    const filtered = db.courses.filter((c) => {
      const byStatus = !query.status || query.status === "all" || c.status === query.status;
      const byTeacher = !query.teacherId || c.teacherId === query.teacherId;
      const byRoom = !query.roomId || c.roomId === query.roomId;
      const bySearch = matchesQuery([c.code, c.title], query.search);
      return byStatus && byTeacher && byRoom && bySearch;
    });
    return clone(paginate(filtered, query.page, query.pageSize));
  },

  async getById(id: CourseId): Promise<Course> {
    await delay();
    const found = db.courses.find((c) => c.id === id);
    if (!found) throw new Error("Không tìm thấy khóa học.");
    return clone(found);
  },

  async summary(id: CourseId): Promise<CourseSummary> {
    await delay(120);
    const course = db.courses.find((c) => c.id === id);
    if (!course) throw new Error("Không tìm thấy khóa học.");
    return {
      confirmed: confirmedCount(id),
      seated: seatedCount(id),
      activeEnrollments: activeEnrollmentCount(id),
      sessions: courseSessions(id).length,
      canStart: checkCanStartCourse(course.status, confirmedCount(id)),
    };
  },

  async create(input: CourseInput): Promise<Course> {
    await delay();
    if (db.courses.some((c) => normalizeCode(c.code) === normalizeCode(input.code))) {
      throw new Error(`Mã khóa "${input.code}" đã tồn tại.`);
    }
    const assignment = checkAssignment(input.teacherId, input.roomId, input.capacity);
    if (!assignment.ok) throw new Error(assignment.reason);
    const course: Course = { id: nextId<"CourseId">("c"), createdAt: NOW(), ...input };
    db.courses.push(course);
    return clone(course);
  },

  async update(id: CourseId, patch: Partial<CourseInput>): Promise<Course> {
    await delay();
    const course = db.courses.find((c) => c.id === id);
    if (!course) throw new Error("Không tìm thấy khóa học.");
    if (patch.code && db.courses.some((c) => c.id !== id && normalizeCode(c.code) === normalizeCode(patch.code!))) {
      throw new Error(`Mã khóa "${patch.code}" đã tồn tại.`);
    }
    // Re-validate the assignment whenever teacher, room, or capacity changes.
    const nextTeacher = patch.teacherId ?? course.teacherId;
    const nextRoom = patch.roomId ?? course.roomId;
    const nextCapacity = patch.capacity ?? course.capacity;
    if (patch.teacherId || patch.roomId || patch.capacity !== undefined) {
      const assignment = checkAssignment(nextTeacher, nextRoom, nextCapacity);
      if (!assignment.ok) throw new Error(assignment.reason);
    }
    // Status is changed only through setStatus (transition rules apply there).
    const { status: _ignored, ...safePatch } = patch;
    Object.assign(course, safePatch);
    return clone(course);
  },

  // Non-throwing transition check for the UI.
  checkTransition(from: CourseStatus, to: CourseStatus, id: CourseId): Guard {
    if (to === "running") return checkCanStartCourse(from, confirmedCount(id));
    if (!canTransitionCourse(from, to)) {
      return deny(`Không thể chuyển từ "${courseStatusLabels[from]}" sang "${courseStatusLabels[to]}".`);
    }
    return allow;
  },

  async setStatus(id: CourseId, to: CourseStatus): Promise<Course> {
    await delay();
    const course = db.courses.find((c) => c.id === id);
    if (!course) throw new Error("Không tìm thấy khóa học.");
    const guard = courseRepo.checkTransition(course.status, to, id);
    if (!guard.ok) throw new Error(guard.reason);
    course.status = to;
    return clone(course);
  },

  async canRemove(id: CourseId): Promise<Guard> {
    await delay(120);
    const course = db.courses.find((c) => c.id === id);
    if (!course) return deny("Không tìm thấy khóa học.");
    return checkCourseDeletable(course.status, courseSessions(id).length, activeEnrollmentCount(id));
  },

  async remove(id: CourseId): Promise<void> {
    await delay();
    const course = db.courses.find((c) => c.id === id);
    if (!course) throw new Error("Không tìm thấy khóa học.");
    const guard = checkCourseDeletable(course.status, courseSessions(id).length, activeEnrollmentCount(id));
    if (!guard.ok) throw new Error(guard.reason);
    // Cascade: a deletable course is terminal (or empty), so drop its historical
    // sessions and enrollments to avoid orphans.
    db.sessions = db.sessions.filter((s) => s.courseId !== id);
    db.enrollments = db.enrollments.filter((e) => e.courseId !== id);
    db.courses = db.courses.filter((c) => c.id !== id);
  },

  async teacherLoads(): Promise<TeacherLoad[]> {
    await delay(120);
    return db.teachers.map((t) => ({ teacherId: t.id, sessions: teacherSessionDates(t.id).length }));
  },
};

// --- sessions ---------------------------------------------------------------

export interface SessionInput {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

// Full scheduling guard for one candidate slot on a course.
function checkScheduleFor(course: Course, slot: Slot): Guard {
  if (isCourseTerminal(course.status)) {
    return deny(`Không thể xếp lịch cho khóa "${courseStatusLabels[course.status]}".`);
  }
  if (slot.startTime >= slot.endTime) {
    return deny("Giờ kết thúc phải sau giờ bắt đầu.");
  }
  const teacher = db.teachers.find((t) => t.id === course.teacherId);
  if (!teacher || !isTeacherActive(teacher)) {
    return deny("Không thể xếp lịch: giảng viên đang ngừng hoạt động.");
  }
  const room = db.rooms.find((r) => r.id === course.roomId);
  if (!room || !isRoomAvailable(room)) {
    return deny("Không thể xếp lịch: phòng đang ngừng hoạt động.");
  }
  const teacherClash = findClash(slot, teacherSlots(course.teacherId));
  if (teacherClash) {
    return deny(
      `Giảng viên đã có lịch ngày ${teacherClash.date} lúc ${teacherClash.startTime}–${teacherClash.endTime}.`,
    );
  }
  const roomClash = findClash(slot, roomSlots(course.roomId));
  if (roomClash) {
    return deny(
      `Phòng đã được đặt ngày ${roomClash.date} lúc ${roomClash.startTime}–${roomClash.endTime}.`,
    );
  }
  if (exceedsWeeklyCap(teacherSessionDates(course.teacherId), slot.date)) {
    return deny(`Vượt giới hạn ${MAX_SESSIONS_PER_WEEK} buổi/tuần của giảng viên trong tuần này.`);
  }
  return allow;
}

export const sessionRepo = {
  async listByCourse(courseId: CourseId): Promise<Session[]> {
    await delay(120);
    return clone(
      courseSessions(courseId).sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
      ),
    );
  },

  // Non-throwing preview for the schedule dialog.
  async checkSchedule(courseId: CourseId, input: SessionInput): Promise<Guard> {
    await delay(120);
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) return deny("Không tìm thấy khóa học.");
    return checkScheduleFor(course, input);
  },

  async schedule(courseId: CourseId, input: SessionInput): Promise<Session> {
    await delay();
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) throw new Error("Không tìm thấy khóa học.");
    const guard = checkScheduleFor(course, input);
    if (!guard.ok) throw new Error(guard.reason);
    const session: Session = { id: nextId<"SessionId">("ss"), courseId, ...input };
    db.sessions.push(session);
    return clone(session);
  },

  async remove(id: SessionId): Promise<void> {
    await delay();
    const idx = db.sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Không tìm thấy buổi học.");
    db.sessions.splice(idx, 1);
  },
};
