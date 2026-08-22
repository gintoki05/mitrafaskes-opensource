import { EncounterStatus } from '@prisma/client';
import type {
  SatusehatEncounterPayload,
  SatusehatEncounterStatus,
} from '@mitrafaskes/shared';
import type { EncounterWithRelations } from '../../encounters/encounter.repository';
import { assertSatusehatEncounterPayload } from './satusehat-encounter.contract';
import {
  AMBULATORY_CLASS,
  ATTENDER_PARTICIPATION,
  ADMISSION_DIAGNOSIS,
  ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX,
} from './satusehat-encounter.constants';

export interface SatusehatEncounterDependencies {
  organizationExternalId: string;
  locationExternalId: string;
  patientExternalId: string;
  practitionerExternalId: string;
  encounterExternalId?: string;
  diagnoses?: Array<{
    externalResourceId: string;
    display: string;
    rank: number;
  }>;
}

const statusMap: Readonly<Record<EncounterStatus, SatusehatEncounterStatus>> = {
  [EncounterStatus.PLANNED]: 'planned',
  [EncounterStatus.ARRIVED]: 'arrived',
  [EncounterStatus.TRIAGED]: 'triaged',
  [EncounterStatus.IN_PROGRESS]: 'in-progress',
  [EncounterStatus.ONLEAVE]: 'onleave',
  [EncounterStatus.FINISHED]: 'finished',
  [EncounterStatus.CANCELLED]: 'cancelled',
  [EncounterStatus.ENTERED_IN_ERROR]: 'entered-in-error',
  [EncounterStatus.UNKNOWN]: 'unknown',
};

export function toSatusehatEncounterPayload(
  encounter: EncounterWithRelations,
  dependencies: SatusehatEncounterDependencies,
): SatusehatEncounterPayload {
  const status = statusMap[encounter.status];
  const enteredInErrorAt =
    encounter.status === EncounterStatus.ENTERED_IN_ERROR
      ? [...encounter.statusHistory]
          .reverse()
          .find((entry) => entry.status === EncounterStatus.ENTERED_IN_ERROR)
          ?.periodStart
      : undefined;
  const terminalTime =
    encounter.completedAt ?? encounter.cancelledAt ?? enteredInErrorAt;
  const period = {
    start: encounter.arrivedAt.toISOString(),
    ...(terminalTime ? { end: terminalTime.toISOString() } : {}),
  };
  const statusHistory = encounter.statusHistory.map((entry) => {
    const isCurrentTerminalStatus =
      terminalTime && entry.status === encounter.status && !entry.periodEnd;
    const end =
      entry.periodEnd ?? (isCurrentTerminalStatus ? terminalTime : undefined);
    return {
      status: statusMap[entry.status],
      period: {
        start: entry.periodStart.toISOString(),
        ...(end ? { end: end.toISOString() } : {}),
      },
    };
  });

  const payload: SatusehatEncounterPayload = {
    resourceType: 'Encounter',
    ...(dependencies.encounterExternalId
      ? { id: dependencies.encounterExternalId }
      : {}),
    identifier: [
      {
        use: 'official',
        system: `${ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX}${dependencies.organizationExternalId}`,
        value: encounter.encounterNumber,
      },
    ],
    status,
    statusHistory,
    class: { ...AMBULATORY_CLASS },
    classHistory: [
      {
        class: { ...AMBULATORY_CLASS },
        period: { ...period },
      },
    ],
    subject: {
      reference: `Patient/${dependencies.patientExternalId}`,
      display: encounter.patient.fullName,
    },
    participant: [
      {
        type: [{ coding: [{ ...ATTENDER_PARTICIPATION }] }],
        individual: {
          reference: `Practitioner/${dependencies.practitionerExternalId}`,
          display: encounter.doctor.fullName,
        },
      },
    ],
    period,
    location: [
      {
        location: {
          reference: `Location/${dependencies.locationExternalId}`,
          display: encounter.location.name,
        },
      },
    ],
    ...(dependencies.diagnoses && dependencies.diagnoses.length > 0
      ? {
          diagnosis: dependencies.diagnoses.map((diagnosis) => ({
            condition: {
              reference: `Condition/${diagnosis.externalResourceId}`,
              display: diagnosis.display,
            },
            use: { coding: [{ ...ADMISSION_DIAGNOSIS }] },
            rank: diagnosis.rank,
          })),
        }
      : {}),
    serviceProvider: {
      reference: `Organization/${dependencies.organizationExternalId}`,
      display: encounter.organization.name,
    },
  };

  assertSatusehatEncounterPayload(payload);
  return payload;
}
