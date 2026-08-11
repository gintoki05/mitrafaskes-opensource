# Autentikasi SATUSEHAT

Backend API memiliki client OAuth2 SATUSEHAT yang hanya dibuat ketika plugin
diaktifkan. Implementasinya mengikuti dokumentasi resmi [API Akses Token
SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/authentication/apis/token/):

- `POST {SATUSEHAT_OAUTH_BASE_URL}/accesstoken`
- query `grant_type=client_credentials`
- body `application/x-www-form-urlencoded` berisi `client_id` dan `client_secret`
- token disimpan sementara di memory API dan digunakan ulang sampai mendekati masa kedaluwarsa

## Konfigurasi

Salin `apps/api/.env.example` menjadi `apps/api/.env`, lalu isi nilai sandbox pada server API:

```env
SATUSEHAT_ENVIRONMENT=sandbox
INTEGRATION_SATUSEHAT_ENABLED=true
SATUSEHAT_ORGANIZATION_ID=<organization-id>
SATUSEHAT_CLIENT_ID=<client-id>
SATUSEHAT_CLIENT_SECRET=<client-secret>
SATUSEHAT_OAUTH_BASE_URL=https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1
SATUSEHAT_HTTP_TIMEOUT_MS=10000
SATUSEHAT_TOKEN_REFRESH_SKEW_SECONDS=60
SATUSEHAT_TOKEN_FAILURE_COOLDOWN_MS=60000
```

Jangan menaruh `SATUSEHAT_CLIENT_SECRET` pada `apps/web/.env.local`, variabel `NEXT_PUBLIC_*`, source code, atau repository.

## Pemeriksaan koneksi

Saat `INTEGRATION_SATUSEHAT_ENABLED=false` atau flag tidak diisi, endpoint
provider mengembalikan `503 INTEGRATION_DISABLED` dan tidak ada request OAuth.
Setelah plugin diaktifkan, panggil endpoint generic berikut menggunakan sesi
admin lokal:

```bash
curl http://localhost:4000/api/integrations/SATUSEHAT/connection \
  -H "Authorization: Bearer mock-jwt-token-admin"
```

Endpoint ini memanggil endpoint token SATUSEHAT bila kredensial sudah
dikonfigurasi, tetapi tidak pernah mengembalikan `access_token` atau
`client_secret`.

Nilai `status` yang mungkin:

- `NOT_CONFIGURED`: Client ID atau Client Secret belum diisi.
- `CONNECTED`: token berhasil diperoleh dan siap dipakai oleh adapter FHIR server-side.
- `ERROR`: SATUSEHAT menolak request atau endpoint tidak dapat dijangkau; detail HTTP yang aman ditampilkan tanpa kredensial.

Adapter resource Organization, Location, Practitioner, dan Patient memakai
client yang sama. Remote Encounter, Condition, dan Observation bukan bagian
dari refactor integrasi opsional ini.
