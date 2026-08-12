import type {
  SatusehatEncounterPayload,
  SatusehatEncounterStatus,
} from '@mitrafaskes/shared';
import {
  AMBULATORY_CLASS,
  ATTENDER_PARTICIPATION,
  ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX,
} from './satusehat-encounter.constants';
import {
  addIssue,
  asRecord,
  escapeRegex,
  firstRecord,
  readArray,
  readPeriod,
  readStatus,
  requireCoding,
  requireEqual,
  requireReference,
  requireText,
  type SatusehatEncounterContractIssue,
} from './satusehat-encounter.contract-validation';

export type { SatusehatEncounterContractIssue } from './satusehat-encounter.contract-validation';

export class SatusehatEncounterContractError extends Error {
  constructor(public readonly issues: SatusehatEncounterContractIssue[]) {
    super('Payload Encounter tidak memenuhi kontrak SATUSEHAT');
    this.name = 'SatusehatEncounterContractError';
  }
}

export function validateSatusehatEncounterPayload(
  input: unknown,
): SatusehatEncounterContractIssue[] {
  const issues: SatusehatEncounterContractIssue[] = [];
  const payload = asRecord(input);

  requireEqual(payload.resourceType, 'Encounter', 'resourceType', issues);
  if (payload.id !== undefined) requireText(payload.id, 'id', issues);

  const identifier = firstRecord(payload.identifier, 'identifier', issues);
  requireEqual(identifier.use, 'official', 'identifier[0].use', issues);
  const identifierSystem = requireText(
    identifier.system,
    'identifier[0].system',
    issues,
  );
  if (
    identifierSystem &&
    !new RegExp(
      `^${escapeRegex(ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX)}[^/\\s]+$`,
    ).test(identifierSystem)
  ) {
    addIssue(
      issues,
      'identifier[0].system',
      'Namespace identifier harus memakai Organization IHS SATUSEHAT',
    );
  }
  requireText(identifier.value, 'identifier[0].value', issues);

  const status = readStatus(payload.status, 'status', issues);
  requireCoding(payload.class, AMBULATORY_CLASS, 'class', issues);

  const statusHistory = readArray(
    payload.statusHistory,
    'statusHistory',
    issues,
  );
  const historyStatuses: SatusehatEncounterStatus[] = [];
  for (const [index, entry] of statusHistory.entries()) {
    const record = asRecord(entry);
    const historyStatus = readStatus(
      record.status,
      `statusHistory[${index}].status`,
      issues,
    );
    if (historyStatus) historyStatuses.push(historyStatus);
    readPeriod(record.period, `statusHistory[${index}].period`, issues);
  }
  if (status && historyStatuses.at(-1) !== status) {
    addIssue(
      issues,
      'statusHistory',
      'Status terakhir pada riwayat harus sama dengan status Encounter',
    );
  }
  if (
    status === 'finished' &&
    !['arrived', 'in-progress', 'finished'].every((value) =>
      historyStatuses.includes(value as SatusehatEncounterStatus),
    )
  ) {
    addIssue(
      issues,
      'statusHistory',
      'Encounter selesai harus memuat arrived, in-progress, dan finished',
    );
  }

  const encounterPeriod = readPeriod(payload.period, 'period', issues);
  if (
    (status === 'finished' || status === 'cancelled') &&
    !encounterPeriod?.end
  ) {
    addIssue(
      issues,
      'period.end',
      'Encounter terminal wajib memiliki waktu selesai klinis',
    );
  }

  const classHistory = readArray(payload.classHistory, 'classHistory', issues);
  if (classHistory.length !== 1) {
    addIssue(
      issues,
      'classHistory',
      'Rawat jalan harus memiliki satu riwayat kelas AMB',
    );
  }
  const classEntry = asRecord(classHistory[0]);
  requireCoding(
    classEntry.class,
    AMBULATORY_CLASS,
    'classHistory[0].class',
    issues,
  );
  const classPeriod = readPeriod(
    classEntry.period,
    'classHistory[0].period',
    issues,
  );
  if (
    encounterPeriod &&
    classPeriod &&
    (classPeriod.start !== encounterPeriod.start ||
      classPeriod.end !== encounterPeriod.end)
  ) {
    addIssue(
      issues,
      'classHistory[0].period',
      'Periode kelas AMB harus sama dengan periode Encounter',
    );
  }

  requireReference(payload.subject, 'Patient', 'subject', issues);
  const participant = firstRecord(payload.participant, 'participant', issues);
  const participantType = firstRecord(
    participant.type,
    'participant[0].type',
    issues,
  );
  const participantCoding = firstRecord(
    participantType.coding,
    'participant[0].type[0].coding',
    issues,
  );
  requireCoding(
    participantCoding,
    ATTENDER_PARTICIPATION,
    'participant[0].type[0].coding[0]',
    issues,
  );
  requireReference(
    participant.individual,
    'Practitioner',
    'participant[0].individual',
    issues,
  );

  const location = firstRecord(payload.location, 'location', issues);
  requireReference(
    location.location,
    'Location',
    'location[0].location',
    issues,
  );
  const organizationId = requireReference(
    payload.serviceProvider,
    'Organization',
    'serviceProvider',
    issues,
  );
  if (
    identifierSystem &&
    organizationId &&
    identifierSystem !==
      `${ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX}${organizationId}`
  ) {
    addIssue(
      issues,
      'identifier[0].system',
      'Namespace identifier harus memakai Organization yang menjadi serviceProvider',
    );
  }

  return issues;
}

export function assertSatusehatEncounterPayload(
  payload: unknown,
): asserts payload is SatusehatEncounterPayload {
  const issues = validateSatusehatEncounterPayload(payload);
  if (issues.length > 0) throw new SatusehatEncounterContractError(issues);
}
