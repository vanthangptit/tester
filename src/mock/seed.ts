// Deterministic seed for the in-memory mock backend. No randomness at runtime:
// a small LCG drives name variety so the dataset is identical on every reload.
import { brand } from "@/lib/id";
import type { Teacher, TeacherId } from "@/features/personnel/domain/teacher";
import type { Room, RoomId } from "@/features/personnel/domain/room";
import type { Student, StudentId } from "@/features/personnel/domain/student";
import type { Course, CourseId, CourseStatus } from "@/features/courses/domain/course";
import type { Session, SessionId } from "@/features/courses/domain/session";
import type {
  Enrollment,
  EnrollmentId,
  EnrollmentStatus,
} from "@/features/enrollments/domain/enrollment";

// --- deterministic helpers --------------------------------------------------

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0xff_ff_ff_ff;
  };
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Weekly session dates: `count` occurrences one week apart from `firstDate`.
function weekly(firstDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(firstDate, i * 7));
}

const TIME_BLOCKS = [
  { start: "08:00", end: "10:00" },
  { start: "13:30", end: "15:30" },
  { start: "16:00", end: "18:00" },
] as const;

// --- teachers ---------------------------------------------------------------

const SPECIALTIES = [
  "Giao tiếp",
  "Thuyết trình",
  "Lãnh đạo",
  "Làm việc nhóm",
  "Tư duy phản biện",
  "Quản lý thời gian",
  "Đàm phán",
  "Tin học văn phòng",
];

const TEACHER_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Hoàng Cường",
  "Phạm Thị Dung",
  "Hoàng Minh Đức",
  "Vũ Thị Hà",
  "Đặng Quốc Huy",
  "Bùi Thị Lan",
];

function buildTeachers(): Teacher[] {
  return TEACHER_NAMES.map((fullName, i) => {
    const id = brand<"TeacherId">(`t${pad(i + 1, 3)}`) as TeacherId;
    return {
      id,
      code: `GV${pad(i + 1, 3)}`,
      fullName,
      email: `gv${pad(i + 1, 3)}@sasuco.edu.vn`,
      phone: `090${pad(1_000_000 + i * 111_111, 7)}`,
      specialties: [SPECIALTIES[i % SPECIALTIES.length], SPECIALTIES[(i + 3) % SPECIALTIES.length]],
      // The last teacher is on long-term leave (ngừng hoạt động).
      status: i === TEACHER_NAMES.length - 1 ? "on_leave" : "active",
      createdAt: `2026-01-${pad((i % 27) + 1, 2)}T08:00:00.000Z`,
    };
  });
}

// --- rooms ------------------------------------------------------------------

const ROOMS: ReadonlyArray<{ code: string; name: string; capacity: number }> = [
  { code: "P.101", name: "Phòng Hoa Sen", capacity: 24 },
  { code: "P.102", name: "Phòng Sao Mai", capacity: 28 },
  { code: "P.201", name: "Phòng Bình Minh", capacity: 30 },
  { code: "P.202", name: "Phòng Thái Dương", capacity: 20 },
  { code: "P.301", name: "Phòng Hội Trường", capacity: 36 },
  { code: "P.302", name: "Phòng Kỹ Năng", capacity: 22 },
];

function buildRooms(): Room[] {
  return ROOMS.map((r, i) => ({
    id: brand<"RoomId">(`r${pad(i + 1, 3)}`) as RoomId,
    code: r.code,
    name: r.name,
    capacity: r.capacity,
    // The last room is under maintenance (đang sửa chữa).
    status: i === ROOMS.length - 1 ? "maintenance" : "available",
    createdAt: "2026-01-02T08:00:00.000Z",
  }));
}

// --- students ---------------------------------------------------------------

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
const DEM = ["Văn", "Thị", "Hoàng", "Minh", "Quốc", "Thu", "Gia", "Khánh", "Ngọc", "Hữu", "Đức", "Thanh"];
const TEN = [
  "An", "Bình", "Cường", "Dung", "Đức", "Hà", "Huy", "Lan", "Mai", "Nam",
  "Oanh", "Phúc", "Quân", "Sơn", "Trang", "Uyên", "Vân", "Yến", "Bảo", "Chi",
];

