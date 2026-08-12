import { classifySatusehatFhirFailure } from './satusehat-fhir-error-classification';
import { SatusehatFhirError } from './satusehat-fhir.client';

describe('SATUSEHAT FHIR error classification', () => {
  it.each([
    {
      label: 'authentication',
      status: 401,
      expected: {
        category: 'AUTH',
        retryable: false,
        operatorAction: 'CHECK_CREDENTIALS',
      },
    },
    {
      label: 'rate limit',
      status: 429,
      expected: {
        category: 'RATE_LIMIT',
        retryable: true,
        operatorAction: 'RETRY_WITH_BACKOFF',
      },
    },
    {
      label: 'transient server failure',
      status: 503,
      expected: {
        category: 'TRANSIENT',
        retryable: true,
        operatorAction: 'RETRY_WITH_BACKOFF',
      },
    },
    {
      label: 'duplicate',
      status: 409,
      expected: {
        category: 'DUPLICATE',
        retryable: false,
        operatorAction: 'RECONCILE',
      },
    },
    {
      label: 'validation',
      status: 422,
      expected: {
        category: 'VALIDATION',
        retryable: false,
        operatorAction: 'FIX_PAYLOAD',
      },
    },
  ])('classifies $label deterministically', ({ status, expected }) => {
    expect(
      classifySatusehatFhirFailure({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: status,
      }),
    ).toEqual(expected);
  });

  it('classifies missing references before generic validation', () => {
    expect(
      classifySatusehatFhirFailure({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: 422,
        operationOutcome: {
          resourceType: 'OperationOutcome',
          issues: [
            {
              severity: 'error',
              code: 'required',
              details: {
                coding: [],
                text: 'Encounter.subject reference is required',
              },
              expression: ['Encounter.subject.reference'],
            },
          ],
        },
      }),
    ).toEqual({
      category: 'REFERENCE_MISSING',
      retryable: false,
      operatorAction: 'FIX_REFERENCE',
    });
  });

  it('classifies terminology failures as permanent operator fixes', () => {
    expect(
      classifySatusehatFhirFailure({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: 422,
        operationOutcome: {
          resourceType: 'OperationOutcome',
          issues: [
            {
              severity: 'error',
              code: 'code-invalid',
              details: {
                coding: [],
                text: 'Code is not part of the required LOINC value set',
              },
              expression: ['Observation.code.coding'],
            },
          ],
        },
      }),
    ).toEqual({
      category: 'TERMINOLOGY',
      retryable: false,
      operatorAction: 'FIX_TERMINOLOGY',
    });
  });

  it('routes unknown failures to investigation without automatic retry', () => {
    expect(
      classifySatusehatFhirFailure({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: 418,
      }),
    ).toEqual({
      category: 'UNKNOWN',
      retryable: false,
      operatorAction: 'INVESTIGATE',
    });
  });

  it('serializes the classification through the public error contract', () => {
    const error = new SatusehatFhirError(
      'SATUSEHAT_FHIR_NETWORK_ERROR',
      'Tidak dapat terhubung ke FHIR API SATUSEHAT',
      503,
    );

    expect(error.toContract()).toEqual({
      code: 'SATUSEHAT_FHIR_NETWORK_ERROR',
      message: 'Tidak dapat terhubung ke FHIR API SATUSEHAT',
      httpStatus: 503,
      classification: {
        category: 'TRANSIENT',
        retryable: true,
        operatorAction: 'RETRY_WITH_BACKOFF',
      },
    });
  });
});
