"use client";

import { useState } from "react";
import { Eye, LockKeyhole, Pencil, Plus, ShieldCheck } from "lucide-react";
import { AccessPermission, PERMISSION_DEFINITIONS } from "@mitrafaskes/shared";
import type { AccessRoleDetail, AccountAuditItem } from "@mitrafaskes/shared";
import { toast } from "sonner";
import { RouteGuard } from "@/components/RouteGuard";
import { PageHeader } from "@/components/PageHeader";
import { ScreenState } from "@/components/ScreenState";
import { useSession } from "@/hooks/useSession";
import { can } from "@/lib/auth";
import { useAccessRoles } from "@/hooks/useAccessRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleAuditDialog } from "./RoleAuditDialog";
import { RoleFormDialog } from "./RoleFormDialog";

const routeOptions = [
  ["/administrasi/akun", AccessPermission.ACCOUNT_READ, "Administrasi akun"],
  ["/administrasi/role", AccessPermission.ROLE_READ, "Role & permission"],
  ["/master-faskes", AccessPermission.MASTER_DATA_READ, "Master Faskes"],
  ["/master-data", AccessPermission.MASTER_DATA_READ, "Master Data"],
  ["/pendaftaran", AccessPermission.QUEUE_READ, "Pendaftaran"],
  ["/riwayat-kunjungan", AccessPermission.QUEUE_READ, "Riwayat kunjungan"],
  ["/rme", AccessPermission.RME_READ, "Pemeriksaan dokter"],
  ["/triase", AccessPermission.RME_TRIAGE_READ, "Triase perawat"],
  ["/satusehat", AccessPermission.SYNC_STATUS_READ, "Monitoring SATUSEHAT"],
] as const;

export default function RoleManagementScreen() {
  const session = useSession();
  const superAdmin = session?.user.accessRole?.system === "SUPER_ADMIN";
  const canWrite = can(session?.user ?? null, AccessPermission.ROLE_WRITE);
  const canAudit = can(
    session?.user ?? null,
    AccessPermission.ACCESS_AUDIT_READ,
  );
  const roles = useAccessRoles();
  const [editing, setEditing] = useState<AccessRoleDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditRole, setAuditRole] = useState<AccessRoleDetail | null>(null);
  const [audit, setAudit] = useState<AccountAuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (role: AccessRoleDetail) => {
    if (role.system !== "SUPER_ADMIN") {
      setEditing(role);
      setOpen(true);
    }
  };

  const openAudit = async (role: AccessRoleDetail) => {
    setAuditRole(role);
    if (!canAudit) return;
    setAuditLoading(true);
    try {
      setAudit(await roles.getAudit(role.id));
    } catch (error) {
      toast.error("Audit role tidak dapat dimuat.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.ROLE_READ}>
      <div className="page-shell space-y-5">
        <PageHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Role & permission"
          description="Atur paket akses operasional. Permission sensitif tetap berada di bawah kendali Super Admin."
          action={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Tambah role
              </Button>
            ) : undefined
          }
        />
        {roles.loading ? (
          <ScreenState kind="loading" title="Memuat role" />
        ) : roles.error ? (
          <ScreenState
            kind="error"
            title="Role tidak dapat dimuat"
            description={roles.error}
            action={
              <Button variant="outline" onClick={() => void roles.refresh()}>
                Coba lagi
              </Button>
            }
          />
        ) : (
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Role aplikasi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Akun</TableHead>
                    <TableHead>Halaman awal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="font-semibold">{role.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {role.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.active ? "default" : "secondary"}>
                          {role.system === "SUPER_ADMIN"
                            ? "Sistem"
                            : role.active
                              ? "Aktif"
                              : "Diarsipkan"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.system === "SUPER_ADMIN"
                          ? "Semua"
                          : role.permissions.length}
                      </TableCell>
                      <TableCell>{role.usersCount}</TableCell>
                      <TableCell className="text-xs">
                        {role.defaultRoute}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canAudit ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Lihat audit role ${role.name}`}
                              title="Lihat audit"
                              onClick={() => void openAudit(role)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canWrite && role.system !== "SUPER_ADMIN" ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit role ${role.name}`}
                              title="Edit role"
                              onClick={() => openEdit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span
                              className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground"
                              title="Role sistem"
                            >
                              <LockKeyhole className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <RoleFormDialog
          key={`${editing?.id ?? "new"}-${open}`}
          open={open}
          role={editing}
          permissions={PERMISSION_DEFINITIONS}
          routeOptions={routeOptions}
          superAdmin={superAdmin}
          saving={saving}
          onSaving={setSaving}
          onClose={() => setOpen(false)}
          onCreate={roles.create}
          onUpdate={roles.update}
          onSaved={() => void roles.refresh()}
        />
        <RoleAuditDialog
          role={auditRole}
          items={audit}
          loading={auditLoading}
          onClose={() => setAuditRole(null)}
          canAudit={canAudit}
        />
      </div>
    </RouteGuard>
  );
}
