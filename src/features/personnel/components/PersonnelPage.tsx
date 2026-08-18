import { useState } from "react";
import { Tabs, type TabItem } from "@/ui/Tabs";
import { TeacherList } from "@/features/personnel/components/TeacherList";
import { StudentList } from "@/features/personnel/components/StudentList";
import { RoomList } from "@/features/personnel/components/RoomList";

type PersonnelTab = "teachers" | "students" | "rooms";

const tabs: readonly TabItem[] = [
  { value: "teachers", label: "Giảng viên" },
  { value: "students", label: "Học viên" },
  { value: "rooms", label: "Phòng học" },
];

function isPersonnelTab(value: string): value is PersonnelTab {
  return value === "teachers" || value === "students" || value === "rooms";
}

export function PersonnelPage() {
  const [tab, setTab] = useState<PersonnelTab>("teachers");

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Hồ sơ nhân sự & phòng học</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Quản lý giảng viên, học viên và phòng học của trung tâm SASUCO.
        </p>
      </div>

      <Tabs
        items={tabs}
        value={tab}
        onValueChange={(value) => {
          if (isPersonnelTab(value)) setTab(value);
        }}
        aria-label="Loại hồ sơ"
      />

      <div>
        {tab === "teachers" ? <TeacherList /> : null}
        {tab === "students" ? <StudentList /> : null}
        {tab === "rooms" ? <RoomList /> : null}
      </div>
    </section>
  );
}
