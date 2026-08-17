import type { Prisma } from '@prisma/client';
import type { AccountSummary, WorkProfileType } from '@mitrafaskes/shared';

export const ACCOUNT_INCLUDE = {
  organization: { select: { id: true, code: true, name: true } },
  locationAssignments: {
    include: { location: { select: { id: true, code: true, name: true } } },
  },
  accessRole: true,
} as const;

export type AccountRecord = Prisma.UserGetPayload<{
  include: typeof ACCOUNT_INCLUDE;
}>;

export function toAccountSummary(record: AccountRecord): AccountSummary {
  const role = record.accessRole;
  return {
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    role: record.role as unknown as AccountSummary['role'],
    accessRole: {
      id: role?.id ?? '',
      code: role?.code ?? record.role,
      name: role?.name ?? record.role,
      description: role?.description ?? undefined,
      defaultRoute: role?.defaultRoute ?? '/master-faskes',
      active: role?.active ?? true,
      system: role?.systemKind ?? 'STANDARD',
    },
    workProfileType: record.workProfileType as unknown as WorkProfileType,
    nik: record.nik ?? undefined,
    birthDate: record.birthDate?.toISOString().slice(0, 10),
    gender: record.gender ?? undefined,
    sipNumber: record.sipNumber ?? undefined,
    strNumber: record.strNumber ?? undefined,
    organization: record.organization ?? undefined,
    locations: record.locationAssignments.map((item) => item.location),
    active: record.active,
    mustChangePassword: record.mustChangePassword,
    temporaryPasswordExpiresAt:
      record.temporaryPasswordExpiresAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
