import type { RmeFormValues } from './rme-form-schema';
import type { RmePresetBundle } from './types';

export function rmePresetValues(
  type: RmePresetBundle,
): Pick<RmeFormValues, 'diagnoses' | 'prescriptions'> {
  if (type === 'ISPA') {
    return {
      diagnoses: [
        {
          icd10Code: 'J00',
          nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)',
          isPrimary: true,
        },
      ],
      prescriptions: [
        { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'CTM 4mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'Vitamin C 50mg', dosage: '1 Tablet', frequency: '2x Sehari sesudah makan', quantity: 10 },
      ],
    };
  }

  if (type === 'GASTRITIS') {
    return {
      diagnoses: [
        {
          icd10Code: 'K29.7',
          nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)',
          isPrimary: true,
        },
      ],
      prescriptions: [
        { medicineName: 'Antasida Doen', dosage: '1 Tablet Kunyah', frequency: '3x Sehari sebelum makan', quantity: 12 },
        { medicineName: 'Omeprazole 20mg', dosage: '1 Kapsul', frequency: '2x Sehari sebelum makan', quantity: 10 },
      ],
    };
  }

  return {
    diagnoses: [
      {
        icd10Code: 'I10',
        nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)',
        isPrimary: true,
      },
    ],
    prescriptions: [
      { medicineName: 'Amlodipine 5mg', dosage: '1 Tablet', frequency: '1x Sehari pagi hari', quantity: 30 },
    ],
  };
}
