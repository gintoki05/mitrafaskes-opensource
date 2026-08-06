# Tahap 2 — Location SATUSEHAT

SATUSEHAT menempatkan registrasi struktur lokasi setelah struktur organisasi.
`Location` merepresentasikan bangunan, lantai, atau ruangan tempat layanan
kesehatan dilakukan.

Referensi resmi:

- [Prerequisites SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/fhir/prerequisites/)
- [FHIR Location](https://satusehat.kemkes.go.id/platform/docs/id/fhir/resources/location/)
- [REST API Location](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/onboardings/apis/location/)

## Prasyarat lokal

- Organization pengelola harus sudah memiliki `ExternalResourceLink` SATUSEHAT.
- Location induk harus sudah disinkronkan sebelum Location anak.
- Latitude dan longitude bersifat opsional untuk draft lokal dan sync. Jika
  hanya salah satu diisi, sync akan ditolak; jika keduanya diisi, keduanya
  dikirim sebagai `Location.position`. Altitude juga bersifat opsional.
- Catatan kompatibilitas: pemetaan FHIR resmi SATUSEHAT menandai latitude dan
  longitude sebagai mandatory, tetapi implementasi ini mengikuti perilaku
  sandbox yang menerima Location tanpa `position`; kegagalan validasi remote
  tetap dicatat sebagai `FAILED` pada log sinkronisasi.
- `serviceUnitId` adalah relasi internal Mitra Faskes dan tidak dikirim sebagai
  referensi FHIR pada tahap ini.

## Endpoint lokal

Preview payload tanpa memanggil SATUSEHAT:

```text
GET /api/master/locations/:id/satusehat/preview
```

Sinkronisasi ke sandbox:

```text
POST /api/master/locations/:id/satusehat/sync
```

Pencarian Location yang sudah tersedia di SATUSEHAT:

```text
GET /api/master/locations/satusehat/search
```

Parameter pencarian yang didukung:

- `id`: mengambil satu Location berdasarkan UUID SATUSEHAT.
- `identifier`: kode Location; bila `organizationLocalId` dipakai, sistem
  membentuk identifier lengkap sesuai organisasi tersebut.
- `name`: pencarian berdasarkan nama, sebagian atau lengkap.
- `organization`: ID Organization SATUSEHAT.
- `organizationLocalId`: organisasi lokal yang sudah terhubung; sistem akan
  menerjemahkannya ke ID Organization SATUSEHAT.

Import Location SATUSEHAT menjadi data lokal:

```text
POST /api/master/locations/satusehat/import
```

Body menerima `externalResourceId`, `organizationId` opsional, `parentId`,
`serviceUnitId`, dan `code` lokal opsional. Jika Organization tidak diberikan,
sistem mencari Organization lokal melalui linkage `managingOrganization`.
Parent remote harus sudah diimpor atau dihubungkan agar relasi `partOf` dapat
dipertahankan.

Hubungkan Location lokal dengan data yang sudah ada di SATUSEHAT:

```text
POST /api/master/locations/:id/satusehat/link
```

Link memuat detail remote, lalu memvalidasi `managingOrganization` dan `partOf`
sebelum menyimpan `ExternalResourceLink`.

Preview membutuhkan `master-data.read`, sedangkan sync membutuhkan
`master-data.write`.

## Mapping payload

- `Location.code` menjadi `identifier.value` dengan system
  `http://sys-ids.kemkes.go.id/location/{organization-ihs-number}`.
- Organization yang ter-link menjadi `managingOrganization`.
- Location parent yang ter-link menjadi `partOf`.
- `BUILDING`, `FLOOR`, `ROOM`, dan `OTHER` dipetakan ke physical type FHIR
  `bu`, `lvl`, `ro`, dan `oth`.
- `status` lokal dipetakan ke `active`, `suspended`, atau `inactive`. Data
  lokal yang `active=false` selalu dikirim sebagai `inactive`.
- `latitude` dan `longitude` yang tersedia lengkap dipetakan ke `position`;
  altitude dikirim bila tersedia.

Location baru dikirim dengan `POST`. Location yang sudah memiliki linkage
dikirim ulang dengan `PUT`, lalu UUID SATUSEHAT dan status operasi dicatat di
`ExternalResourceLink` dan `SatusehatSyncLog`.

Data dari SATUSEHAT dapat dicari melalui tombol **Ambil dari SATUSEHAT** pada
halaman Location. Data lokal yang sudah ada dapat memakai aksi **Hubungkan**.
Import dan link tetap menghormati hierarchy: parent harus sudah memiliki
linkage sebelum Location child diimpor atau disinkronkan.
