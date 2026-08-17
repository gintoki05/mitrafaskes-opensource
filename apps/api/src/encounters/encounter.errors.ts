export class EncounterValidationError extends Error {
  constructor(
    message: string,
    readonly issues: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'EncounterValidationError';
  }
}

export class EncounterNotFoundError extends Error {
  constructor() {
    super('Kunjungan / Encounter tidak ditemukan');
    this.name = 'EncounterNotFoundError';
  }
}

export class EncounterConflictError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'ENCOUNTER_ACTIVE_DUPLICATE'
      | 'ENCOUNTER_QUEUE_CONFLICT'
      | 'ENCOUNTER_VERSION_CONFLICT' = 'ENCOUNTER_QUEUE_CONFLICT',
  ) {
    super(message);
    this.name = 'EncounterConflictError';
  }
}

export class EncounterTransitionError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'INVALID_ENCOUNTER_TRANSITION'
      | 'ENCOUNTER_ALREADY_IN_STATUS'
      | 'ENCOUNTER_COMPLETION_REQUIRES_RME_FINALIZATION'
      | 'ENCOUNTER_FINAL_CANNOT_BE_ENTERED_IN_ERROR',
  ) {
    super(message);
    this.name = 'EncounterTransitionError';
  }
}

export class EncounterContextError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'PATIENT_NOT_FOUND'
      | 'LOCATION_NOT_FOUND'
      | 'LOCATION_INACTIVE'
      | 'ORGANIZATION_NOT_FOUND'
      | 'ORGANIZATION_INACTIVE'
      | 'PRACTITIONER_NOT_FOUND'
      | 'PRACTITIONER_NOT_ASSIGNED_TO_LOCATION',
  ) {
    super(message);
    this.name = 'EncounterContextError';
  }
}
