import type { Brand } from "@/lib/id";
import type { CourseId } from "@/features/courses/domain/course";

export type SessionId = Brand<string, "SessionId">;

// A concrete scheduled class meeting. Teacher and room are inherited from the
// parent course, so conflict checks resolve them via the course.
export interface Session {
  id: SessionId;
  courseId: CourseId;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}
