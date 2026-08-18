import { useState } from "react";
import { useEntityList } from "@/lib/useEntityList";
import type { Column } from "@/ui/DataTable";
import { Badge, type BadgeVariant } from "@/ui/Badge";
import { roomRepo } from "@/features/personnel/api/personnelRepo";
import { type Room, type RoomStatus, roomStatusLabels } from "@/features/personnel/domain/room";
import { EntityListView, type StatusOption } from "@/features/personnel/components/EntityListView";
import { RowActionsMenu } from "@/features/personnel/components/RowActionsMenu";
import { RoomFormDialog } from "@/features/personnel/components/RoomFormDialog";
import { PersonnelDeleteDialog } from "@/features/personnel/components/PersonnelDeleteDialog";

const statusVariant: Record<RoomStatus, BadgeVariant> = {
  available: "green",
  maintenance: "red",
};

const statusOptions: ReadonlyArray<StatusOption<RoomStatus>> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "available", label: roomStatusLabels.available },
  { value: "maintenance", label: roomStatusLabels.maintenance },
];

export function RoomList() {
  const list = useEntityList<Room, RoomStatus>((params) => roomRepo.list(params));
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (room: Room) => {
    setEditing(room);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const toggleStatus = (room: Room) => {
    const next: RoomStatus = room.status === "available" ? "maintenance" : "available";
    roomRepo.setStatus(room.id, next).then(list.reload, list.reload);
  };

  const columns: ReadonlyArray<Column<Room>> = [
    {
      id: "code",
      header: "Mã phòng",
      cell: (r) => <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.code}</span>,
    },
    {
      id: "name",
      header: "Tên phòng",
      cell: (r) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span>,
    },
    {
      id: "capacity",
      header: "Sức chứa",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{r.capacity} chỗ</span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: (r) => <Badge variant={statusVariant[r.status]}>{roomStatusLabels[r.status]}</Badge>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Hành động</span>,
      align: "right",
      headerClassName: "w-12",
      cell: (r) => (
        <RowActionsMenu
          label={`Hành động cho ${r.name}`}
          actions={[
            { label: "Sửa phòng", onSelect: () => openEdit(r) },
            {
              label: r.status === "available" ? "Chuyển sửa chữa" : "Mở lại phòng",
              onSelect: () => toggleStatus(r),
            },
            { label: "Xóa", danger: true, onSelect: () => setDeleting(r) },
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
        getRowKey={(r) => r.id}
        statusOptions={statusOptions}
        searchPlaceholder="Tìm theo tên hoặc mã phòng…"
        entityNoun="phòng học"
        emptyTitle="Chưa có phòng học"
        emptyDescription="Danh sách phòng học đang trống. Thêm phòng học đầu tiên để bắt đầu."
        onCreate={openCreate}
      />

      <RoomFormDialog
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
          entityNoun="phòng học"
          name={deleting.name}
          canRemove={() => roomRepo.canRemove(deleting.id)}
          remove={() => roomRepo.remove(deleting.id)}
          onDeleted={() => {
            setDeleting(null);
            list.reload();
          }}
        />
      ) : null}
    </>
  );
}
