import type {
  Encounter as SharedEncounter,
  Gender,
  ResourceIntegrationSummary,
  EncounterStatus,
  UserRole,
} from '@mitrafaskes/shared';
import type { EncounterWithRelations } from './encounter.repository';

export function toEncounter(
  record: EncounterWithRelations,
  integrations: ResourceIntegrationSummary[] = [],
): SharedEncounter {
  return {
    id: record.id,
    encounterNumber: record.encounterNumber,
    patientId: record.patientId,
    doctorId: record.doctorId,
    organizationId: record.organizationId,
    locationId: record.locationId,
    queueDate: record.queueDate.toISOString().slice(0, 10),
    queueNumber: record.queueNumber,
    status: record.status as unknown as EncounterStatus,
    arrivedAt: record.arrivedAt.toISOString(),
    startedAt: record.startedAt?.toISOString(),
    completedAt: record.completedAt?.toISOString(),
    cancelledAt: record.cancelledAt?.toISOString(),
    version: record.version,
    statusHistory: record.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.status as unknown as EncounterStatus,
      periodStart: entry.periodStart.toISOString(),
      periodEnd: entry.periodEnd?.toISOString(),
      actorUserId: entry.actorUserId ?? undefined,
      actorUsername: entry.actorUsername,
      actorRole: entry.actorRole as unknown as UserRole,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    integrations,
    patient: {
      nik: record.patient.nik ?? undefined,
      fullName: record.patient.fullName,
      medicalRecNo: record.patient.medicalRecNo,
      birthDate: record.patient.birthDate.toISOString().slice(0, 10),
      gender: record.patient.gender as unknown as Gender,
      address: record.patient.address ?? undefined,
      phone: record.patient.phone ?? undefined,
      birthPlaceText: record.patient.birthPlaceText ?? undefined,
    },
    doctor: {
      fullName: record.doctor.fullName,
      sipNumber: record.doctor.sipNumber ?? undefined,
    },
    organization: record.organization,
    location: record.location,
  };
}
