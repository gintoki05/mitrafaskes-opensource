# Tahap 1 — Organization SATUSEHAT

Tahap pertama dimulai dari struktur organisasi/faskes. Implementasi mengikuti [kontrak FHIR Organization SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/fhir/resources/organization/) dan [REST API Organization](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/onboardings/apis/organization/).

## Aturan domain

- `HEALTHCARE_FACILITY` tanpa `parentId` adalah organisasi induk lokal.
- Organisasi induk tidak dibuat ulang dengan `POST` ke SATUSEHAT. ID-nya berasal dari `SATUSEHAT_ORGANIZATION_ID`, lalu diverifikasi melalui `GET /Organization/{id}`.
- `SUB_ORGANIZATION` wajib memiliki parent dan dikirim sebagai resource Organization dengan `partOf`.
- Setelah `POST` berhasil, UUID SATUSEHAT disimpan di `ExternalResourceLink`, bukan di tabel domain.
- Jika sub-organisasi sudah memiliki linkage, adapter memakai `PUT` agar sinkronisasi berikutnya idempotent.

## Endpoint lokal

Preview payload tanpa memanggil SATUSEHAT:

```text
GET /api/master/organizations/:id/satusehat/preview
```

Sinkronisasi ke sandbox:

```text
POST /api/master/organizations/:id/satusehat/sync
```

Pencarian Organization yang sudah ada di SATUSEHAT:

```text
GET /api/master/organizations/satusehat/search?id={satusehat-id}
GET /api/master/organizations/satusehat/search?name={nama}
GET /api/master/organizations/satusehat/search?partof={parent-satusehat-id}
GET /api/master/organizations/satusehat/search?parentLocalId={parent-local-id}
```

Hubungkan resource SATUSEHAT ke Organization lokal tanpa membuat resource baru:

```text
POST /api/master/organizations/:id/satusehat/link
{
  "externalResourceId": "{satusehat-id}"
}
```

Impor resource SATUSEHAT menjadi Organization lokal sekaligus membuat link:

```text
POST /api/master/organizations/satusehat/import
{
  "externalResourceId": "{satusehat-id}",
  "code": "POLI-UMUM",
  "parentId": "{local-parent-id}"
}
```

Keduanya menggunakan sesi API lokal. Preview membutuhkan `master-data.read`, sedangkan sinkronisasi membutuhkan `master-data.write`.

Pencarian membutuhkan `master-data.read`. Link dan import membutuhkan
`master-data.write`.

## Aturan link dan import

- Jika Organization sudah ada di SATUSEHAT, gunakan link atau import. Sistem
  tidak melakukan `POST` ulang untuk resource yang sudah memiliki ID eksternal.
- ID lokal disimpan di `HealthcareOrganization.id`, sedangkan ID SATUSEHAT
  disimpan di `ExternalResourceLink.externalResourceId`.
- Satu ID Organization SATUSEHAT tidak boleh terhubung ke dua Organization lokal.
- Organization induk lokal hanya dapat di-link ke
  `SATUSEHAT_ORGANIZATION_ID`.
- Sub-organisasi hanya dapat diimpor atau di-link jika `Organization.partOf`
  cocok dengan organisasi induk lokal yang sudah terhubung.
- Import mengambil nama, status, kontak, alamat, dan relasi parent dari resource
  SATUSEHAT. Kode organisasi tetap diminta dari pengguna karena merupakan kode
  operasional lokal.

## Urutan penggunaan

1. Isi `SATUSEHAT_ORGANIZATION_ID` dan kredensial sandbox di `apps/api/.env`.
2. Buat satu organisasi lokal bertipe `HEALTHCARE_FACILITY` tanpa parent, atau
   gunakan link jika data lokalnya sudah ada.
3. Jika Organization induk sudah ada di SATUSEHAT, buka pencarian lalu link
   resource tersebut ke organisasi lokal. Untuk sub-organisasi yang sudah ada,
   pilih parent lokal yang sesuai lalu import.
4. Untuk Organization baru, jalankan preview lalu sync; API akan membuat
   resource SATUSEHAT dan menyimpan linkage lokal.
5. Buat atau import `SUB_ORGANIZATION` di bawah organisasi induk. Parent
   SATUSEHAT akan diisi atau diverifikasi melalui `Organization.partOf`.

Unit layanan dan `Location` akan mengikuti setelah struktur Organization ini tervalidasi di sandbox.
