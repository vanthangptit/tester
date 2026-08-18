import type { Brand } from "@/lib/id";
import { allow, deny, type Guard } from "@/lib/guard";
import type { FieldErrors } from "@/lib/useForm";

export type RoomId = Brand<string, "RoomId">;

// "maintenance" = đang sửa chữa: the room may not be booked for new activities.
export type RoomStatus = "available" | "maintenance";

export const roomStatusLabels: Record<RoomStatus, string> = {
  available: "Sẵn sàng",
  maintenance: "Đang sửa chữa",
};

export interface Room {
  id: RoomId;
  code: string; // mã phòng, e.g. "P.101"
  name: string;
  capacity: number; // sức chứa tối đa
  status: RoomStatus;
  createdAt: string; // ISO datetime
}

export function isRoomAvailable(r: Room): boolean {
  return r.status === "available";
}

// Capacity is kept as a raw string in the form (empty while typing) and parsed
// on submit. Everything else maps straight to RoomInput.
export interface RoomFormValues {
  code: string;
  name: string;
  capacity: string;
  status: RoomStatus;
}

export const MAX_ROOM_CAPACITY = 500;

export function emptyRoomForm(): RoomFormValues {
  return { code: "", name: "", capacity: "", status: "available" };
}

export function parseCapacity(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export function validateRoom(v: RoomFormValues): FieldErrors<RoomFormValues> {
  const errors: FieldErrors<RoomFormValues> = {};
  if (v.code.trim() === "") errors.code = "Mã phòng là bắt buộc.";
  else if (v.code.trim().length > 20) errors.code = "Mã tối đa 20 ký tự.";
  if (v.name.trim().length < 2) errors.name = "Tên phòng phải có ít nhất 2 ký tự.";
  const capacity = parseCapacity(v.capacity);
  if (v.capacity.trim() === "") errors.capacity = "Sức chứa là bắt buộc.";
  else if (capacity === null) errors.capacity = "Sức chứa phải là số nguyên.";
  else if (capacity < 1) errors.capacity = "Sức chứa phải lớn hơn 0.";
  else if (capacity > MAX_ROOM_CAPACITY) errors.capacity = `Sức chứa tối đa ${MAX_ROOM_CAPACITY}.`;
  return errors;
}

// Delete rule: cannot delete a room booked by any course that has not finished.
export function checkRoomDeletable(activeCourseTitles: readonly string[]): Guard {
  if (activeCourseTitles.length > 0) {
    return deny(
      `Không thể xóa: phòng đang được ${activeCourseTitles.length} khóa chưa kết thúc sử dụng ` +
        `(${activeCourseTitles.join(", ")}). Hãy đổi phòng hoặc kết thúc các khóa này trước.`,
    );
  }
  return allow;
}
