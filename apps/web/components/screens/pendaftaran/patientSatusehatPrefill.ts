import { Gender } from '@mitrafaskes/shared';
import type { SatusehatPatientRemoteSummary } from '@mitrafaskes/shared';
import type { PatientFormValues } from './patient-form-schema';

export type PatientDraftPrefill = Partial<
  Pick<PatientFormValues, 'fullName' | 'nik' | 'birthDate' | 'gender' | 'active'>
>;

const NIK_SYSTEM = 'https://fhir.kemkes.go.id/id/nik';

export function toPatientDraftPrefill(
  remote: SatusehatPatientRemoteSummary,
): PatientDraftPrefill {
  const remoteNik = remote.identifiers.find(
    (identifier) => identifier.system === NIK_SYSTEM,
  )?.value;
  const validNik = remoteNik && /^\d{16}$/.test(remoteNik)
    ? remoteNik
    : undefined;
  const validBirthDate = remote.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(remote.birthDate)
    ? remote.birthDate
    : undefined;

  return {
    fullName: remote.name,
    ...(validNik ? { nik: validNik } : {}),
    ...(validBirthDate ? { birthDate: validBirthDate } : {}),
    ...(remote.gender === 'male'
      ? { gender: Gender.MALE }
      : remote.gender === 'female'
        ? { gender: Gender.FEMALE }
        : {}),
    active: remote.active,
  };
}
