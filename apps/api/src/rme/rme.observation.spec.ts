import { buildObservationDrafts, projectLegacyVitals } from './rme.observation';

describe('RME typed observations', () => {
  it('keeps typed vital values and derives BMI without range correction', () => {
    const observations = buildObservationDrafts(
      [],
      { systolic: 240, weight: 70, height: 175 },
      new Date('2026-08-13T03:00:00.000Z'),
      'doctor-1',
    );

    expect(observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'systolic-blood-pressure',
          valueQuantityValue: 240,
          provenance: 'original',
          performerId: 'doctor-1',
        }),
        expect.objectContaining({
          code: 'body-mass-index',
          valueType: 'quantity',
          valueQuantityValue: 22.857142857142858,
          provenance: 'derived',
        }),
      ]),
    );
    expect(
      observations.find((observation) => observation.code === 'systolic-blood-pressure')
        ?.valueQuantityValue,
    ).toBe(240);
  });

  it('projects standard LOINC observations to legacy finalization fields', () => {
    const values = projectLegacyVitals([
      {
        category: 'vital-signs',
        code: '8480-6',
        valueType: 'quantity',
        valueQuantityValue: 121,
        valueQuantityUnit: 'mmHg',
        status: 'final',
        provenance: 'original',
        derivedFromObservationIds: [],
      },
      {
        category: 'vital-signs',
        code: '8310-5',
        valueType: 'quantity',
        valueQuantityValue: 39.8,
        valueQuantityUnit: 'Cel',
        status: 'final',
        provenance: 'original',
        derivedFromObservationIds: [],
      },
    ]);

    expect(values).toEqual({ systolic: 121, temperature: 39.8 });
  });
});
