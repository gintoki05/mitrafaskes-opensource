import { Injectable } from '@nestjs/common';
import { MasterRegionLevel } from '@prisma/client';
import type { PatientAddress } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import type {
  PatientValidationIssue,
  ValidatedPatientAddressInput,
} from './patient.validation';

type RegionCodeField =
  'provinceCode' | 'regencyCode' | 'districtCode' | 'villageCode';
type RegionNameField =
  'provinceName' | 'regencyName' | 'districtName' | 'villageName';

type RegionDefinition = {
  level: MasterRegionLevel;
  codeField: RegionCodeField;
  nameField: RegionNameField;
  parentCodeField?: RegionCodeField;
  label: string;
};

const REGION_DEFINITIONS: readonly RegionDefinition[] = [
  {
    level: MasterRegionLevel.PROVINCE,
    codeField: 'provinceCode',
    nameField: 'provinceName',
    label: 'Provinsi',
  },
  {
    level: MasterRegionLevel.REGENCY,
    codeField: 'regencyCode',
    nameField: 'regencyName',
    parentCodeField: 'provinceCode',
    label: 'Kabupaten/kota',
  },
  {
    level: MasterRegionLevel.DISTRICT,
    codeField: 'districtCode',
    nameField: 'districtName',
    parentCodeField: 'regencyCode',
    label: 'Kecamatan',
  },
  {
    level: MasterRegionLevel.VILLAGE,
    codeField: 'villageCode',
    nameField: 'villageName',
    parentCodeField: 'districtCode',
    label: 'Desa/kelurahan',
  },
];

export type PatientAddressRegionValidationMode = 'CREATE' | 'UPDATE';

export class PatientAddressRegionValidationError extends Error {
  constructor(readonly issues: PatientValidationIssue[]) {
    super('Data wilayah pasien tidak valid');
    this.name = 'PatientAddressRegionValidationError';
  }
}

type ValidationOptions = {
  mode: PatientAddressRegionValidationMode;
  previousAddresses?: readonly PatientAddress[];
};

type MasterRegionRecord = {
  level: MasterRegionLevel;
  code: string;
  parentCode: string | null;
  name: string;
};

const normalizeName = (value: string | undefined): string =>
  value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID') ?? '';

const hasRegionValue = (address: {
  [key in RegionCodeField | RegionNameField]?: string | null;
}): boolean =>
  REGION_DEFINITIONS.some(
    ({ codeField, nameField }) =>
      Boolean(address[codeField]) || Boolean(address[nameField]),
  );

const sameRegionValues = (
  previous: PatientAddress,
  current: ValidatedPatientAddressInput,
): boolean =>
  REGION_DEFINITIONS.every(
    ({ codeField, nameField }) =>
      (previous[codeField] ?? '') === (current[codeField] ?? '') &&
      (previous[nameField] ?? '') === (current[nameField] ?? ''),
  );

const isCurrentAddress = (address: PatientAddress): boolean =>
  address.active !== false && !address.validTo;

@Injectable()
export class PatientAddressRegionValidator {
  constructor(private readonly prisma: PrismaService) {}

  async canonicalize(
    addresses: readonly ValidatedPatientAddressInput[],
    options: ValidationOptions,
  ): Promise<ValidatedPatientAddressInput[]> {
    const codes = [
      ...new Set(
        addresses.flatMap((address) =>
          REGION_DEFINITIONS.map(({ codeField }) => address[codeField]).filter(
            (code): code is string => Boolean(code),
          ),
        ),
      ),
    ];
    const records = codes.length
      ? await this.prisma.masterRegion.findMany({
          where: { active: true, code: { in: codes } },
          select: {
            level: true,
            code: true,
            parentCode: true,
            name: true,
          },
        })
      : [];
    const recordsByKey = new Map(
      (records as MasterRegionRecord[]).map((record) => [
        `${record.level}:${record.code}`,
        record,
      ]),
    );
    const issues: PatientValidationIssue[] = [];

    const canonicalAddresses = addresses.map((address, index) => {
      if (!hasRegionValue(address)) return address;

      const hasUnchangedLegacyValue =
        options.mode === 'UPDATE' &&
        options.previousAddresses?.some(
          (previous) =>
            isCurrentAddress(previous) && sameRegionValues(previous, address),
        );
      if (hasUnchangedLegacyValue) return address;

      const canonical = { ...address };
      for (const definition of REGION_DEFINITIONS) {
        const code = canonical[definition.codeField];
        const name = canonical[definition.nameField];
        if (!code && !name) continue;

        const field = `addresses[${index}].${definition.codeField}`;
        if (!code) {
          issues.push({
            field,
            code: 'REGION_CODE_REQUIRED',
            message: `${definition.label} harus dipilih dari Master Wilayah`,
          });
          continue;
        }

        const record = recordsByKey.get(`${definition.level}:${code}`);
        if (!record) {
          issues.push({
            field,
            code: 'REGION_NOT_FOUND',
            message: `${definition.label} dengan kode ${code} tidak ditemukan di Master Wilayah aktif`,
          });
          continue;
        }

        if (name && normalizeName(name) !== normalizeName(record.name)) {
          issues.push({
            field: `addresses[${index}].${definition.nameField}`,
            code: 'REGION_NAME_MISMATCH',
            message: `Nama ${definition.label.toLowerCase()} tidak cocok dengan kode Master Wilayah`,
          });
        }

        if (definition.parentCodeField) {
          const parentCode = canonical[definition.parentCodeField];
          if (!parentCode) {
            issues.push({
              field: `addresses[${index}].${definition.parentCodeField}`,
              code: 'REGION_PARENT_REQUIRED',
              message: `Parent ${definition.label.toLowerCase()} wajib dipilih dari Master Wilayah`,
            });
          } else if (record.parentCode !== parentCode) {
            issues.push({
              field: field,
              code: 'REGION_PARENT_MISMATCH',
              message: `${definition.label} tidak berada di parent wilayah yang dipilih`,
            });
          }
        }

        canonical[definition.nameField] = record.name;
      }
      return canonical;
    });

    if (options.mode === 'CREATE') {
      // A new address may contain only street/postal data, but every supplied
      // administrative name must come from a selected master code.
      addresses.forEach((address, index) => {
        for (const definition of REGION_DEFINITIONS) {
          if (!address[definition.codeField] && address[definition.nameField]) {
            const alreadyReported = issues.some(
              (issue) =>
                issue.field === `addresses[${index}].${definition.codeField}` &&
                issue.code === 'REGION_CODE_REQUIRED',
            );
            if (!alreadyReported) {
              issues.push({
                field: `addresses[${index}].${definition.codeField}`,
                code: 'REGION_CODE_REQUIRED',
                message: `${definition.label} harus dipilih dari Master Wilayah`,
              });
            }
          }
        }
      });
    }

    if (issues.length > 0) {
      throw new PatientAddressRegionValidationError(issues);
    }
    return canonicalAddresses;
  }
}
