import { ConflictException } from '@nestjs/common';
import {
  PatientIdentityConflictError,
  PatientRepository,
} from './patient.repository';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  it('maps a duplicate normalized NIK to an explicit conflict response', async () => {
    const repository = {
      create: jest
        .fn()
        .mockRejectedValue(new PatientIdentityConflictError('nik')),
    } as unknown as PatientRepository;
    const service = new PatientsService(repository);

    await expect(
      service.create({
        nik: '3171-0123-0490-0003',
        fullName: 'Dewi Lestari',
        birthDate: '1990-04-23',
        gender: 'FEMALE',
      }),
    ).rejects.toMatchObject<Partial<ConflictException>>({
      response: {
        code: 'NIK_ALREADY_EXISTS',
        message: 'Pasien dengan NIK tersebut sudah terdaftar',
        field: 'nik',
      },
      status: 409,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ nik: '3171012304900003' }),
    );
  });

  it('maps a primary identifier constraint to an explicit conflict response', async () => {
    const repository = {
      create: jest
        .fn()
        .mockRejectedValue(
          new PatientIdentityConflictError('primaryIdentifier'),
        ),
    } as unknown as PatientRepository;
    const service = new PatientsService(repository);

    await expect(
      service.create({
        fullName: 'Nadia Tanpa NIK',
        birthDate: '1988-11-02',
        gender: 'FEMALE',
        identifiers: [
          {
            type: 'PASSPORT',
            system: 'urn:id:passport:id',
            value: 'A123',
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toMatchObject<Partial<ConflictException>>({
      response: {
        code: 'PRIMARY_IDENTIFIER_CONFLICT',
        field: 'identifiers',
      },
      status: 409,
    });
  });
});
