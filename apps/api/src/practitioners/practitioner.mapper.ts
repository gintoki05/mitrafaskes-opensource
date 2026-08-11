import type { User } from '@prisma/client';
import type {
  PractitionerSummary,
  ResourceIntegrationSummary,
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
  locationAssignments?: Array<{
    location: {
      id: string;
      organizationId: string;
      code: string;
      name: string;
    };
  }>;
};

function toLocationReference(location: {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}) {
  return {
    id: location.id,
    organizationId: location.organizationId,
    code: location.code,
    name: location.name,
  };
}

export function toPractitionerSummary(
  record: PractitionerUser,
  integrations: ResourceIntegrationSummary[] = [],
): PractitionerSummary {
  const locations =
    record.locationAssignments?.map((assignment) =>
      toLocationReference(assignment.location),
    ) ?? (record.location ? [toLocationReference(record.location)] : []);

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
      ? toLocationReference(record.location)
      : undefined,
    locations,
    active: record.active,
    integrations,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
