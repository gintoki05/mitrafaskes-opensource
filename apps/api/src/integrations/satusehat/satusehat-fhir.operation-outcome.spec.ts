import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SatusehatAuthService } from './satusehat-auth.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import {
  getSatusehatOperationOutcomeMessage,
  parseSatusehatOperationOutcome,
} from './satusehat-operation-outcome';

const fixtureText = (name: string): string =>
  readFileSync(
    join(__dirname, 'fixtures', `operation-outcome-${name}.json`),
    'utf8',
  );

const fixtureJson = (name: string): unknown => JSON.parse(fixtureText(name));

describe('SATUSEHAT FHIR OperationOutcome', () => {
  it('parses issue severity, code, details, diagnostics, expression, and location', () => {
    const outcome = parseSatusehatOperationOutcome(fixtureJson('valid'));

    expect(outcome).toEqual({
      resourceType: 'OperationOutcome',
      issues: [
        {
          severity: 'error',
          code: 'invalid',
          details: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/operation-outcome',
                code: 'MSG_PARAM_INVALID',
                display: 'Parameter invalid',
              },
            ],
            text: 'Encounter.subject reference is required',
          },
          diagnostics: 'The subject reference could not be resolved',
          expression: ['Encounter.subject.reference'],
          location: ['Encounter.subject'],
        },
      ],
    });
    expect(getSatusehatOperationOutcomeMessage(outcome, 422)).toBe(
      'Encounter.subject reference is required',
    );
  });

  it('preserves multiple issues in response order', () => {
    const outcome = parseSatusehatOperationOutcome(fixtureJson('multi-issue'));

    expect(outcome?.issues).toHaveLength(2);
    expect(
      outcome?.issues.map(({ severity, code }) => ({ severity, code })),
    ).toEqual([
      { severity: 'warning', code: 'business-rule' },
      { severity: 'error', code: 'required' },
    ]);
    expect(outcome?.issues[1]).toEqual(
      expect.objectContaining({
        diagnostics: 'No linked Location reference was supplied',
        location: ['Encounter.location'],
      }),
    );
  });

  it('returns no outcome for malformed or non-OperationOutcome responses', () => {
    expect(
      parseSatusehatOperationOutcome(fixtureText('malformed')),
    ).toBeUndefined();
    expect(
      parseSatusehatOperationOutcome(fixtureJson('fallback')),
    ).toBeUndefined();
  });

  it('redacts credentials, identifiers, and embedded sensitive payloads', () => {
    const outcome = parseSatusehatOperationOutcome({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'security',
          details: {
            text: 'Authorization: Bearer secret-access-token',
          },
          diagnostics: 'client_secret=top-secret identifier=3173010101010001',
          expression: [
            'request payload={"resourceType":"Patient","identifier":"3173010101010001"}',
          ],
        },
        {
          severity: 'error',
          code: 'invalid',
          diagnostics: 'Remote reference 3173010101010001 was rejected',
        },
      ],
    });
    const serialized = JSON.stringify(outcome);

    expect(serialized).toContain('[REDACTED]');
    expect(serialized).toContain('[REDACTED_ID]');
    expect(serialized).toContain(
      'Detail error disembunyikan karena memuat data sensitif',
    );
    expect(serialized).not.toContain('secret-access-token');
    expect(serialized).not.toContain('top-secret');
    expect(serialized).not.toContain('3173010101010001');
  });

  it('attaches the parsed outcome to a deterministic client error', async () => {
    const originalBaseUrl = process.env.SATUSEHAT_FHIR_BASE_URL;
    const originalFetch = global.fetch;
    process.env.SATUSEHAT_FHIR_BASE_URL =
      'https://satusehat.example.test/fhir-r4/v1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue(fixtureText('multi-issue')),
    });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;

    try {
      const request = new SatusehatFhirClient(auth).getPatient('patient-id');
      await expect(request).rejects.toMatchObject({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: 422,
        message: 'The encounter period should be reviewed',
        operationOutcome: {
          resourceType: 'OperationOutcome',
          issues: expect.any(Array),
        },
      } satisfies Partial<SatusehatFhirError>);
    } finally {
      global.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.SATUSEHAT_FHIR_BASE_URL;
      } else {
        process.env.SATUSEHAT_FHIR_BASE_URL = originalBaseUrl;
      }
    }
  });

  it('uses a generic fallback without exposing an unstructured response', async () => {
    const originalBaseUrl = process.env.SATUSEHAT_FHIR_BASE_URL;
    const originalFetch = global.fetch;
    process.env.SATUSEHAT_FHIR_BASE_URL =
      'https://satusehat.example.test/fhir-r4/v1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue(fixtureText('fallback')),
    });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;

    try {
      await expect(
        new SatusehatFhirClient(auth).getPatient('patient-id'),
      ).rejects.toMatchObject({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        httpStatus: 502,
        message: 'Request FHIR SATUSEHAT gagal (HTTP 502)',
        operationOutcome: undefined,
      } satisfies Partial<SatusehatFhirError>);
    } finally {
      global.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.SATUSEHAT_FHIR_BASE_URL;
      } else {
        process.env.SATUSEHAT_FHIR_BASE_URL = originalBaseUrl;
      }
    }
  });
});
