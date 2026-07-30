/**
 * SATUSEHAT Kemenkes Indonesia HL7 FHIR Transformer
 */
export class SatusehatFhirTransformer {

  static transformEncounter(data: {
    satusehatPatientId: string;
    patientName: string;
    practitionerSip: string;
    doctorName: string;
    startTime: string;
    endTime?: string;
  }) {
    return {
      resourceType: 'Encounter',
      status: data.endTime ? 'finished' : 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory'
      },
      subject: {
        reference: `Patient/${data.satusehatPatientId}`,
        display: data.patientName
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${data.practitionerSip}`,
            display: data.doctorName
          }
        }
      ],
      period: {
        start: data.startTime,
        end: data.endTime || new Date().toISOString()
      },
      location: [
        {
          location: {
            reference: 'Location/001-POLI-UMUM',
            display: 'Poli Umum Utama Klinik Pratama'
          }
        }
      ]
    };
  }

  static transformCondition(data: {
    satusehatPatientId: string;
    patientName: string;
    satusehatEncounterId: string;
    icd10Code: string;
    icd10NameEng: string;
  }) {
    return {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
      },
      category: [{
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }]
      }],
      code: {
        coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: data.icd10Code, display: data.icd10NameEng }]
      },
      subject: { reference: `Patient/${data.satusehatPatientId}`, display: data.patientName },
      encounter: { reference: `Encounter/${data.satusehatEncounterId}` }
    };
  }

  static transformObservation(data: {
    satusehatPatientId: string;
    satusehatEncounterId: string;
    systolic?: number;
    diastolic?: number;
    temperature?: number;
  }) {
    const observations: any[] = [];
    if (data.systolic && data.diastolic) {
      observations.push({
        resourceType: 'Observation',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
        subject: { reference: `Patient/${data.satusehatPatientId}` },
        encounter: { reference: `Encounter/${data.satusehatEncounterId}` },
        component: [
          { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: data.systolic, unit: 'mmHg' } },
          { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: data.diastolic, unit: 'mmHg' } }
        ]
      });
    }
    if (data.temperature) {
      observations.push({
        resourceType: 'Observation',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
        subject: { reference: `Patient/${data.satusehatPatientId}` },
        encounter: { reference: `Encounter/${data.satusehatEncounterId}` },
        valueQuantity: { value: data.temperature, unit: 'C' }
      });
    }
    return observations;
  }
}
