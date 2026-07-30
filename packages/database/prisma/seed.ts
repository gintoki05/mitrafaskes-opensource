import { PrismaClient, Role, Gender } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_ICD10 = [
  { code: 'A09', nameIndo: 'Diare dan Gastroenteritis oleh Penyebab Infeksi', nameEng: 'Infectious gastroenteritis and colitis, unspecified' },
  { code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', nameEng: 'Acute nasopharyngitis [common cold]' },
  { code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', nameEng: 'Essential (primary) hypertension' },
  { code: 'E11', nameIndo: 'Diabetes Melitus Tipe 2', nameEng: 'Type 2 diabetes mellitus' },
  { code: 'K29.7', nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)', nameEng: 'Gastritis, unspecified' },
  { code: 'J18.9', nameIndo: 'Pneumonia, Tidak Spesifik', nameEng: 'Pneumonia, unspecified' },
  { code: 'B35.4', nameIndo: 'Tinea Corporis (Panu / Kurap)', nameEng: 'Tinea corporis' },
  { code: 'R50.9', nameIndo: 'Demam, Tidak Spesifik', nameEng: 'Fever, unspecified' },
  { code: 'R51', nameIndo: 'Sakit Kepala (Headache)', nameEng: 'Headache' },
  { code: 'M79.1', nameIndo: 'Mialgia (Nyeri Otot)', nameEng: 'Myalgia' },
  { code: 'L03.9', nameIndo: 'Selulitis / Infeksi Kulit Akut', nameEng: 'Cellulitis, unspecified' },
  { code: 'H10.9', nameIndo: 'Konjungtivitis (Mata Merah)', nameEng: 'Conjunctivitis, unspecified' },
  { code: 'K02.9', nameIndo: 'Karies Gigi / Gigi Berlubang', nameEng: 'Dental caries, unspecified' },
  { code: 'J45.9', nameIndo: 'Asma Bronkial', nameEng: 'Asthma, unspecified' },
  { code: 'Z00.0', nameIndo: 'Pemeriksaan Kesehatan Umum (Medical Check-up)', nameEng: 'General medical examination' },
];

async function main() {
  console.log('Seeding Master ICD-10 data...');
  for (const icd of COMMON_ICD10) {
    await prisma.masterIcd10.upsert({
      where: { code: icd.code },
      update: icd,
      create: icd,
    });
  }

  console.log('Seeding Initial Demo Users...');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: 'admin123', // Demo hash
      fullName: 'Siti Rahma (Admin Pendaftaran)',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: 'dr_budi' },
    update: {},
    create: {
      username: 'dr_budi',
      passwordHash: 'dok123',
      fullName: 'dr. Budi Santoso, Sp.PD',
      role: Role.DOKTER,
      sipNumber: 'SIP-449/123/2023',
      strNumber: 'STR-998271102',
    },
  });

  await prisma.user.upsert({
    where: { username: 'perawat_ani' },
    update: {},
    create: {
      username: 'perawat_ani',
      passwordHash: 'perawat123',
      fullName: 'Ani Wijaya, S.Kep',
      role: Role.PERAWAT,
    },
  });

  console.log('Seeding Sample Patient...');
  await prisma.patient.upsert({
    where: { nik: '3171012304900001' },
    update: {},
    create: {
      nik: '3171012304900001',
      fullName: 'Ahmad Supardi',
      birthDate: new Date('1990-04-23'),
      gender: Gender.MALE,
      address: 'Jl. Melati No. 12, Jakarta Selatan',
      phone: '081298765432',
      medicalRecNo: 'RM-2026-0001',
      satusehatId: 'P01928374-ID',
    },
  });

  console.log('Seeding complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
