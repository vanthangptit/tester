import { useState } from "react";
import { useEntityList } from "@/lib/useEntityList";
import type { Column } from "@/ui/DataTable";
import { Badge, type BadgeVariant } from "@/ui/Badge";
import { teacherRepo } from "@/features/personnel/api/personnelRepo";
import {
  type Teacher,
  type TeacherStatus,
  teacherStatusLabels,
} from "@/features/personnel/domain/teacher";
import { EntityListView, type StatusOption } from "@/features/personnel/components/EntityListView";
import { RowActionsMenu } from "@/features/personnel/components/RowActionsMenu";
import { TeacherFormDialog } from "@/features/personnel/components/TeacherFormDialog";
import { PersonnelDeleteDialog } from "@/features/personnel/components/PersonnelDeleteDialog";

const statusVariant: Record<TeacherStatus, BadgeVariant> = {
  active: "green",
  on_leave: "amber",
};

const statusOptions: ReadonlyArray<StatusOption<TeacherStatus>> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: teacherStatusLabels.active },
  { value: "on_leave", label: teacherStatusLabels.on_leave },
];

export function TeacherList() {
  const list = useEntityList<Teacher, TeacherStatus>((params) => teacherRepo.list(params));
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const toggleStatus = (teacher: Teacher) => {
    const next: TeacherStatus = teacher.status === "active" ? "on_leave" : "active";
    teacherRepo.setStatus(teacher.id, next).then(list.reload, list.reload);
  };

  const columns: ReadonlyArray<Column<Teacher>> = [
    {
      id: "code",
      header: "Mã",
      cell: (t) => <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{t.code}</span>,
    },
    {
      id: "name",
      header: "Giảng viên",
      cell: (t) => (
        <div className="min-w-40">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.fullName}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.email}</div>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Điện thoại",
      cell: (t) => <span className="text-zinc-600 dark:text-zinc-300">{t.phone}</span>,
    },
    {
      id: "specialties",
      header: "Kỹ năng phụ trách",
      cell: (t) => (
        <div className="flex max-w-64 flex-wrap gap-1">
          {t.specialties.map((s) => (
            <Badge key={s} variant="violet">
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: (t) => <Badge variant={statusVariant[t.status]}>{teacherStatusLabels[t.status]}</Badge>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Hành động</span>,
      align: "right",
      headerClassName: "w-12",
      cell: (t) => (
        <RowActionsMenu
          label={`Hành động cho ${t.fullName}`}
          actions={[
            { label: "Sửa hồ sơ", onSelect: () => openEdit(t) },
            {
              label: t.status === "active" ? "Ngừng hoạt động" : "Kích hoạt lại",
              onSelect: () => toggleStatus(t),
            },
            { label: "Xóa", danger: true, onSelect: () => setDeleting(t) },
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
        getRowKey={(t) => t.id}
        statusOptions={statusOptions}
        searchPlaceholder="Tìm theo tên, mã, email, SĐT…"
        entityNoun="giảng viên"
        emptyTitle="Chưa có giảng viên"
        emptyDescription="Danh sách giảng viên đang trống. Thêm giảng viên đầu tiên để bắt đầu."
        onCreate={openCreate}
      />

      <TeacherFormDialog
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
          entityNoun="giảng viên"
          name={deleting.fullName}
          canRemove={() => teacherRepo.canRemove(deleting.id)}
          remove={() => teacherRepo.remove(deleting.id)}
          onDeleted={() => {
            setDeleting(null);
            list.reload();
          }}
        />
      ) : null}
    </>
  );
}
