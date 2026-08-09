import {
  AddressType,
  AddressUse,
  Gender,
  MasterDataImportStatus,
  MasterRegionLevel,
  Prisma,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  PrismaClient,
  Role,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} from "@prisma/client";
import {
  MASTER_WILAYAH_SNAPSHOT,
  MASTER_WILAYAH_SNAPSHOT_VERSION,
} from "./seed-data/master-wilayah.snapshot";
import {
  MASTER_MARITAL_STATUS_SNAPSHOT,
  MASTER_MARITAL_STATUS_SNAPSHOT_VERSION,
} from "./seed-data/master-marital-status.snapshot";

const prisma = new PrismaClient();

async function seedPatient(
  medicalRecNo: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      String(error.meta?.target).includes('medicalRecNo')
    ) {
      console.warn(
        `Skipping demo patient ${medicalRecNo}; an existing local record already uses this medical record number.`,
      );
      return;
    }
    throw error;
  }
}

const COMMON_ICD10 = [
  {
    code: "A09",
    nameIndo: "Diare dan Gastroenteritis oleh Penyebab Infeksi",
    nameEng: "Infectious gastroenteritis and colitis, unspecified",
  },
  {
    code: "J00",
    nameIndo: "Nasofaringitis Akut (Flu / Batuk Pilek)",
    nameEng: "Acute nasopharyngitis [common cold]",
  },
  {
    code: "I10",
    nameIndo: "Hipertensi Esensial (Tekanan Darah Tinggi)",
    nameEng: "Essential (primary) hypertension",
  },
  {
    code: "E11",
    nameIndo: "Diabetes Melitus Tipe 2",
    nameEng: "Type 2 diabetes mellitus",
  },
  {
    code: "K29.7",
    nameIndo: "Gastritis, Tidak Spesifik (Sakit Maag)",
    nameEng: "Gastritis, unspecified",
  },
  {
    code: "J18.9",
    nameIndo: "Pneumonia, Tidak Spesifik",
    nameEng: "Pneumonia, unspecified",
  },
  {
    code: "B35.4",
    nameIndo: "Tinea Corporis (Panu / Kurap)",
    nameEng: "Tinea corporis",
  },
  {
    code: "R50.9",
    nameIndo: "Demam, Tidak Spesifik",
    nameEng: "Fever, unspecified",
  },
  { code: "R51", nameIndo: "Sakit Kepala (Headache)", nameEng: "Headache" },
  { code: "M79.1", nameIndo: "Mialgia (Nyeri Otot)", nameEng: "Myalgia" },
  {
    code: "L03.9",
    nameIndo: "Selulitis / Infeksi Kulit Akut",
    nameEng: "Cellulitis, unspecified",
  },
  {
    code: "H10.9",
    nameIndo: "Konjungtivitis (Mata Merah)",
    nameEng: "Conjunctivitis, unspecified",
  },
  {
    code: "K02.9",
    nameIndo: "Karies Gigi / Gigi Berlubang",
    nameEng: "Dental caries, unspecified",
  },
  { code: "J45.9", nameIndo: "Asma Bronkial", nameEng: "Asthma, unspecified" },
  {
    code: "Z00.0",
    nameIndo: "Pemeriksaan Kesehatan Umum (Medical Check-up)",
    nameEng: "General medical examination",
  },
];

