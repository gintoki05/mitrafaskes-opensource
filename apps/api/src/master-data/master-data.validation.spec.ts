import {
  LocationType,
  OrganizationType,
  ServiceUnitType,
} from '@prisma/client';
import {
  MasterDataValidationError,
  validateLocationInput,
  validateOrganizationInput,
  validateServiceUnitInput,
} from './master-data.validation';

describe('master faskes validation', () => {
  it('normalizes organization codes and keeps the SATUSEHAT-neutral hierarchy fields', () => {
    expect(
      validateOrganizationInput({
        code: ' klinik-utama ',
        name: '  Klinik Mitra   Sehat ',
        type: OrganizationType.HEALTHCARE_FACILITY,
        addressText: 'Jl. Sehat 1',
      }),
    ).toEqual(
      expect.objectContaining({
        code: 'KLINIK-UTAMA',
        name: 'Klinik Mitra Sehat',
        type: OrganizationType.HEALTHCARE_FACILITY,
        active: true,
      }),
    );
  });

  it('accepts common separators in organization phone numbers', () => {
    expect(
      validateOrganizationInput({
        code: 'DPM-ANDI',
        name: 'Praktik Dokter Andi',
        phone: '+62 811-1234-5678',
      }),
    ).toEqual(
      expect.objectContaining({
        phone: '+62 811-1234-5678',
      }),
    );
  });

  it('requires a parent for sub-organizations', () => {
    expect(() =>
      validateOrganizationInput({
        code: 'POLI-UMUM',
        name: 'Poli Umum',
        type: OrganizationType.SUB_ORGANIZATION,
      }),
    ).toThrow(MasterDataValidationError);
  });

  it('requires an organization for service units and locations', () => {
    expect(() =>
      validateServiceUnitInput({
        code: 'POLI-UMUM',
        name: 'Poli Umum',
        type: ServiceUnitType.POLYCLINIC,
      }),
    ).toThrow(MasterDataValidationError);

    expect(() =>
      validateLocationInput({
        code: 'RUANG-01',
        name: 'Ruang Pemeriksaan 1',
        type: LocationType.ROOM,
      }),
    ).toThrow(MasterDataValidationError);
  });

  it('accepts a room attached to a service unit and location hierarchy', () => {
    expect(
      validateLocationInput({
        organizationId: 'org-1',
        serviceUnitId: 'unit-1',
        parentId: 'location-floor-1',
        code: 'room-01',
        name: 'Ruang Pemeriksaan 1',
        type: LocationType.ROOM,
        description: 'Ruang konsultasi poli umum',
        city: 'Jakarta',
        countryCode: 'id',
      }),
    ).toEqual({
      organizationId: 'org-1',
      serviceUnitId: 'unit-1',
      parentId: 'location-floor-1',
      code: 'ROOM-01',
      name: 'Ruang Pemeriksaan 1',
      type: LocationType.ROOM,
      description: 'Ruang konsultasi poli umum',
      status: 'ACTIVE',
      mode: 'INSTANCE',
      physicalTypeCode: undefined,
      addressText: undefined,
      city: 'Jakarta',
      postalCode: undefined,
      countryCode: 'ID',
      active: true,
    });
  });

  it('rejects an invalid country code for a location', () => {
    expect(() =>
      validateLocationInput({
        organizationId: 'org-1',
        code: 'ROOM-01',
        name: 'Ruang Pemeriksaan 1',
        countryCode: 'IDN',
      }),
    ).toThrow(MasterDataValidationError);
  });

  it('accepts valid coordinates and normalizes them to numbers', () => {
    expect(
      validateLocationInput({
        organizationId: 'org-1',
        code: 'ROOM-01',
        name: 'Ruang Pemeriksaan 1',
        latitude: '-6.231154',
        longitude: '106.832398',
        altitude: '12',
      }),
    ).toEqual(
      expect.objectContaining({
        latitude: -6.231154,
        longitude: 106.832398,
        altitude: 12,
      }),
    );
  });

  it('rejects coordinates outside valid geographic ranges', () => {
    expect(() =>
      validateLocationInput({
        organizationId: 'org-1',
        code: 'ROOM-01',
        name: 'Ruang Pemeriksaan 1',
        latitude: 91,
        longitude: -181,
      }),
    ).toThrow(MasterDataValidationError);
  });
});