const STUDENT_COUNT = 220;

function buildStudents(): Student[] {
  const rnd = lcg(20_260_818);
  return Array.from({ length: STUDENT_COUNT }, (_, i) => {
    const fullName = `${HO[Math.floor(rnd() * HO.length)]} ${DEM[Math.floor(rnd() * DEM.length)]} ${
      TEN[Math.floor(rnd() * TEN.length)]
    }`;
    const year = 1990 + Math.floor(rnd() * 16); // 1990–2005
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 27);
    return {
      id: brand<"StudentId">(`s${pad(i + 1, 4)}`) as StudentId,
      code: `HV${pad(i + 1, 4)}`,
      fullName,
      email: `hv${pad(i + 1, 4)}@mail.sasuco.vn`,
      phone: `03${pad(10_000_000 + i * 37, 8)}`,
      dateOfBirth: `${year}-${pad(month, 2)}-${pad(day, 2)}`,
      // Every 40th student is on bảo lưu.
      status: i % 40 === 7 ? "reserved" : "active",
      createdAt: "2026-02-01T08:00:00.000Z",
    };
  });
}

// --- courses + sessions + enrollments --------------------------------------

interface CourseSpec {
  code: string;
  title: string;
  teacherIdx: number;
  roomIdx: number;
  status: CourseStatus;
  capacity: number;
  firstSessionDate: string | null; // null => no sessions scheduled yet
  sessionCount: number;
  // Enrollment composition for this course.
  enroll: ReadonlyArray<{ status: EnrollmentStatus; count: number }>;
}

const COURSE_SPECS: readonly CourseSpec[] = [
  {
    code: "KH2026-01",
    title: "Kỹ năng giao tiếp hiệu quả",
    teacherIdx: 0,
    roomIdx: 0,
    status: "running",
    capacity: 24,
    firstSessionDate: "2026-07-20", // Mon, spans past→future around today
    sessionCount: 8,
    enroll: [
      { status: "attending", count: 14 },
      { status: "reserved", count: 1 },
      { status: "cancelled", count: 2 },
    ],
  },
  {
    code: "KH2026-02",
    title: "Thuyết trình chuyên nghiệp",
    teacherIdx: 1,
    roomIdx: 1,
    status: "running",
    capacity: 26,
    firstSessionDate: "2026-07-21", // Tue
    sessionCount: 8,
    enroll: [
      { status: "attending", count: 16 },
      { status: "reserved", count: 2 },
      { status: "cancelled", count: 1 },
    ],
  },
  {
    code: "KH2026-03",
    title: "Lãnh đạo bản thân",
    teacherIdx: 2,
    roomIdx: 2,
    status: "open",
    capacity: 28,
    firstSessionDate: "2026-08-19", // Wed, upcoming
    sessionCount: 8,
    enroll: [
      { status: "confirmed", count: 12 },
      { status: "pending", count: 4 },
      { status: "cancelled", count: 1 },
    ],
  },
  {
    code: "KH2026-04",
    title: "Làm việc nhóm",
    teacherIdx: 3,
    roomIdx: 3,
    status: "open",
    capacity: 20,
    firstSessionDate: "2026-08-20", // Thu
    sessionCount: 8,
    enroll: [
      { status: "confirmed", count: 9 },
      { status: "pending", count: 3 },
      { status: "waitlisted", count: 2 },
    ],
  },
  {
    code: "KH2026-05",
    title: "Tư duy phản biện",
    teacherIdx: 4,
    roomIdx: 4,
    status: "open",
    capacity: 30,
    firstSessionDate: "2026-08-21", // Fri
    sessionCount: 8,
    // Deliberately under the min-8 threshold to exercise the khai giảng rule.
    enroll: [
      { status: "confirmed", count: 5 },
      { status: "pending", count: 3 },
    ],
  },
  {
    code: "KH2026-06",
    title: "Quản lý thời gian",
    teacherIdx: 5,
    roomIdx: 0,
    status: "draft",
    capacity: 24,
    firstSessionDate: null,
    sessionCount: 0,
    enroll: [],
  },
  {
    code: "KH2026-07",
    title: "Đàm phán & thương lượng",
    teacherIdx: 6,
    roomIdx: 1,
    status: "draft",
    capacity: 26,
    firstSessionDate: null,
    sessionCount: 0,
    enroll: [],
  },
  {
    code: "KH2026-08",
    title: "Tin học văn phòng nâng cao",
    teacherIdx: 0,
    roomIdx: 4,
    status: "completed",
    capacity: 30,
    firstSessionDate: "2026-05-06", // Wed, in the past
    sessionCount: 8,
    enroll: [
      { status: "completed", count: 18 },
      { status: "cancelled", count: 2 },
    ],
  },
  {
    code: "KH2026-09",
    title: "Kỹ năng phỏng vấn",
    teacherIdx: 7, // teacher on leave — allowed only because course is cancelled
    roomIdx: 2,
    status: "cancelled",
    capacity: 28,
    firstSessionDate: null,
    sessionCount: 0,
    enroll: [{ status: "cancelled", count: 3 }],
  },
  {
    code: "KH2026-10",
    title: "Giao tiếp nâng cao",
    teacherIdx: 1,
    roomIdx: 3,
    status: "completed",
    capacity: 20,
    firstSessionDate: "2026-04-24", // Fri, in the past
    sessionCount: 8,
    enroll: [{ status: "completed", count: 15 }],
  },
];

