import type {
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';

type PractitionerDraftPrefill = {
  fullName: string;
  nik?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  active: string;
};

export function toPractitionerDraftPrefill(
  remote: SatusehatPractitionerRemoteSummary,
): PractitionerDraftPrefill {
  const remoteNik = remote.identifiers.find(
    (identifier) => identifier.system === 'https://fhir.kemkes.go.id/id/nik',
  )?.value;
  const validNik = remoteNik && /^\d{16}$/.test(remoteNik) ? remoteNik : undefined;

  return {
    fullName: remote.name,
    ...(validNik ? { nik: validNik } : {}),
    ...(remote.birthDate ? { birthDate: remote.birthDate } : {}),
    ...(remote.gender === 'male'
      ? { gender: 'MALE' as const }
      : remote.gender === 'female'
        ? { gender: 'FEMALE' as const }
        : {}),
    active: remote.active ? 'true' : 'false',
  };
}
