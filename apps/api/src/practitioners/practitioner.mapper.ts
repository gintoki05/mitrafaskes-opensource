import type { User } from '@prisma/client';
import type {
  PractitionerSummary,
  SatusehatLinkageSummary,
  SatusehatSyncSummary,
} from '@mitrafaskes/shared';

type PractitionerUser = Pick<
  User,
  | 'id'
  | 'username'
  | 'fullName'
  | 'role'
  | 'nik'
  | 'birthDate'
  | 'gender'
  | 'active'
  | 'sipNumber'
  | 'strNumber'
  | 'createdAt'
  | 'updatedAt'
> & {
  organization?: {
    id: string;
    code: string;
    name: string;
  } | null;
  location?: {
    id: string;
    organizationId: string;
    code: string;
    name: string;
  } | null;
};

export function toPractitionerSummary(
  record: PractitionerUser,
  satusehat?: SatusehatLinkageSummary,
  satusehatSync?: SatusehatSyncSummary,
): PractitionerSummary {
  return {
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    role: record.role === 'DOKTER' ? 'DOKTER' : 'PERAWAT',
    nik: record.nik ?? undefined,
    birthDate: record.birthDate?.toISOString().slice(0, 10),
    gender: record.gender ?? undefined,
    sipNumber: record.sipNumber ?? undefined,
    strNumber: record.strNumber ?? undefined,
    organization: record.organization
      ? {
          id: record.organization.id,
          code: record.organization.code,
          name: record.organization.name,
        }
      : undefined,
    location: record.location
      ? {
          id: record.location.id,
          organizationId: record.location.organizationId,
          code: record.location.code,
          name: record.location.name,
        }
      : undefined,
    active: record.active,
    satusehat,
    satusehatSync,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
