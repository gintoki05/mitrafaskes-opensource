"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Check, LockKeyhole, X } from "lucide-react";
import {
  AccessPermission,
  PERMISSION_DEFINITIONS,
  expandPermissionDependencies,
} from "@mitrafaskes/shared";
import type { AccessRoleDetail } from "@mitrafaskes/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";
import { SelectField } from "@/components/screens/master-faskes/FormField";
import { AccountDialog } from "./AccountDialog";

export function RoleFormDialog({
  open,
  role,
  permissions,
  routeOptions: routes,
  superAdmin,
  saving,
  onSaving,
  onClose,
  onCreate,
  onUpdate,
  onSaved,
}: {
  open: boolean;
  role: AccessRoleDetail | null;
  permissions: readonly (typeof PERMISSION_DEFINITIONS)[number][];
  routeOptions: readonly (readonly [string, AccessPermission, string])[];
  superAdmin: boolean;
  saving: boolean;
  onSaving: (value: boolean) => void;
  onClose: () => void;
  onCreate: (input: unknown) => Promise<AccessRoleDetail>;
  onUpdate: (id: string, input: unknown) => Promise<AccessRoleDetail>;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(role?.code ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [defaultRoute, setDefaultRoute] = useState(role?.defaultRoute ?? "");
  const [selected, setSelected] = useState<AccessPermission[]>(
    (role?.permissions ?? []) as AccessPermission[],
  );
  const [active, setActive] = useState(
    role?.active === false ? "false" : "true",
  );
  const byGroup = useMemo(
    () =>
      permissions.reduce<
        Record<string, Array<(typeof PERMISSION_DEFINITIONS)[number]>>
      >((groups, permission) => {
        (groups[permission.group] ??= []).push(permission);
        return groups;
      }, {}),
    [permissions],
  );
  const togglePermission = (permission: AccessPermission) => {
    if (selected.includes(permission)) {
      const remove = new Set<AccessPermission>([permission]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const candidate of selected) {
          const definition = permissions.find(
            (item) => item.code === candidate,
          );
          if (
            definition?.dependsOn?.some((dependency) =>
              remove.has(dependency),
            ) &&
            !remove.has(candidate)
          ) {
            remove.add(candidate);
            changed = true;
          }
        }
      }
      setSelected(selected.filter((item) => !remove.has(item)));
    } else setSelected(expandPermissionDependencies([...selected, permission]));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !defaultRoute || (!role && !code.trim())) {
      toast.error("Nama, kode, dan halaman awal wajib diisi.");
      return;
    }
    const route = routes.find((item) => item[0] === defaultRoute);
    if (route && !selected.includes(route[1])) {
      toast.error(
        "Role belum memiliki permission untuk halaman awal tersebut.",
      );
      return;
    }
    onSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        defaultRoute,
        active: active === "true",
        permissions: selected,
      };
      if (role) await onUpdate(role.id, payload);
      else await onCreate(payload);
      toast.success("Role berhasil disimpan.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error("Role belum disimpan.", {
        description:
          error instanceof Error ? error.message : "Silakan coba lagi.",
      });
    } finally {
      onSaving(false);
    }
  };
  return (
    <AccountDialog
      open={open}
      title={role ? "Edit role" : "Tambah role"}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-primary">
                {role ? `Edit ${role.name}` : "Tambah role kustom"}
              </CardTitle>
              <p className="mt-2 text-xs text-muted-foreground">
                Permission aksi akan otomatis memilih permission
                baca/prasyaratnya.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Tutup dialog"
              title="Tutup"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="role-code" required={!role}>
                  Kode role
                </FieldLabel>
                <Input
                  id="role-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  disabled={saving || Boolean(role)}
                  placeholder="DOKTER_SENIOR"
                />
              </div>
              <div>
                <FieldLabel htmlFor="role-name" required>
                  Nama role
                </FieldLabel>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                  placeholder="Dokter senior"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="role-description">Deskripsi</FieldLabel>
                <Input
                  id="role-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={saving}
                  placeholder="Tanggung jawab role ini"
                />
              </div>
              <div>
                <FieldLabel htmlFor="role-default-route" required>
                  Halaman awal
                </FieldLabel>
                <SelectField
                  id="role-default-route"
                  value={defaultRoute}
                  onChange={setDefaultRoute}
                  disabled={saving}
                >
                  <option value="">Pilih halaman</option>
                  {routes.map(([value, permission, label]) => (
                    <option key={value} value={value}>
                      {label}
                      {superAdmin || selected.includes(permission)
                        ? ""
                        : " · perlu permission"}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="role-status">Status</FieldLabel>
                <SelectField
                  id="role-status"
                  value={active}
                  onChange={setActive}
                  disabled={saving || !role}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Arsipkan</option>
                </SelectField>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Permission</h2>
                  <p className="text-xs text-muted-foreground">
                    Permission sensitif hanya dapat didelegasikan Super Admin.
                  </p>
                </div>
                <Badge variant="outline">{selected.length} dipilih</Badge>
              </div>
              <div className="space-y-4">
                {Object.entries(byGroup).map(([group, groupPermissions]) => (
                  <section
                    key={group}
                    className="rounded-[var(--radius-control)] border border-border p-3"
                  >
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {group}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {groupPermissions.map((permission) => {
                        const isSelected = selected.includes(permission.code);
                        const locked =
                          Boolean(permission.sensitive) && !superAdmin;
                        return (
                          <label
                            key={permission.code}
                            className={`flex gap-3 rounded-[var(--radius-control)] border p-3 ${locked ? "cursor-not-allowed bg-muted/50 opacity-70" : "cursor-pointer hover:bg-muted/40"} ${isSelected ? "border-primary/40 bg-primary/5" : "border-border"}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={saving || locked}
                              onChange={() => togglePermission(permission.code)}
                              className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 text-sm font-medium">
                                {permission.label}
                                {locked ? (
                                  <LockKeyhole className="h-3 w-3 text-muted-foreground" />
                                ) : null}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {permission.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              <Check className="h-4 w-4" />
              {saving ? "Menyimpan…" : "Simpan role"}
            </Button>
          </div>
        </form>
      </Card>
    </AccountDialog>
  );
}
