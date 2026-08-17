-- Dynamic access roles are additive to the legacy Role column.  The legacy
-- value remains the compatibility/work-profile discriminator until the
-- clinical modules have moved completely to WorkProfileType.
CREATE TYPE "WorkProfileType" AS ENUM ('NON_CLINICAL', 'DOKTER', 'PERAWAT');
CREATE TYPE "AccessRoleSystemKind" AS ENUM ('STANDARD', 'SUPER_ADMIN');
CREATE TYPE "AccountAuditEventType" AS ENUM (
  'ACCOUNT_CREATED',
  'ACCOUNT_UPDATED',
  'ACCOUNT_ACTIVATED',
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_ROLE_CHANGED',
  'ACCOUNT_PASSWORD_RESET',
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_PERMISSIONS_UPDATED',
  'ROLE_ARCHIVED',
  'ROLE_REACTIVATED'
);

CREATE TABLE "Permission" (
  "code" VARCHAR(64) NOT NULL,
  "label" VARCHAR(150) NOT NULL,
  "group" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "AccessRole" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" VARCHAR(500),
  "defaultRoute" VARCHAR(200) NOT NULL DEFAULT '/master-faskes',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "systemKind" "AccessRoleSystemKind" NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessRole_code_key" ON "AccessRole"("code");
CREATE INDEX "AccessRole_active_name_idx" ON "AccessRole"("active", "name");
CREATE INDEX "AccessRole_systemKind_active_idx" ON "AccessRole"("systemKind", "active");

CREATE TABLE "AccessRolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionCode" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessRolePermission_pkey" PRIMARY KEY ("roleId", "permissionCode"),
  CONSTRAINT "AccessRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessRolePermission_permissionCode_fkey" FOREIGN KEY ("permissionCode") REFERENCES "Permission"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AccessRolePermission_permissionCode_roleId_idx" ON "AccessRolePermission"("permissionCode", "roleId");

CREATE TABLE "AccountAuditEvent" (
  "id" TEXT NOT NULL,
  "eventType" "AccountAuditEventType" NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "roleId" TEXT,
  "summary" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountAuditEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountAuditEvent_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AccountAuditEvent_targetUserId_createdAt_idx" ON "AccountAuditEvent"("targetUserId", "createdAt");
CREATE INDEX "AccountAuditEvent_actorUserId_createdAt_idx" ON "AccountAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AccountAuditEvent_roleId_createdAt_idx" ON "AccountAuditEvent"("roleId", "createdAt");
CREATE INDEX "AccountAuditEvent_eventType_createdAt_idx" ON "AccountAuditEvent"("eventType", "createdAt");

ALTER TABLE "User"
  ADD COLUMN "accessRoleId" TEXT,
  ADD COLUMN "workProfileType" "WorkProfileType" NOT NULL DEFAULT 'NON_CLINICAL',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3);

INSERT INTO "Permission" ("code", "label", "group", "description", "sensitive", "updatedAt") VALUES
  ('auth.login', 'Login', 'Autentikasi', 'Masuk ke aplikasi.', false, CURRENT_TIMESTAMP),
  ('patient.read', 'Lihat pasien', 'Pasien', 'Melihat identitas pasien.', false, CURRENT_TIMESTAMP),
  ('patient.write', 'Kelola pasien', 'Pasien', 'Membuat dan mengubah identitas pasien.', false, CURRENT_TIMESTAMP),
  ('queue.read', 'Lihat antrean', 'Antrean', 'Melihat antrean kunjungan.', false, CURRENT_TIMESTAMP),
  ('queue.create', 'Tambah antrean', 'Antrean', 'Menambahkan pasien ke antrean.', false, CURRENT_TIMESTAMP),
  ('queue.cancel', 'Batalkan antrean', 'Antrean', 'Membatalkan antrean.', false, CURRENT_TIMESTAMP),
  ('queue.start', 'Mulai pemeriksaan', 'Antrean', 'Memulai pemeriksaan.', false, CURRENT_TIMESTAMP),
  ('rme.read', 'Lihat RME', 'RME', 'Melihat isi rekam medis elektronik.', false, CURRENT_TIMESTAMP),
  ('rme.write-draft', 'Simpan draft RME', 'RME', 'Membuat dan mengubah draft RME.', false, CURRENT_TIMESTAMP),
  ('rme.finalize', 'Finalisasi RME', 'RME', 'Memfinalisasi RME dan encounter.', false, CURRENT_TIMESTAMP),
  ('rme.triage-read', 'Lihat triase', 'Triase', 'Melihat alur triase.', false, CURRENT_TIMESTAMP),
  ('rme.triage-write', 'Simpan triase', 'Triase', 'Mengubah draft triase.', false, CURRENT_TIMESTAMP),
  ('rme.triage-complete', 'Selesaikan triase', 'Triase', 'Menyelesaikan triase.', false, CURRENT_TIMESTAMP),
  ('sync.status-read', 'Lihat sinkronisasi', 'Integrasi', 'Melihat status sinkronisasi.', false, CURRENT_TIMESTAMP),
  ('sync.retry', 'Retry sinkronisasi', 'Integrasi', 'Mengulangi sinkronisasi yang aman.', false, CURRENT_TIMESTAMP),
  ('sync.payload-read', 'Lihat payload mentah', 'Integrasi', 'Melihat payload sinkronisasi mentah.', true, CURRENT_TIMESTAMP),
  ('master-data.read', 'Lihat master data', 'Master data', 'Melihat data master lokal.', false, CURRENT_TIMESTAMP),
  ('master-data.write', 'Kelola master data', 'Master data', 'Membuat dan mengubah data master.', false, CURRENT_TIMESTAMP),
  ('account.read', 'Lihat akun', 'Administrasi akses', 'Melihat akun pengguna.', true, CURRENT_TIMESTAMP),
  ('account.write', 'Kelola akun', 'Administrasi akses', 'Membuat dan mengubah akun.', true, CURRENT_TIMESTAMP),
  ('account.reset-password', 'Reset password akun', 'Administrasi akses', 'Membuat password sementara untuk akun lain.', true, CURRENT_TIMESTAMP),
  ('role.read', 'Lihat role', 'Administrasi akses', 'Melihat role dan permission.', true, CURRENT_TIMESTAMP),
  ('role.write', 'Kelola role', 'Administrasi akses', 'Membuat dan mengubah role serta permission.', true, CURRENT_TIMESTAMP),
  ('access.audit-read', 'Lihat audit akses', 'Administrasi akses', 'Melihat riwayat perubahan akun dan role.', true, CURRENT_TIMESTAMP);

INSERT INTO "AccessRole" ("id", "code", "name", "description", "defaultRoute", "systemKind", "updatedAt") VALUES
  ('access-role-super-admin', 'SUPER_ADMIN', 'Super Admin', 'Role sistem dengan seluruh permission.', '/administrasi/akun', 'SUPER_ADMIN', CURRENT_TIMESTAMP),
  ('access-role-admin', 'ADMIN', 'Admin', 'Administrasi fasilitas dan integrasi.', '/master-faskes', 'STANDARD', CURRENT_TIMESTAMP),
  ('access-role-dokter', 'DOKTER', 'Dokter', 'Pemeriksaan dan finalisasi RME.', '/rme', 'STANDARD', CURRENT_TIMESTAMP),
  ('access-role-perawat', 'PERAWAT', 'Perawat klinis', 'Triase dan dokumentasi awal.', '/triase', 'STANDARD', CURRENT_TIMESTAMP),
  ('access-role-pendaftaran', 'PETUGAS_PENDAFTARAN', 'Petugas pendaftaran', 'Identitas pasien dan antrean.', '/pendaftaran', 'STANDARD', CURRENT_TIMESTAMP);

INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-admin', code FROM "Permission"
WHERE code IN ('patient.read','patient.write','queue.read','queue.create','queue.cancel','sync.status-read','sync.retry','sync.payload-read','master-data.read','master-data.write');
INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-dokter', code FROM "Permission"
WHERE code IN ('patient.read','queue.read','queue.start','rme.read','rme.write-draft','rme.finalize','master-data.read');
INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-perawat', code FROM "Permission"
WHERE code IN ('patient.read','queue.read','rme.triage-read','rme.triage-write','rme.triage-complete','master-data.read');
INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-pendaftaran', code FROM "Permission"
WHERE code IN ('patient.read','patient.write','queue.read','queue.create','queue.cancel','sync.status-read','sync.retry','master-data.read');

UPDATE "User"
SET "workProfileType" = CASE
  WHEN "role" = 'DOKTER' THEN 'DOKTER'::"WorkProfileType"
  WHEN "role" = 'PERAWAT' THEN 'PERAWAT'::"WorkProfileType"
  ELSE 'NON_CLINICAL'::"WorkProfileType"
END;

UPDATE "User"
SET "accessRoleId" = CASE "role"
  WHEN 'ADMIN' THEN 'access-role-super-admin'
  WHEN 'DOKTER' THEN 'access-role-dokter'
  WHEN 'PERAWAT' THEN 'access-role-perawat'
  WHEN 'PETUGAS_PENDAFTARAN' THEN 'access-role-pendaftaran'
END;

CREATE INDEX "User_accessRoleId_active_fullName_idx" ON "User"("accessRoleId", "active", "fullName");
CREATE INDEX "User_workProfileType_active_fullName_idx" ON "User"("workProfileType", "active", "fullName");
ALTER TABLE "User"
  ADD CONSTRAINT "User_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
