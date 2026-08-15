"use client";

import type { AccessRoleDetail, AccountAuditItem } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenState } from "@/components/ScreenState";
import { AccountDialog } from "./AccountDialog";

export function RoleAuditDialog({
  role,
  items,
  loading,
  onClose,
  canAudit,
}: {
  role: AccessRoleDetail | null;
  items: AccountAuditItem[];
  loading: boolean;
  onClose: () => void;
  canAudit: boolean;
}) {
  return (
    <AccountDialog
      open={Boolean(role)}
      title="Audit role"
      onClose={onClose}
      className="max-w-2xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>{role?.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {role?.code} · aktivitas perubahan role terbaru
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          {canAudit ? (
            loading ? (
              <ScreenState kind="loading" title="Memuat audit role" compact />
            ) : items.length === 0 ? (
              <ScreenState kind="empty" title="Belum ada aktivitas" compact />
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-control)] border border-border p-3"
                  >
                    <p className="text-sm font-medium">{item.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.actor ? `${item.actor.fullName} · ` : ""}
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              Riwayat perubahan tersedia untuk role dengan permission audit
              akses.
            </p>
          )}
        </CardContent>
        <div className="flex justify-end border-t border-border p-4">
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </Card>
    </AccountDialog>
  );
}
