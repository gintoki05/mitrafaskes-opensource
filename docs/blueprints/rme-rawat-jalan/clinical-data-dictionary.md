# Kamus Data Klinis Rawat Jalan

Dokumen ini menentukan data apa yang perlu mampu disimpan oleh RME lokal.
Nama field database dan DTO boleh berbeda selama makna, tipe, provenance, dan
aturan validasinya tetap dipertahankan.

## Tingkat kebutuhan

| Kode | Makna |
| --- | --- |
| W | Wajib untuk setiap RME final |
| K | Wajib jika kondisi/use case terjadi |
| O | Opsional, tetapi didukung model |
| T | Tahap lanjutan; tidak menghalangi MVP |

Draft boleh parsial. Tingkat wajib diterapkan pada **preflight finalisasi**,
bukan dengan mengisi nilai klinis palsu.

## Konvensi pemodelan

- Field klinis penting menyimpan `codeSystem`, `code`, `displaySnapshot`, dan
  `text` bila memakai terminologi.
- `displaySnapshot` mempertahankan istilah yang dilihat saat pencatatan; registry
  terminologi tetap menjadi sumber pencarian dan versi.
- Kuantitas menyimpan nilai numerik dan unit UCUM, bukan satu string campuran.
- Waktu klinis (`effectiveAt`) dibedakan dari waktu input (`recordedAt`).
- Setiap entry memiliki recorder/performer bila relevan.
- `tidak dilakukan`, `tidak diketahui`, dan nilai kosong adalah tiga keadaan
  berbeda; reason perlu direkam jika profile mengizinkannya.
- Nilai contoh hanya boleh menjadi placeholder berlabel. Form kosong tidak boleh
  memuat diagnosis, keluhan, vital, atau obat seolah-olah data pasien nyata.
- Data sensitif dan clinical free text tidak ditulis ke application log.

## A. Konteks kunjungan

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Encounter number | W | Identifier unik per organisasi | Encounter.identifier |
| Patient | W | Reference pasien lokal | Encounter.subject |
| Organization | W | Faskes yang bertanggung jawab | Encounter.serviceProvider |
| Location/unit | W | Tempat pelayanan | Encounter.location |
| Care setting | W | Rawat jalan; enum lokal | Encounter.class = AMB saat dipetakan |
| Participants | W | Dokter/tenaga yang terlibat + role/period | Encounter.participant |
| Visit reason | O | Code/text alasan kunjungan | Encounter.reasonCode / Condition sesuai konteks |
| Arrival/start/end | W | Instant terpisah | Encounter.period dan statusHistory |
| Status history | W | Append-only transition log | Encounter.statusHistory |
| Disposition | K | Cara pasien keluar/tindak lanjut | Encounter.hospitalization/dischargeDisposition atau profile aktif |
| Cancellation reason | K | Code/text + actor + time | Mapping sesuai profile; tetap wajib lokal |
| Service profile | W | `OUTPATIENT_GENERAL`, `OUTPATIENT_DENTAL`, atau profile terversi lain | Menentukan section/validation; bukan FHIR resource |

## B. Anamnesis dan riwayat

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Keluhan utama | W | Text, opsional code, onset/duration | Condition untuk keluhan atau bagian ringkasan |
| Riwayat penyakit sekarang | W | Narasi klinis | ClinicalImpression/Composition section sesuai profile |
| Riwayat penyakit dahulu | O | Daftar code/text, status, period, note | Condition/history representation |
| Riwayat keluarga | O | Daftar hubungan dan kondisi | FamilyMemberHistory |
| Riwayat obat | O | Medication code/text, status, period | MedicationStatement bila use case mendukung |
| Faktor risiko/kebiasaan | O | Observation typed atau narasi | Observation/social-history |
| Sumber informasi | O | Patient/related person + reliability | Provenance/context lokal |

Keluhan, riwayat, dan diagnosis tetap menjadi konsep lokal yang berbeda walau
sebagian dapat dipetakan ke resource FHIR yang sama.

## C. Alergi dan intoleransi

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Status review alergi | W | `KNOWN`, `NONE_KNOWN`, `NOT_REVIEWED` | AllergyIntolerance / data-absent semantics |
| Zat/produk | K | Code/text; KFA/SNOMED/terminologi aktif bila tersedia | AllergyIntolerance.code |
| Clinical/verification status | K | Enum terkontrol | AllergyIntolerance status |
| Criticality | O | low/high/unable-to-assess | AllergyIntolerance.criticality |
| Reaksi dan manifestasi | O | Code/text + onset | AllergyIntolerance.reaction |
| Severity | O | mild/moderate/severe | reaction.severity |
| Catatan | O | Narasi | AllergyIntolerance.note |

