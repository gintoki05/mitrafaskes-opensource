import { HttpException } from '@nestjs/common';
import {
  toMasterWilayahRefreshFailure,
  toSafeMasterWilayahErrorMessage,
} from './master-wilayah.errors';

describe('toMasterWilayahRefreshFailure', () => {
  it('preserves a structured HTTP error for an actionable client message', () => {
    const failure = toMasterWilayahRefreshFailure(
      new HttpException(
        {
          code: 'MASTER_DATA_PROVIDER_RATE_LIMITED',
          message: 'Provider membatasi request',
        },
        429,
      ),
    );

    expect(failure).toEqual({
      code: 'MASTER_DATA_PROVIDER_RATE_LIMITED',
      message: 'Provider membatasi request',
      httpStatus: 429,
    });
  });

  it('maps an expired transaction to an actionable safe message', () => {
    const failure = toMasterWilayahRefreshFailure(
      new Error(
        'Invalid `tx.masterRegion.upsert()` invocation in C:\\workspace\\service.ts:174:33 Transaction API error: Transaction not found.',
      ),
    );

    expect(failure).toEqual({
      code: 'MASTER_DATA_IMPORT_TRANSACTION_EXPIRED',
      message:
        'Import Master Wilayah terlalu lama untuk satu transaksi database; data lokal tidak diubah. Coba lagi setelah backend memuat perbaikan import bulk.',
      httpStatus: 503,
    });
  });

  it('does not expose an unexpected database error or secret', () => {
    const failure = toMasterWilayahRefreshFailure(
      new Error('request failed with Bearer very-secret-token'),
    );

    expect(failure).toEqual({
      code: 'MASTER_DATA_IMPORT_DATABASE_ERROR',
      message:
        'Import Master Wilayah gagal pada database lokal; data lokal tidak diubah. Periksa log API sebelum mencoba lagi.',
      httpStatus: 500,
    });
  });

  it('sanitizes an already persisted transaction error before returning dataset status', () => {
    expect(
      toSafeMasterWilayahErrorMessage(
        'Invalid `tx.masterRegion.upsert()` invocation in C:\\workspace\\service.ts:174:33 Transaction API error: Transaction not found.',
        'MASTER_DATA_REFRESH_FAILED',
      ),
    ).toBe(
      'Import Master Wilayah terlalu lama untuk satu transaksi database; data lokal tidak diubah. Coba lagi setelah backend memuat perbaikan import bulk.',
    );
  });
});
