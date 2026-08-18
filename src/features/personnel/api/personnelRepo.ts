// Data layer for personnel + rooms. Async (Promise-based) over the in-memory
// mock store. Enforces the cross-entity business rules that belong to writes:
// inactive profiles cannot be assigned new activity (enforced at the courses /
// enrollments layer), and profiles attached to unfinished activity cannot be
// deleted (enforced here via the domain delete guards).
import { db, delay, clone } from "@/mock/db";
import { nextId } from "@/lib/id";
import { paginate, type Paginated } from "@/lib/pagination";
import { type PageParams, type StatusFilter } from "@/lib/query";
import { matchesQuery } from "@/lib/text";
import type { Guard } from "@/lib/guard";
import {
  type Teacher,
  type TeacherId,
  type TeacherStatus,
  checkTeacherDeletable,
} from "@/features/personnel/domain/teacher";
import {
  type Student,
  type StudentId,
  type StudentStatus,
  checkStudentDeletable,
} from "@/features/personnel/domain/student";
import {
  type Room,
  type RoomId,
  type RoomStatus,
  checkRoomDeletable,
} from "@/features/personnel/domain/room";
import { isCourseTerminal } from "@/features/courses/domain/course";
import { isEnrollmentBlocking } from "@/features/enrollments/domain/enrollment";

const NOW = () => new Date().toISOString();

// Titles of not-yet-finished courses a teacher is assigned to.
function teacherBlockingCourses(id: TeacherId): string[] {
  return db.courses.filter((c) => c.teacherId === id && !isCourseTerminal(c.status)).map((c) => c.title);
}

// Titles of not-yet-finished courses a room is booked for.
function roomBlockingCourses(id: RoomId): string[] {
  return db.courses.filter((c) => c.roomId === id && !isCourseTerminal(c.status)).map((c) => c.title);
}

// Titles of courses where a student still holds a non-terminal enrollment.
function studentBlockingCourses(id: StudentId): string[] {
  const titles: string[] = [];
  for (const e of db.enrollments) {
    if (e.studentId === id && isEnrollmentBlocking(e.status)) {
      const course = db.courses.find((c) => c.id === e.courseId);
      if (course) titles.push(course.title);
    }
  }
  return titles;
}

// --- teachers ---------------------------------------------------------------

export interface TeacherQuery extends PageParams {
  search?: string;
  status?: StatusFilter<TeacherStatus>;
}

export interface TeacherInput {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  specialties: string[];
  status: TeacherStatus;
}

export const teacherRepo = {
  async list(query: TeacherQuery): Promise<Paginated<Teacher>> {
    await delay();
    const filtered = db.teachers.filter((t) => {
      const byStatus = !query.status || query.status === "all" || t.status === query.status;
      const bySearch = matchesQuery([t.code, t.fullName, t.email, t.phone, ...t.specialties], query.search);
      return byStatus && bySearch;
    });
    return clone(paginate(filtered, query.page, query.pageSize));
  },

  async getById(id: TeacherId): Promise<Teacher> {
    await delay();
    const found = db.teachers.find((t) => t.id === id);
    if (!found) throw new Error("Không tìm thấy giảng viên.");
    return clone(found);
  },

  async create(input: TeacherInput): Promise<Teacher> {
    await delay();
    if (db.teachers.some((t) => normalizeCode(t.code) === normalizeCode(input.code))) {
      throw new Error(`Mã giảng viên "${input.code}" đã tồn tại.`);
    }
    const teacher: Teacher = { id: nextId<"TeacherId">("t"), createdAt: NOW(), ...input };
    db.teachers.push(teacher);
    return clone(teacher);
  },

  async update(id: TeacherId, patch: Partial<TeacherInput>): Promise<Teacher> {
    await delay();
    const teacher = db.teachers.find((t) => t.id === id);
    if (!teacher) throw new Error("Không tìm thấy giảng viên.");
    if (patch.code && db.teachers.some((t) => t.id !== id && normalizeCode(t.code) === normalizeCode(patch.code!))) {
      throw new Error(`Mã giảng viên "${patch.code}" đã tồn tại.`);
    }
    Object.assign(teacher, patch);
    return clone(teacher);
  },

  async setStatus(id: TeacherId, status: TeacherStatus): Promise<Teacher> {
    return teacherRepo.update(id, { status });
  },

  // Non-throwing check so the UI can disable the action and show the reason.
  async canRemove(id: TeacherId): Promise<Guard> {
    await delay(120);
    return checkTeacherDeletable(teacherBlockingCourses(id));
  },

  async remove(id: TeacherId): Promise<void> {
    await delay();
    const guard = checkTeacherDeletable(teacherBlockingCourses(id));
    if (!guard.ok) throw new Error(guard.reason);
    const idx = db.teachers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Không tìm thấy giảng viên.");
    db.teachers.splice(idx, 1);
  },
};

