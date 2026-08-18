import { useState } from "react";
import { useEntityList } from "@/lib/useEntityList";
import { formatDateVN } from "@/lib/time";
import type { Column } from "@/ui/DataTable";
import { Badge, type BadgeVariant } from "@/ui/Badge";
import { studentRepo } from "@/features/personnel/api/personnelRepo";
import {
  type Student,
  type StudentStatus,
  studentStatusLabels,
} from "@/features/personnel/domain/student";
import { EntityListView, type StatusOption } from "@/features/personnel/components/EntityListView";
import { RowActionsMenu } from "@/features/personnel/components/RowActionsMenu";
import { StudentFormDialog } from "@/features/personnel/components/StudentFormDialog";
import { PersonnelDeleteDialog } from "@/features/personnel/components/PersonnelDeleteDialog";

const statusVariant: Record<StudentStatus, BadgeVariant> = {
  active: "green",
  reserved: "amber",
};

const statusOptions: ReadonlyArray<StatusOption<StudentStatus>> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: studentStatusLabels.active },
  { value: "reserved", label: studentStatusLabels.reserved },
];

export function StudentList() {
  const list = useEntityList<Student, StudentStatus>((params) => studentRepo.list(params));
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (student: Student) => {
    setEditing(student);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const toggleStatus = (student: Student) => {
    const next: StudentStatus = student.status === "active" ? "reserved" : "active";
    studentRepo.setStatus(student.id, next).then(list.reload, list.reload);
  };

  const columns: ReadonlyArray<Column<Student>> = [
    {
      id: "code",
      header: "Mã",
      cell: (s) => <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{s.code}</span>,
    },
    {
      id: "name",
      header: "Học viên",
      cell: (s) => (
        <div className="min-w-40">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.fullName}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.email}</div>
        </div>
      ),
    },
    {
      id: "dob",
      header: "Ngày sinh",
      cell: (s) => <span className="text-zinc-600 dark:text-zinc-300">{formatDateVN(s.dateOfBirth)}</span>,
    },
    {
      id: "phone",
      header: "Điện thoại",
      cell: (s) => <span className="text-zinc-600 dark:text-zinc-300">{s.phone}</span>,
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: (s) => <Badge variant={statusVariant[s.status]}>{studentStatusLabels[s.status]}</Badge>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Hành động</span>,
      align: "right",
      headerClassName: "w-12",
      cell: (s) => (
        <RowActionsMenu
          label={`Hành động cho ${s.fullName}`}
          actions={[
            { label: "Sửa hồ sơ", onSelect: () => openEdit(s) },
            {
              label: s.status === "active" ? "Cho bảo lưu" : "Kích hoạt lại",
              onSelect: () => toggleStatus(s),
            },
            { label: "Xóa", danger: true, onSelect: () => setDeleting(s) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <EntityListView
        list={list}
        columns={columns}
        getRowKey={(s) => s.id}
        statusOptions={statusOptions}
        searchPlaceholder="Tìm theo tên, mã, email, SĐT…"
        entityNoun="học viên"
        emptyTitle="Chưa có học viên"
        emptyDescription="Danh sách học viên đang trống. Thêm học viên đầu tiên để bắt đầu."
        onCreate={openCreate}
      />

      <StudentFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        entity={editing}
        onSaved={() => {
          setFormOpen(false);
          list.reload();
        }}
      />

      {deleting ? (
        <PersonnelDeleteDialog
          open
          onOpenChange={(o) => {
            if (!o) setDeleting(null);
          }}
          entityNoun="học viên"
          name={deleting.fullName}
          canRemove={() => studentRepo.canRemove(deleting.id)}
          remove={() => studentRepo.remove(deleting.id)}
          onDeleted={() => {
            setDeleting(null);
            list.reload();
          }}
        />
      ) : null}
    </>
  );
}
