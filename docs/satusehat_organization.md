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
GET /api/integrations/SATUSEHAT/resources/Organization/:id/preview
```

Sinkronisasi ke sandbox:

```text
POST /api/integrations/SATUSEHAT/resources/Organization/:id/sync
```

Pencarian Organization yang sudah ada di SATUSEHAT:

```text
GET /api/integrations/SATUSEHAT/resources/Organization/search?id={satusehat-id}
GET /api/integrations/SATUSEHAT/resources/Organization/search?name={nama}
GET /api/integrations/SATUSEHAT/resources/Organization/search?partof={parent-satusehat-id}
GET /api/integrations/SATUSEHAT/resources/Organization/search?parentLocalId={parent-local-id}
```

Hubungkan resource SATUSEHAT ke Organization lokal tanpa membuat resource baru:

```text
POST /api/integrations/SATUSEHAT/resources/Organization/:id/link
{
  "externalResourceId": "{satusehat-id}"
}
```

Impor resource SATUSEHAT menjadi Organization lokal sekaligus membuat link:

```text
POST /api/integrations/SATUSEHAT/resources/Organization/import
{
  "externalResourceId": "{satusehat-id}",
  "code": "POLI-UMUM",
  "parentId": "{local-parent-id}"
}
```

Keduanya menggunakan sesi API lokal. Preview dan search membutuhkan
`sync.status-read`, sedangkan sync, link, dan import membutuhkan `sync.retry`.

Pencarian membutuhkan `master-data.read`. Link dan import membutuhkan
`master-data.write`.

Pencarian Organization mengikuti `Bundle.link` dengan `relation: "next"`
hingga seluruh halaman selesai digabungkan. Batas aman default adalah 100
halaman dan dapat diubah melalui `SATUSEHAT_MAX_PAGINATION_PAGES`. Link
lanjutan hanya diikuti jika masih berada pada endpoint FHIR SATUSEHAT yang
dikonfigurasi.

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

1. Isi `INTEGRATION_SATUSEHAT_ENABLED=true`, `SATUSEHAT_ORGANIZATION_ID`, dan
   kredensial sandbox di `apps/api/.env`.
2. Buat satu organisasi lokal bertipe `HEALTHCARE_FACILITY` tanpa parent, atau
   gunakan link jika data lokalnya sudah ada.
3. Jika Organization induk sudah ada di SATUSEHAT, buka pencarian lalu link
   resource tersebut ke organisasi lokal. Untuk sub-organisasi yang sudah ada,
   pilih parent lokal yang sesuai lalu import.
4. Untuk Organization baru, jalankan preview lalu sync; API akan membuat
   resource SATUSEHAT dan menyimpan linkage lokal.
5. Buat atau import `SUB_ORGANIZATION` di bawah organisasi induk. Parent
   SATUSEHAT akan diisi atau diverifikasi melalui `Organization.partOf`.

`Location` mengikuti setelah struktur Organization ini tervalidasi di sandbox.