`NONE_KNOWN` tidak boleh disimpulkan hanya karena daftar alergi kosong.

## D. Tanda vital dan observasi klinis

Semua nilai berikut menjadi `ClinicalObservation` typed. LOINC di bawah adalah
kandidat umum dan harus divalidasi terhadap rilis terminologi SATUSEHAT aktif
sebelum adapter produksi dibekukan.

| Pengukuran | Tingkat | Value + unit | Kandidat LOINC |
| --- | --- | --- | --- |
| Tekanan darah sistolik | K | decimal mm[Hg] | 8480-6 |
| Tekanan darah diastolik | K | decimal mm[Hg] | 8462-4 |
| Nadi | K | decimal /min | 8867-4 |
| Laju napas | K | decimal /min | 9279-1 |
| Suhu tubuh | K | decimal Cel | 8310-5 |
| Saturasi oksigen | O | decimal % | 2708-6 |
| Berat badan | K | decimal kg | 29463-7 |
| Tinggi badan | K | decimal cm | 8302-2 |
| BMI | O | decimal kg/m2; dapat dihitung dan ditandai derived | 39156-5 |
| Kesadaran/keadaan umum | O | coded/text | Registry terminology aktif |
| Nyeri | O | score + scale | Code sesuai instrumen yang dipakai |

Kewajiban masing-masing vital sign ditentukan `validationProfile` berdasarkan
jenis layanan dan usia pasien. Contoh: tekanan darah dapat wajib untuk konsultasi
dewasa, tetapi bukan nilai universal untuk semua kondisi.

Setiap observation minimal menyimpan:

- category dan code;
- value typed (`quantity`, `code`, `boolean`, `string`, atau component);
- unit bila kuantitas;
- `effectiveAt`, recorder/performer, dan status;
- method/body site/device/range/interpretation bila relevan.

## E. Pemeriksaan fisik

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Keadaan umum | W | Coded/text + note | Observation/ClinicalImpression |
| Pemeriksaan per sistem | K | body system/site, normal/abnormal, finding, note | Observation atau Condition sesuai makna |
| Laterality | K | left/right/bilateral | Coding/bodySite |
| Metode/alat | O | Code/text | Observation.method/device |
| Ringkasan asesmen | O | Narasi klinisi | ClinicalImpression.summary |

UI boleh menyediakan template “dalam batas normal”, tetapi pengguna harus
memilihnya secara eksplisit; sistem tidak mengisi hasil normal otomatis.

## F. Diagnosis

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Diagnosis utama | W | ICD-10 code + display snapshot | Condition.code |
| Diagnosis sekunder | O | Satu atau lebih ICD-10 | Condition.code |
| Category | W | encounter-diagnosis/problem-list/other lokal | Condition.category |
| Rank/primary flag | W | Integer rank; tepat satu utama untuk profile standar | Encounter.diagnosis rank/use |
| Clinical status | K | active/resolved/dll | Condition.clinicalStatus |
| Verification status | K | provisional/confirmed/differential/dll | Condition.verificationStatus |
| Onset/abatement | O | Date/time/period/string terkontrol | Condition onset/abatement |
| Evidence/note | O | Reference/text | Condition.evidence/note |

Versi ICD-10 dan source registry harus dicatat. Pencarian boleh menyimpan istilah
Indonesia, sedangkan code tetap canonical.

## G. Tindakan/prosedur

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Procedure code/text | K | ICD-9-CM/terminologi aktif atau teks lokal | Procedure.code |
| Status | K | completed/not-done/dll | Procedure.status |
| Performed time/period | K | DateTime/Period | Procedure.performed |
| Performer | K | Practitioner + role | Procedure.performer |
| Body site | O | Coded | Procedure.bodySite |
| Outcome/complication | O | Coded/text | Procedure.outcome/complication |
| Not-done reason | K | Coded/text bila tidak dilakukan | Procedure.statusReason |

Record Procedure hanya dibuat ketika ada tindakan yang dilakukan atau secara
eksplisit tidak dilakukan. Ketiadaan tindakan bukan error finalisasi.

## H. Resep dan terapi obat

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Medication identity | K | KFA/local catalog code, name snapshot, form, strength | Medication |
| Order status/intent | K | Enum terkontrol | MedicationRequest.status/intent |
| Dose | K | Quantity/range | dosageInstruction.doseAndRate |
| Route | K | Coded | dosageInstruction.route |
| Timing/frequency | K | Struktur timing, bukan string saja | dosageInstruction.timing |
| Duration | K | Quantity + unit | timing repeat/bounds atau dispense request |
| Quantity | K | Quantity + unit | dispenseRequest.quantity |
| Patient instruction | K | Text yang siap dicetak | dosageInstruction.patientInstruction |
| Indication | O | Reference diagnosis/complaint | MedicationRequest.reasonReference/code |
| Substitution rule | O | Allowed + reason | substitution |
| Prescriber/authoredAt | K | Practitioner + server time | requester/authoredOn |

