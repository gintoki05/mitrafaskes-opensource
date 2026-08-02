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

Keduanya menggunakan sesi API lokal. Preview membutuhkan `master-data.read`, sedangkan sinkronisasi membutuhkan `master-data.write`.

## Urutan penggunaan

1. Isi `SATUSEHAT_ORGANIZATION_ID` dan kredensial sandbox di `apps/api/.env`.
2. Buat satu organisasi lokal bertipe `HEALTHCARE_FACILITY` tanpa parent.
3. Jalankan preview untuk memeriksa payload.
4. Jalankan sync; API memverifikasi Organization induk SATUSEHAT dan membuat linkage lokal.
5. Buat `SUB_ORGANIZATION` di bawah organisasi induk.
6. Preview lalu sync sub-organisasi tersebut. Parent SATUSEHAT akan diisi pada `Organization.partOf`.

Unit layanan dan `Location` akan mengikuti setelah struktur Organization ini tervalidasi di sandbox.
