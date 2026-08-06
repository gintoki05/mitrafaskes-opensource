export type RecordValue = Record<string, unknown>;

export const EMPTY_PREVIEW_VALUE = "Belum diisi";

export function formatPreviewStatus(record: RecordValue): string {
  const status = readPreviewText(record.status);
  if (status) {
    const labels: Record<string, string> = {
      active: "Aktif",
      suspended: "Ditangguhkan",
      inactive: "Nonaktif",
    };
    return labels[status] ?? status;
  }
  if (typeof record.active === "boolean") {
    return record.active ? "Aktif" : "Nonaktif";
  }
  return EMPTY_PREVIEW_VALUE;
}

export function formatPreviewCoding(coding?: {
  code?: string;
  display?: string;
}): string {
  if (!coding?.code && !coding?.display) return EMPTY_PREVIEW_VALUE;
  const labels: Record<string, string> = {
    prov: "Fasilitas kesehatan",
    dept: "Bagian atau unit organisasi",
    bu: "Gedung",
    lvl: "Lantai",
    ro: "Ruangan",
    oth: "Lainnya",
  };
  return (
    (coding.code ? labels[coding.code] : undefined) ??
    coding.display ??
    EMPTY_PREVIEW_VALUE
  );
}

export function formatPreviewMode(value: unknown): string {
  const mode = readPreviewText(value);
  if (!mode) return EMPTY_PREVIEW_VALUE;
  const labels: Record<string, string> = {
    instance: "Lokasi nyata",
    kind: "Jenis lokasi",
  };
  return labels[mode] ?? mode;
}

export function formatPreviewReference(value: unknown): string {
  const reference = asPreviewRecord(value);
  if (!reference) return EMPTY_PREVIEW_VALUE;
  const display = readPreviewText(reference.display);
  return (
    display ??
    (reference.reference ? "Data SATUSEHAT terkait" : EMPTY_PREVIEW_VALUE)
  );
}

export function formatPreviewAddress(value: unknown): string {
  const address = firstPreviewRecord(value) ?? asPreviewRecord(value);
  if (!address) return EMPTY_PREVIEW_VALUE;
  const line = Array.isArray(address.line)
    ? address.line.filter((item): item is string => typeof item === "string")
    : [];
  const text = readPreviewText(address.text);
  const parts = [
    text,
    ...(text ? [] : line),
    readPreviewText(address.city),
    readPreviewText(address.postalCode),
    formatPreviewCountry(address.country),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : EMPTY_PREVIEW_VALUE;
}

export function formatPreviewResourceLabel(value: unknown): string {
  const resourceType = readPreviewText(value);
  if (!resourceType) return EMPTY_PREVIEW_VALUE;
  const labels: Record<string, string> = {
    Organization: "Organisasi",
    Location: "Lokasi",
    Practitioner: "Tenaga kesehatan",
    Patient: "Pasien",
    Encounter: "Kunjungan",
  };
  return labels[resourceType] ?? "Data SATUSEHAT";
}

function formatPreviewCountry(value: unknown): string | undefined {
  const country = readPreviewText(value);
  if (!country) return undefined;
  return country === "ID" ? "Indonesia" : country;
}

export function formatPreviewTelecom(
  value: unknown,
  system: "phone" | "email",
): string {
  if (!Array.isArray(value)) return EMPTY_PREVIEW_VALUE;
  const telecom = value.find(
    (item) => asPreviewRecord(item)?.system === system,
  );
  return (
    readPreviewText(asPreviewRecord(telecom)?.value) ?? EMPTY_PREVIEW_VALUE
  );
}

export function formatPreviewPosition(
  value: unknown,
  key: "latitude" | "longitude" | "altitude",
): string {
  const position = asPreviewRecord(value);
  const number = position?.[key];
  return typeof number === "number" ? String(number) : EMPTY_PREVIEW_VALUE;
}

export function firstPreviewCoding(
  value: unknown,
): { code?: string; display?: string } | undefined {
  const container = firstPreviewRecord(value) ?? asPreviewRecord(value);
  const coding = firstPreviewRecord(container?.coding);
  if (!coding) return undefined;
  return {
    code: readPreviewText(coding.code),
    display: readPreviewText(coding.display),
  };
}

export function firstPreviewRecord(value: unknown): RecordValue | undefined {
  if (!Array.isArray(value)) return undefined;
  return asPreviewRecord(value[0]);
}

export function asPreviewRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null
    ? (value as RecordValue)
    : undefined;
}

export function readPreviewText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}