Jika kunjungan tidak menghasilkan resep, RME tetap dapat final. Order, dispense,
dan administration adalah kejadian berbeda dan tidak boleh digabung menjadi
satu status lokal.

## I. Edukasi, rencana, dan terminasi kunjungan

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Edukasi/instruksi | W | Text + topic + recipient bila perlu | CarePlan/Communication/Composition section |
| Rencana terapi | W | Structured items + narasi | CarePlan |
| Kontrol ulang | K | Date/period + reason | CarePlan/Appointment sesuai use case |
| Rujukan/order pemeriksaan | K | Target/service/reason/priority | ServiceRequest |
| Prognosis | O | Coded/text | ClinicalImpression.prognosis |
| Kondisi saat pulang | O | Coded/text | Encounter/clinical summary |
| Disposisi | W | pulang, rujuk, rawat, lainnya | Encounter disposition/profile aktif |

## J. Profil konsultasi gigi

Bagian ini berlaku ketika `serviceProfile = OUTPATIENT_DENTAL`. Detail model dan
UX terdapat pada [profil konsultasi gigi](./dental-consultation.md).

| Elemen | Tingkat | Tipe/makna lokal | Acuan pertukaran |
| --- | --- | --- | --- |
| Dentisi | W | permanent/primary/mixed | Konteks odontogram |
| Status review odontogram | W | reviewed + coverage + reviewer/time | Provenance Observation |
| Tooth identifier | K | FDI code tervalidasi | Observation.bodySite sesuai profile |
| Tooth finding | K | category, code/text, status, effectiveAt | Observation code/component |
| Tooth surface | K | Coded surface; hanya bila finding mendukung | Observation.component sesuai profile |
| Restoration/prosthesis/material | K | Konsep terpisah dan coded bila tersedia | Observation component/resource sesuai profile |
| Oral finding | O | Oklusi, torus, palatum, diastema, anomali, lainnya | Observation |
| DMF-T/dmf-t | O | Components, score, method, performer/time | Observation |
| OHI-S/DI-S/CI-S | O | Components, score, interpretation, method | Observation |
| Target diagnosis/tindakan | K | Tooth finding + optional surface | Condition/Procedure body site/reference |
| Dental imaging/reference | O | Order, study/result, attachment metadata | ServiceRequest/ImagingStudy/DiagnosticReport |

`W` pada status review tidak berarti semua gigi wajib mempunyai nilai. Sistem
wajib membedakan tidak diperiksa, diperiksa tanpa temuan, dan temuan klinis;
tidak boleh mengisi semua gigi sehat secara otomatis.

## K. Metadata dokumen dan audit

| Elemen | Tingkat | Aturan |
| --- | --- | --- |
| Medical record status | W | DRAFT atau FINAL; AMENDED pada fase lanjutan |
| Version | W | Bertambah di server pada setiap write |
| Author/recorder | W | User dan Practitioner lokal yang dapat ditelusuri |
| Authored/finalized time | W | Server timestamp |
| Validation profile | W | ID + version profile yang dipakai saat final |
| Amendment reason/link | K | Wajib untuk koreksi final |
| Audit correlation | W | Request/correlation ID tanpa clinical payload di log |
| Signature/attestation | T | Dirancang sebagai metadata terpisah sesuai kebijakan |

## Validation profile awal

`OUTPATIENT_GENERAL_V1` menjadi profile pertama. Preflight minimal memeriksa:

- Encounter masih `IN_PROGRESS` dan version cocok;
- patient, organization, location, dan clinician tersedia;
- keluhan utama dan riwayat penyakit sekarang terisi;
- status review alergi eksplisit;
- pemeriksaan/asesmen yang diwajibkan profile terisi;
- tepat satu diagnosis utama dengan kode valid;
- edukasi/rencana dan disposisi terisi;
- setiap resep mempunyai medication identity dan dosage yang dapat dipahami;
- author/finalizer memiliki permission dan hubungan organisasi yang sah.

Profile berikutnya dapat menambah aturan untuk gigi, KIA, imunisasi, atau layanan
lain tanpa menambah `if` tersebar di form dan service.

`OUTPATIENT_DENTAL_V1` mewarisi profile umum, lalu menambahkan dentisi, review
odontogram, validasi FDI/surface, target diagnosis/tindakan, dan rule tindakan
invasif. Indeks gigi tidak menjadi wajib universal; kewajiban mengikuti usia,
jenis kunjungan, risiko, dan kebijakan klinis yang sudah direview dokter gigi.