interface CourseGraph {
  courses: Course[];
  sessions: Session[];
  enrollments: Enrollment[];
}

function buildCourseGraph(teachers: Teacher[], rooms: Room[], students: Student[]): CourseGraph {
  const courses: Course[] = [];
  const sessions: Session[] = [];
  const enrollments: Enrollment[] = [];
  let studentCursor = 0; // each enrollment consumes the next student
  let sessionSeq = 0;
  let enrollSeq = 0;

  COURSE_SPECS.forEach((spec, i) => {
    const id = brand<"CourseId">(`c${pad(i + 1, 3)}`) as CourseId;
    const course: Course = {
      id,
      code: spec.code,
      title: spec.title,
      teacherId: teachers[spec.teacherIdx].id,
      roomId: rooms[spec.roomIdx].id,
      // Start date follows the first scheduled session when present.
      startDate: spec.firstSessionDate ?? "2026-09-01",
      capacity: spec.capacity,
      status: spec.status,
      createdAt: "2026-03-01T08:00:00.000Z",
    };
    courses.push(course);

    // Sessions: unique (weekday, time-block) per course index guarantees no
    // teacher/room double-booking anywhere in the seed.
    if (spec.firstSessionDate && spec.sessionCount > 0) {
      const block = TIME_BLOCKS[Math.floor(i / 5) % TIME_BLOCKS.length];
      for (const date of weekly(spec.firstSessionDate, spec.sessionCount)) {
        sessionSeq += 1;
        sessions.push({
          id: brand<"SessionId">(`ss${pad(sessionSeq, 4)}`) as SessionId,
          courseId: id,
          date,
          startTime: block.start,
          endTime: block.end,
        });
      }
    }

    // Enrollments: pull distinct students sequentially.
    for (const group of spec.enroll) {
      for (let k = 0; k < group.count; k += 1) {
        const student = students[studentCursor % students.length];
        studentCursor += 1;
        enrollSeq += 1;
        enrollments.push({
          id: brand<"EnrollmentId">(`e${pad(enrollSeq, 4)}`) as EnrollmentId,
          studentId: student.id,
          courseId: id,
          status: group.status,
          createdAt: "2026-03-15T08:00:00.000Z",
        });
      }
    }
  });

  return { courses, sessions, enrollments };
}

export interface Seed {
  teachers: Teacher[];
  rooms: Room[];
  students: Student[];
  courses: Course[];
  sessions: Session[];
  enrollments: Enrollment[];
}

export function buildSeed(): Seed {
  const teachers = buildTeachers();
  const rooms = buildRooms();
  const students = buildStudents();
  const { courses, sessions, enrollments } = buildCourseGraph(teachers, rooms, students);
  return { teachers, rooms, students, courses, sessions, enrollments };
}