async function main() {
  console.log("Seeding Master ICD-10 data...");
  for (const icd of COMMON_ICD10) {
    await prisma.masterIcd10.upsert({
      where: { code: icd.code },
      update: icd,
      create: icd,
    });
  }

  console.log("Seeding local Master Wilayah snapshot...");
  await prisma.$transaction(async (tx) => {
    for (const region of MASTER_WILAYAH_SNAPSHOT) {
      await tx.masterRegion.upsert({
        where: {
          level_code: {
            level: region.level as MasterRegionLevel,
            code: region.code,
          },
        },
        update: {
          parentCode: region.parentCode,
          bpsCode: region.bpsCode,
          name: region.name,
          active: true,
          source: "LOCAL_SNAPSHOT",
          sourceVersion: MASTER_WILAYAH_SNAPSHOT_VERSION,
        },
        create: {
          level: region.level as MasterRegionLevel,
          code: region.code,
          parentCode: region.parentCode,
          bpsCode: region.bpsCode,
          name: region.name,
          active: true,
          source: "LOCAL_SNAPSHOT",
          sourceVersion: MASTER_WILAYAH_SNAPSHOT_VERSION,
        },
      });
    }

    await tx.masterDataImportRun.upsert({
      where: { id: "master-import-run-wilayah-baseline-2026-08" },
      update: {
        domain: "WILAYAH",
        source: "LOCAL_SNAPSHOT",
        sourceVersion: MASTER_WILAYAH_SNAPSHOT_VERSION,
        status: MasterDataImportStatus.SUCCESS,
        recordsSeen: MASTER_WILAYAH_SNAPSHOT.length,
        recordsUpserted: MASTER_WILAYAH_SNAPSHOT.length,
        recordsDeactivated: 0,
        attemptedAt: new Date(),
        completedAt: new Date(),
        succeededAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
      create: {
        id: "master-import-run-wilayah-baseline-2026-08",
        domain: "WILAYAH",
        source: "LOCAL_SNAPSHOT",
        sourceVersion: MASTER_WILAYAH_SNAPSHOT_VERSION,
        status: MasterDataImportStatus.SUCCESS,
        recordsSeen: MASTER_WILAYAH_SNAPSHOT.length,
        recordsUpserted: MASTER_WILAYAH_SNAPSHOT.length,
        recordsDeactivated: 0,
        attemptedAt: new Date(),
        completedAt: new Date(),
        succeededAt: new Date(),
      },
    });
  });

  console.log("Seeding local Master Status Perkawinan snapshot...");
  await prisma.$transaction(async (tx) => {
    for (const status of MASTER_MARITAL_STATUS_SNAPSHOT) {
      await tx.masterMaritalStatus.upsert({
        where: { code: status.code },
        update: {
          display: status.display,
          active: true,
          displayOrder: status.displayOrder,
          source: "LOCAL_SNAPSHOT",
          sourceVersion: MASTER_MARITAL_STATUS_SNAPSHOT_VERSION,
        },
        create: {
          code: status.code,
          display: status.display,
          active: true,
          displayOrder: status.displayOrder,
          source: "LOCAL_SNAPSHOT",
          sourceVersion: MASTER_MARITAL_STATUS_SNAPSHOT_VERSION,
        },
      });
    }

    await tx.masterDataImportRun.upsert({
      where: { id: "master-import-run-marital-status-baseline-2026-08" },
      update: {
        domain: "MARITAL_STATUS",
        source: "LOCAL_SNAPSHOT",
        sourceVersion: MASTER_MARITAL_STATUS_SNAPSHOT_VERSION,
        status: MasterDataImportStatus.SUCCESS,
        recordsSeen: MASTER_MARITAL_STATUS_SNAPSHOT.length,
        recordsUpserted: MASTER_MARITAL_STATUS_SNAPSHOT.length,
        recordsDeactivated: 0,
        attemptedAt: new Date(),
        completedAt: new Date(),
        succeededAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
      create: {
        id: "master-import-run-marital-status-baseline-2026-08",
        domain: "MARITAL_STATUS",
        source: "LOCAL_SNAPSHOT",
        sourceVersion: MASTER_MARITAL_STATUS_SNAPSHOT_VERSION,
        status: MasterDataImportStatus.SUCCESS,
        recordsSeen: MASTER_MARITAL_STATUS_SNAPSHOT.length,
        recordsUpserted: MASTER_MARITAL_STATUS_SNAPSHOT.length,
        recordsDeactivated: 0,
        attemptedAt: new Date(),
        completedAt: new Date(),
        succeededAt: new Date(),
      },
    });
  });

  console.log("Seeding Initial Demo Users...");
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: "admin123", // Demo hash
      fullName: "Siti Rahma (Admin Pendaftaran)",
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: "dr_budi" },
    update: {},
    create: {
      username: "dr_budi",
      passwordHash: "dok123",
      fullName: "dr. Budi Santoso, Sp.PD",
      role: Role.DOKTER,
      sipNumber: "SIP-449/123/2023",
      strNumber: "STR-998271102",
    },
  });

  await prisma.user.upsert({
    where: { username: "perawat_ani" },
    update: {},
    create: {
      username: "perawat_ani",
      passwordHash: "perawat123",
      fullName: "Ani Wijaya, S.Kep",
      role: Role.PERAWAT,
    },
  });

  console.log("Seeding Sample Patients...");
  const ahmadStructuredData = {
    identifiers: {
      deleteMany: {},
      create: [
        {
          id: "patient-identifier-ahmad-nik",
          type: PatientIdentifierType.NIK,
          system: "urn:id:nik",
          value: "3171012304900001",
          normalizedValue: "3171012304900001",
          verificationStatus: VerificationStatus.VERIFIED,
          isPrimary: true,
        },
      ],
    },
    names: {
      deleteMany: {},
      create: [
        {
          id: "patient-name-ahmad-official",
          use: PatientNameUse.OFFICIAL,
          text: "Ahmad Supardi",
          given: ["Ahmad", "Supardi"],
        },
        {
          id: "patient-name-ahmad-alias",
          use: PatientNameUse.ALIAS,
          text: "Mamad",
          given: ["Mamad"],
          validFrom: new Date("2010-01-01T00:00:00.000Z"),
        },
        {
          id: "patient-name-ahmad-old",
          use: PatientNameUse.OLD,
          text: "Ahmad S.",
          given: ["Ahmad"],
          validTo: new Date("2009-12-31T23:59:59.000Z"),
        },
      ],
    },
    telecoms: {
      deleteMany: {},
      create: [
        {
          id: "patient-telecom-ahmad-mobile",
          system: TelecomSystem.PHONE,
          value: "081298765432",
          normalizedValue: "081298765432",
          use: TelecomUse.MOBILE,
          rank: 1,
          verificationStatus: VerificationStatus.VERIFIED,
        },
        {
          id: "patient-telecom-ahmad-email",
          system: TelecomSystem.EMAIL,
          value: "ahmad@example.test",
          normalizedValue: "ahmad@example.test",
          use: TelecomUse.HOME,
          rank: 2,
        },
      ],
    },
    addresses: {
      deleteMany: {},
      create: [
        {
          id: "patient-address-ahmad-home",
          use: AddressUse.HOME,
          type: AddressType.BOTH,
          text: "Jl. Melati No. 12, Jakarta Selatan",
          lines: ["Jl. Melati No. 12"],
          postalCode: "12160",
          countryCode: "ID",
          provinceCode: "31",
          provinceName: "DKI Jakarta",
          regencyCode: "3171",
          regencyName: "Kota Jakarta Selatan",
          districtCode: "317101",
          districtName: "Kebayoran Baru",
          villageCode: "3171011001",
          villageName: "Selong",
        },
        {
          id: "patient-address-ahmad-old",
          use: AddressUse.OLD,
          type: AddressType.PHYSICAL,
          text: "Jl. Kenanga No. 2, Depok",
          lines: ["Jl. Kenanga No. 2"],
          countryCode: "ID",
          active: false,
          validTo: new Date("2024-12-31T23:59:59.000Z"),
        },
      ],
    },
  };

  await seedPatient("RM-2026-000001", () => prisma.patient.upsert({
    where: { id: "pat-001" },
    update: {
      nik: "3171012304900001",
      fullName: "Ahmad Supardi",
      birthDate: new Date("1990-04-23T00:00:00.000Z"),
      gender: Gender.MALE,
      address: "Jl. Melati No. 12, Jakarta Selatan",
      phone: "081298765432",
      medicalRecNo: "RM-2026-000001",
      satusehatId: "P01928374-ID",
      maritalStatusCode: "M",
      ...ahmadStructuredData,
    },
    create: {
      id: "pat-001",
      nik: "3171012304900001",
      fullName: "Ahmad Supardi",
      birthDate: new Date("1990-04-23T00:00:00.000Z"),
      gender: Gender.MALE,
      address: "Jl. Melati No. 12, Jakarta Selatan",
      phone: "081298765432",
      medicalRecNo: "RM-2026-000001",
      satusehatId: "P01928374-ID",
      maritalStatusCode: "M",
      identifiers: {
        create: ahmadStructuredData.identifiers.create,
      },
      names: { create: ahmadStructuredData.names.create },
      telecoms: { create: ahmadStructuredData.telecoms.create },
      addresses: { create: ahmadStructuredData.addresses.create },
    },
  }));

  const sitiStructuredData = {
    identifiers: {
      deleteMany: {},
      create: [
        {
          id: "patient-identifier-siti-nik",
          type: PatientIdentifierType.NIK,
          system: "urn:id:nik",
          value: "3171025508950002",
          normalizedValue: "3171025508950002",
          verificationStatus: VerificationStatus.VERIFIED,
          isPrimary: true,
        },
      ],
    },
    names: {
      deleteMany: {},
      create: [
        {
          id: "patient-name-siti-official",
          use: PatientNameUse.OFFICIAL,
          text: "Siti Aminah",
          given: ["Siti", "Aminah"],
        },
      ],
    },
    telecoms: {
      deleteMany: {},
      create: [
        {
          id: "patient-telecom-siti-mobile",
          system: TelecomSystem.PHONE,
          value: "081311223344",
          normalizedValue: "081311223344",
          use: TelecomUse.MOBILE,
          rank: 1,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      ],
    },
    addresses: {
      deleteMany: {},
      create: [
        {
          id: "patient-address-siti-home",
          use: AddressUse.HOME,
          type: AddressType.PHYSICAL,
          text: "Jl. Mawar No. 45, Jakarta Selatan",
          lines: ["Jl. Mawar No. 45"],
          postalCode: "12560",
          countryCode: "ID",
          provinceCode: "31",
          provinceName: "DKI Jakarta",
          regencyCode: "3171",
          regencyName: "Kota Jakarta Selatan",
        },
      ],
    },
  };

  await seedPatient("RM-2026-000002", () => prisma.patient.upsert({
    where: { id: "pat-002" },
    update: {
      nik: "3171025508950002",
      fullName: "Siti Aminah",
      birthDate: new Date("1995-08-15T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Jl. Mawar No. 45, Jakarta Selatan",
      phone: "081311223344",
      medicalRecNo: "RM-2026-000002",
      satusehatId: "P09876543-ID",
      maritalStatusCode: "M",
      ...sitiStructuredData,
    },
    create: {
      id: "pat-002",
      nik: "3171025508950002",
      fullName: "Siti Aminah",
      birthDate: new Date("1995-08-15T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Jl. Mawar No. 45, Jakarta Selatan",
      phone: "081311223344",
      medicalRecNo: "RM-2026-000002",
      satusehatId: "P09876543-ID",
      maritalStatusCode: "M",
      identifiers: { create: sitiStructuredData.identifiers.create },
      names: { create: sitiStructuredData.names.create },
      telecoms: { create: sitiStructuredData.telecoms.create },
      addresses: { create: sitiStructuredData.addresses.create },
    },
  }));

  await seedPatient("RM-2026-000003", () => prisma.patient.upsert({
    where: { id: "pat-003" },
    update: {
      nik: null,
      fullName: "Nadia Tanpa NIK",
      birthDate: new Date("1988-11-02T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Tempat tinggal sementara, Jakarta",
      phone: null,
      medicalRecNo: "RM-2026-000003",
      maritalStatusCode: "S",
      identifiers: {
        deleteMany: {},
        create: [
          {
            id: "patient-identifier-nadia-passport",
            type: PatientIdentifierType.PASSPORT,
            system: "urn:id:passport:id",
            value: "A 1234567",
            normalizedValue: "A 1234567",
            isPrimary: true,
          },
        ],
      },
      names: {
        deleteMany: {},
        create: [
          {
            id: "patient-name-nadia-official",
            use: PatientNameUse.OFFICIAL,
            text: "Nadia Tanpa NIK",
            given: ["Nadia"],
          },
          {
            id: "patient-name-nadia-preferred",
            use: PatientNameUse.PREFERRED,
            text: "Nadia",
            given: ["Nadia"],
          },
        ],
      },
      addresses: {
        deleteMany: {},
        create: [
          {
            id: "patient-address-nadia-temp",
            use: AddressUse.TEMP,
            type: AddressType.PHYSICAL,
            text: "Tempat tinggal sementara, Jakarta",
            countryCode: "ID",
          },
        ],
      },
    },
    create: {
      id: "pat-003",
      nik: null,
      fullName: "Nadia Tanpa NIK",
      birthDate: new Date("1988-11-02T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Tempat tinggal sementara, Jakarta",
      medicalRecNo: "RM-2026-000003",
      maritalStatusCode: "S",
      identifiers: {
        create: [
          {
            id: "patient-identifier-nadia-passport",
            type: PatientIdentifierType.PASSPORT,
            system: "urn:id:passport:id",
            value: "A 1234567",
            normalizedValue: "A 1234567",
            isPrimary: true,
          },
        ],
      },
      names: {
        create: [
          {
            id: "patient-name-nadia-official",
            use: PatientNameUse.OFFICIAL,
            text: "Nadia Tanpa NIK",
            given: ["Nadia"],
          },
          {
            id: "patient-name-nadia-preferred",
            use: PatientNameUse.PREFERRED,
            text: "Nadia",
            given: ["Nadia"],
          },
        ],
      },
      addresses: {
        create: [
          {
            id: "patient-address-nadia-temp",
            use: AddressUse.TEMP,
            type: AddressType.PHYSICAL,
            text: "Tempat tinggal sementara, Jakarta",
            countryCode: "ID",
          },
        ],
      },
    },
  }));

  await prisma.patientRelatedPerson.upsert({
    where: { id: "related-person-guardian-001" },
    update: {
      fullName: "Rina Wulandari",
      gender: Gender.FEMALE,
      phone: "081355566677",
      email: "rina.guardian@example.test",
      addressText: "Jl. Mawar No. 45, Jakarta Selatan",
    },
    create: {
      id: "related-person-guardian-001",
      fullName: "Rina Wulandari",
      gender: Gender.FEMALE,
      phone: "081355566677",
      email: "rina.guardian@example.test",
      addressText: "Jl. Mawar No. 45, Jakarta Selatan",
    },
  });

  await seedPatient("RM-2026-000004", () => prisma.patient.upsert({
    where: { id: "pat-004" },
    update: {
      nik: null,
      fullName: "Bayi Ny. Siti",
      birthDate: new Date("2026-07-30T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Jl. Mawar No. 45, Jakarta Selatan",
      phone: null,
      medicalRecNo: "RM-2026-000004",
      birthPlaceText: "Jakarta",
      multipleBirthOrder: 1,
      identifiers: {
        deleteMany: {},
        create: [
          {
            id: "patient-identifier-baby-mother-nik",
            type: PatientIdentifierType.MOTHER_NIK,
            system: "urn:id:nik",
            value: "3171025508950002",
            normalizedValue: "3171025508950002",
            verificationStatus: VerificationStatus.VERIFIED,
            isPrimary: true,
          },
        ],
      },
      names: {
        deleteMany: {},
        create: [
          {
            id: "patient-name-baby-official",
            use: PatientNameUse.OFFICIAL,
            text: "Bayi Ny. Siti",
            given: ["Bayi Ny. Siti"],
          },
        ],
      },
      addresses: {
        deleteMany: {},
        create: [
          {
            id: "patient-address-baby-home",
            use: AddressUse.HOME,
            type: AddressType.PHYSICAL,
            text: "Jl. Mawar No. 45, Jakarta Selatan",
            lines: ["Jl. Mawar No. 45"],
            countryCode: "ID",
          },
        ],
      },
      relationshipsFrom: {
        deleteMany: {},
        create: [
          {
            id: "patient-relationship-baby-mother",
            relationshipCode: PatientRelationshipCode.MOTHER,
            relatedPatient: { connect: { id: "pat-002" } },
            contactPriority: 1,
          },
          {
            id: "patient-relationship-baby-guardian",
            relationshipCode: PatientRelationshipCode.GUARDIAN,
            relatedPerson: {
              connect: { id: "related-person-guardian-001" },
            },
            isGuardian: true,
            contactPriority: 2,
          },
        ],
      },
    },
    create: {
      id: "pat-004",
      nik: null,
      fullName: "Bayi Ny. Siti",
      birthDate: new Date("2026-07-30T00:00:00.000Z"),
      gender: Gender.FEMALE,
      address: "Jl. Mawar No. 45, Jakarta Selatan",
      medicalRecNo: "RM-2026-000004",
      birthPlaceText: "Jakarta",
      multipleBirthOrder: 1,
      identifiers: {
        create: [
          {
            id: "patient-identifier-baby-mother-nik",
            type: PatientIdentifierType.MOTHER_NIK,
            system: "urn:id:nik",
            value: "3171025508950002",
            normalizedValue: "3171025508950002",
            verificationStatus: VerificationStatus.VERIFIED,
            isPrimary: true,
          },
        ],
      },
      names: {
        create: [
          {
            id: "patient-name-baby-official",
            use: PatientNameUse.OFFICIAL,
            text: "Bayi Ny. Siti",
            given: ["Bayi Ny. Siti"],
          },
        ],
      },
      addresses: {
        create: [
          {
            id: "patient-address-baby-home",
            use: AddressUse.HOME,
            type: AddressType.PHYSICAL,
            text: "Jl. Mawar No. 45, Jakarta Selatan",
            lines: ["Jl. Mawar No. 45"],
            countryCode: "ID",
          },
        ],
      },
      relationshipsFrom: {
        create: [
          {
            id: "patient-relationship-baby-mother",
            relationshipCode: PatientRelationshipCode.MOTHER,
            relatedPatient: { connect: { id: "pat-002" } },
            contactPriority: 1,
          },
          {
            id: "patient-relationship-baby-guardian",
            relationshipCode: PatientRelationshipCode.GUARDIAN,
            relatedPerson: {
              connect: { id: "related-person-guardian-001" },
            },
            isGuardian: true,
            contactPriority: 2,
          },
        ],
      },
    },
  }));

  console.log("Seeding complete.");
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