// --- students ---------------------------------------------------------------

export interface StudentQuery extends PageParams {
  search?: string;
  status?: StatusFilter<StudentStatus>;
}

export interface StudentInput {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  status: StudentStatus;
}

export const studentRepo = {
  async list(query: StudentQuery): Promise<Paginated<Student>> {
    await delay();
    const filtered = db.students.filter((s) => {
      const byStatus = !query.status || query.status === "all" || s.status === query.status;
      const bySearch = matchesQuery([s.code, s.fullName, s.email, s.phone], query.search);
      return byStatus && bySearch;
    });
    return clone(paginate(filtered, query.page, query.pageSize));
  },

  async getById(id: StudentId): Promise<Student> {
    await delay();
    const found = db.students.find((s) => s.id === id);
    if (!found) throw new Error("Không tìm thấy học viên.");
    return clone(found);
  },

  async create(input: StudentInput): Promise<Student> {
    await delay();
    if (db.students.some((s) => normalizeCode(s.code) === normalizeCode(input.code))) {
      throw new Error(`Mã học viên "${input.code}" đã tồn tại.`);
    }
    const student: Student = { id: nextId<"StudentId">("s"), createdAt: NOW(), ...input };
    db.students.push(student);
    return clone(student);
  },

  async update(id: StudentId, patch: Partial<StudentInput>): Promise<Student> {
    await delay();
    const student = db.students.find((s) => s.id === id);
    if (!student) throw new Error("Không tìm thấy học viên.");
    if (patch.code && db.students.some((s) => s.id !== id && normalizeCode(s.code) === normalizeCode(patch.code!))) {
      throw new Error(`Mã học viên "${patch.code}" đã tồn tại.`);
    }
    Object.assign(student, patch);
    return clone(student);
  },

  async setStatus(id: StudentId, status: StudentStatus): Promise<Student> {
    return studentRepo.update(id, { status });
  },

  async canRemove(id: StudentId): Promise<Guard> {
    await delay(120);
    return checkStudentDeletable(studentBlockingCourses(id));
  },

  async remove(id: StudentId): Promise<void> {
    await delay();
    const guard = checkStudentDeletable(studentBlockingCourses(id));
    if (!guard.ok) throw new Error(guard.reason);
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Không tìm thấy học viên.");
    db.students.splice(idx, 1);
  },
};

// --- rooms ------------------------------------------------------------------

export interface RoomQuery extends PageParams {
  search?: string;
  status?: StatusFilter<RoomStatus>;
}

export interface RoomInput {
  code: string;
  name: string;
  capacity: number;
  status: RoomStatus;
}

export const roomRepo = {
  async list(query: RoomQuery): Promise<Paginated<Room>> {
    await delay();
    const filtered = db.rooms.filter((r) => {
      const byStatus = !query.status || query.status === "all" || r.status === query.status;
      const bySearch = matchesQuery([r.code, r.name], query.search);
      return byStatus && bySearch;
    });
    return clone(paginate(filtered, query.page, query.pageSize));
  },

  async getById(id: RoomId): Promise<Room> {
    await delay();
    const found = db.rooms.find((r) => r.id === id);
    if (!found) throw new Error("Không tìm thấy phòng học.");
    return clone(found);
  },

  async create(input: RoomInput): Promise<Room> {
    await delay();
    if (db.rooms.some((r) => normalizeCode(r.code) === normalizeCode(input.code))) {
      throw new Error(`Mã phòng "${input.code}" đã tồn tại.`);
    }
    const room: Room = { id: nextId<"RoomId">("r"), createdAt: NOW(), ...input };
    db.rooms.push(room);
    return clone(room);
  },

  async update(id: RoomId, patch: Partial<RoomInput>): Promise<Room> {
    await delay();
    const room = db.rooms.find((r) => r.id === id);
    if (!room) throw new Error("Không tìm thấy phòng học.");
    if (patch.code && db.rooms.some((r) => r.id !== id && normalizeCode(r.code) === normalizeCode(patch.code!))) {
      throw new Error(`Mã phòng "${patch.code}" đã tồn tại.`);
    }
    Object.assign(room, patch);
    return clone(room);
  },

  async setStatus(id: RoomId, status: RoomStatus): Promise<Room> {
    return roomRepo.update(id, { status });
  },

  async canRemove(id: RoomId): Promise<Guard> {
    await delay(120);
    return checkRoomDeletable(roomBlockingCourses(id));
  },

  async remove(id: RoomId): Promise<void> {
    await delay();
    const guard = checkRoomDeletable(roomBlockingCourses(id));
    if (!guard.ok) throw new Error(guard.reason);
    const idx = db.rooms.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Không tìm thấy phòng học.");
    db.rooms.splice(idx, 1);
  },
};

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}
