# Autentikasi SATUSEHAT

Backend API sekarang sudah memiliki client OAuth2 SATUSEHAT untuk environment sandbox. Implementasinya mengikuti dokumentasi resmi [API Akses Token SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/authentication/apis/token/):

- `POST {SATUSEHAT_OAUTH_BASE_URL}/accesstoken`
- query `grant_type=client_credentials`
- body `application/x-www-form-urlencoded` berisi `client_id` dan `client_secret`
- token disimpan sementara di memory API dan digunakan ulang sampai mendekati masa kedaluwarsa

## Konfigurasi

Salin `apps/api/.env.example` menjadi `apps/api/.env`, lalu isi nilai sandbox pada server API:

```env
SATUSEHAT_ENVIRONMENT=sandbox
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

Setelah API berjalan, panggil endpoint internal berikut menggunakan sesi admin lokal:

```bash
curl http://localhost:4000/api/satusehat/auth/status \
  -H "Authorization: Bearer mock-jwt-token-admin"
```

Endpoint ini memanggil endpoint token SATUSEHAT bila kredensial sudah dikonfigurasi, tetapi tidak pernah mengembalikan `access_token` atau `client_secret`.

Nilai `status` yang mungkin:

- `NOT_CONFIGURED`: Client ID atau Client Secret belum diisi.
- `CONNECTED`: token berhasil diperoleh dan siap dipakai oleh adapter FHIR server-side.
- `ERROR`: SATUSEHAT menolak request atau endpoint tidak dapat dijangkau; detail HTTP yang aman ditampilkan tanpa kredensial.

Access token belum dipakai untuk mengirim `Organization`, `Location`, atau resource klinis. Adapter resource tersebut akan menggunakan `SatusehatAuthService.getAccessToken()` pada tahap berikutnya.
