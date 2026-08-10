export const ENCOUNTER_RESOURCE_TYPE = 'Encounter';
export const LOCAL_ENCOUNTER_RESOURCE_TYPE = 'Encounter';
export const SATUSEHAT_PROVIDER = 'SATUSEHAT';
export const DEFAULT_SATUSEHAT_ENVIRONMENT = 'sandbox';
export const DEFAULT_FACILITY_TIMEZONE = 'Asia/Jakarta';

export const readFacilityTimezone = (): string =>
  process.env.FACILITY_TIMEZONE?.trim() || DEFAULT_FACILITY_TIMEZONE;

export const readSatusehatEnvironment = (): string =>
  process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT;

export const formatFacilityDate = (
  value: Date,
  timeZone = readFacilityTimezone(),
): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
};

export const parseFacilityDate = (value: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Tanggal antrean harus berformat YYYY-MM-DD');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Tanggal antrean tidak valid');
  }
  return date;
};

export const currentFacilityDate = (): string => formatFacilityDate(new Date());

export const yearFromFacilityDate = (value: string): string => value.slice(0, 4);
