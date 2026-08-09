import type { MasterDataDomain, RegionLevel } from "@mitrafaskes/shared";

export const MASTER_DATA_DOMAIN_LABELS: Readonly<
  Record<MasterDataDomain, string>
> = {
  WILAYAH: "Master Wilayah",
  MPI: "Master Patient Index (MPI)",
  MSI: "Master Sarana Index (MSI)",
  MARITAL_STATUS: "Status Perkawinan",
  ICD10: "ICD-10",
  KFA: "Kamus Farmasi dan Alat Kesehatan (KFA)",
};

export const REGION_LEVEL_LABELS: Readonly<Record<RegionLevel, string>> = {
  PROVINCE: "Provinsi",
  REGENCY: "Kabupaten/Kota",
  DISTRICT: "Kecamatan",
  VILLAGE: "Desa/Kelurahan",
};

export const REGION_LEVEL_ORDER: readonly RegionLevel[] = [
  "PROVINCE",
  "REGENCY",
  "DISTRICT",
  "VILLAGE",
];

export const REGION_PARENT_LEVEL: Readonly<
  Partial<Record<RegionLevel, RegionLevel>>
> = {
  REGENCY: "PROVINCE",
  DISTRICT: "REGENCY",
  VILLAGE: "DISTRICT",
};
