import {
  SatusehatTerminologyError,
  SatusehatTerminologyRegistry,
} from './satusehat-terminology.registry';

describe('SATUSEHAT FHIR terminology registry', () => {
  it('resolves official fixed Encounter terminology deterministically', () => {
    const registry = new SatusehatTerminologyRegistry();

    expect(registry.resolve('encounter.class.ambulatory')).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    });
    expect(registry.resolve('encounter.participant.attender')).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
      code: 'ATND',
      display: 'attender',
    });
  });

  it('separates fixed terminology from data or configuration terminology', () => {
    const definitions = new SatusehatTerminologyRegistry().listDefinitions();

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'encounter.class.ambulatory',
          source: 'OFFICIAL_FIXED',
        }),
        {
          key: 'encounter.serviceType',
          source: 'DATA_OR_CONFIGURATION',
        },
      ]),
    );
  });

  it('reports a specific missing error instead of inventing serviceType', () => {
    const registry = new SatusehatTerminologyRegistry();

    expect(() => registry.resolve('encounter.serviceType')).toThrow(
      expect.objectContaining({
        code: 'SATUSEHAT_TERMINOLOGY_MISSING',
        terminologyKey: 'encounter.serviceType',
      } satisfies Partial<SatusehatTerminologyError>),
    );
  });

  it('rejects unsupported terminology instead of falling back silently', () => {
    const registry = new SatusehatTerminologyRegistry();

    expect(() =>
      registry.resolve('encounter.class.ambulatory', {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'IMP',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'SATUSEHAT_TERMINOLOGY_UNSUPPORTED',
        terminologyKey: 'encounter.class.ambulatory',
      } satisfies Partial<SatusehatTerminologyError>),
    );

    expect(() =>
      registry.resolve('encounter.serviceType', {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'SATUSEHAT_TERMINOLOGY_UNSUPPORTED',
        terminologyKey: 'encounter.serviceType',
      } satisfies Partial<SatusehatTerminologyError>),
    );
  });
});
