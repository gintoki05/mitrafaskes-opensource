import type { Patient } from "@mitrafaskes/shared";

export type PatientSyncReadiness = {
  ready: boolean;
  issues: string[];
};

const REGION_FIELDS = ["province", "regency", "district", "village"] as const;

function hasCurrentIdentifier(patient: Patient): boolean {
  if (patient.nik?.trim()) return true;

  return (patient.identifiers ?? []).some(
    (identifier) =>
      identifier.active !== false &&
      !identifier.validTo &&
      Boolean(identifier.value?.trim()),
  );
}

function hasValidBirthDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function administrativeAddressIssue(patient: Patient): string | undefined {
  const addresses = (patient.addresses ?? []).filter(
    (address) => address.active !== false && !address.validTo,
  );
  const currentAddresses = addresses.length
    ? addresses
    : patient.address?.trim()
      ? [{ text: patient.address }]
      : [];

  for (const address of currentAddresses) {
    const values = REGION_FIELDS.map((field) => [
      address[`${field}Code` as keyof typeof address],
      address[`${field}Name` as keyof typeof address],
    ]);
    const hasAnyRegionValue = values.some(([code, name]) =>
      Boolean(code || name),
    );
    if (!hasAnyRegionValue) {
      return "Alamat aktif belum memiliki kode wilayah. Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan dari Master Wilayah.";
    }
    if (!values.every(([code, name]) => Boolean(code && name))) {
      return "Wilayah alamat belum lengkap. Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan dari Master Wilayah.";
    }

    const codes = values.map(([code]) => String(code));
    const parentChildPairs = [
      [codes[0], codes[1]],
      [codes[1], codes[2]],
      [codes[2], codes[3]],
    ];
    if (parentChildPairs.some(([parent, child]) => !child.startsWith(parent))) {
      return "Kode wilayah alamat tidak konsisten. Pilih ulang wilayah dari Master Wilayah agar kecamatan/desa sesuai dengan kabupaten/kota.";
    }
  }

  return undefined;
}

export function getPatientSyncReadiness(
  patient: Patient,
): PatientSyncReadiness {
  const issues: string[] = [];

  if (!hasCurrentIdentifier(patient)) {
    issues.push("NIK atau identifier aktif wajib diisi.");
  }
  if (!patient.fullName?.trim()) {
    issues.push("Nama lengkap wajib diisi.");
  }
  if (!patient.gender) {
    issues.push("Jenis kelamin wajib diisi.");
  }
  if (!hasValidBirthDate(patient.birthDate)) {
    issues.push("Tanggal lahir harus berformat YYYY-MM-DD.");
  }
  const addressIssue = administrativeAddressIssue(patient);
  if (addressIssue) issues.push(addressIssue);

  return { ready: issues.length === 0, issues };
}

export function patientSyncReadinessMessage(
  readiness: PatientSyncReadiness,
): string {
  return readiness.issues.join(" ");
}
