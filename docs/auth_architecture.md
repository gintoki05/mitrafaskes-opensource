# Arsitektur Autentikasi dan Otorisasi Pengguna

Status: **diterima sebagai arsitektur target**
Tanggal keputusan: **15 Agustus 2026**

Dokumen ini mendefinisikan autentikasi pengguna aplikasi Mitra Faskes. Ini
berbeda dari OAuth2 `client_credentials` milik plugin SATUSEHAT yang dijelaskan
di `docs/satusehat_authentication.md`.

## Keputusan utama

Mitra Faskes menggunakan autentikasi lokal yang dimiliki NestJS API:

- NestJS adalah sumber kebenaran untuk identitas, sesi, membership, role, dan
  permission.
- Password disimpan sebagai hash Argon2id dan hanya diverifikasi server-side.
- Browser menggunakan opaque database session melalui cookie `HttpOnly`;
  browser tidak menyimpan access token di `localStorage`.
- Otorisasi menggunakan permission/claim dengan scope organisasi dan lokasi,
  bukan pemeriksaan nama role langsung pada controller.
- Next.js menyesuaikan tampilan berdasarkan sesi, tetapi keputusan keamanan
  selalu ditegakkan kembali oleh NestJS.
- Auth.js tidak digunakan. Arsitektur Next.js + NestJS tidak membutuhkan
  sumber sesi kedua pada frontend.
- Passport belum diperlukan untuk autentikasi lokal. OIDC dapat ditambahkan
  kemudian melalui adapter autentikasi NestJS tanpa mengubah domain role dan
  permission.

## Status implementasi vertical slice

Fondasi auth lokal sudah diimplementasikan pada vertical slice pertama tanpa
mengubah `User.role` yang masih dipakai workflow klinis saat ini:

- `AuthModule` berada di `apps/api/src/auth` dan guard session/permission
  dipasang global;
- `AuthSession` menyimpan digest SHA-256 dari opaque token, bukan token asli;
- password seed dan pembuatan practitioner baru memakai Argon2id;
- browser memakai cookie `HttpOnly`, sedangkan client non-browser memakai
  endpoint bearer terpisah;
- frontend melakukan bootstrap sesi melalui `/api/auth/me` dan tidak lagi
  menyimpan token auth di `localStorage`;
- Helmet, CORS allowlist, CSRF double-submit, dan throttling sudah aktif.

Multi-organisasi, multi-role, `AuthIdentity`/OIDC, audit event auth khusus, dan
policy object-level tetap merupakan tahap berikutnya. Implementasi saat ini
mempertahankan role `ADMIN`, `DOKTER`, dan `PERAWAT`, serta menambahkan
`PETUGAS_PENDAFTARAN` sebagai role administratif eksplisit.

## Batas tanggung jawab

| Lapisan | Tanggung jawab |
| --- | --- |
| Next.js | Form login, konsumsi sesi, CSRF header, route UX, dan penanganan `401`/`403` |
| NestJS | Credential, sesi, autentikasi, otorisasi, CORS, CSRF, rate limiting, dan audit auth |
| PostgreSQL | User, identity, credential hash, sesi, membership, role, dan permission |
| Infrastruktur | HTTPS/TLS, reverse proxy, secret management, backup, dan monitoring |

Penyembunyian menu atau tombol di Next.js hanya membantu UX dan tidak pernah
menggantikan guard atau pemeriksaan domain di API.

## Komponen backend

```text
AuthModule
├── AuthController
│   ├── POST /api/auth/login
│   ├── POST /api/auth/token
│   ├── GET  /api/auth/csrf
│   ├── GET  /api/auth/me
│   ├── POST /api/auth/logout
│   ├── POST /api/auth/logout-all
│   └── POST /api/auth/change-password
├── AuthService
│   └── orkestrasi login, logout, dan perubahan password
├── PasswordService
│   └── hash dan verify Argon2id
├── SessionService
│   └── create, resolve, idle/absolute expiry, dan revoke sesi
├── SessionGuard
│   └── membangun request principal yang terautentikasi
└── PermissionGuard
    └── mengevaluasi permission dan scope principal
```

`SessionGuard` dan `PermissionGuard` dipasang secara global. Endpoint publik
harus diberi `@Public()` secara eksplisit. Endpoint terlindungi menyatakan
kemampuannya melalui `@RequirePermission(...)`.

## Model data target

Model akhir memisahkan identitas login dari keanggotaan fasilitas:

```text
User
├── profil pengguna aplikasi yang stabil
├── AuthIdentity[]
├── AuthSession[]
└── OrganizationMembership[]

AuthIdentity
├── provider: LOCAL | OIDC
├── subject: identifier stabil dari provider
└── PasswordCredential? (khusus LOCAL)

OrganizationMembership
├── organizationId
├── userId
├── active
├── location scope
└── MembershipRole[]

Role ── RolePermission ── Permission
```

Satu pengguna dapat menjadi anggota lebih dari satu organisasi dan memiliki
lebih dari satu role. Role tidak disimpan sebagai atribut global tunggal pada
`User`. Permission efektif berasal dari membership pada organisasi aktif dan,
bila berlaku, lokasi aktif.

Pada migrasi awal, `User.passwordHash` yang sudah ada boleh dipakai sebagai
credential lokal sementara. Pemisahan ke `AuthIdentity` dan
`PasswordCredential` dilakukan sebelum provider OIDC kedua diperkenalkan.

Nilai `PERAWAT` sekarang mewakili profesi perawat klinis untuk triase. Role
`PETUGAS_PENDAFTARAN` dipakai untuk akun administratif pendaftaran; akun
`PERAWAT` lama tidak dipindahkan menjadi pendaftaran.

## Password dan credential

- Form mengirim field `password`, bukan `passwordHash`, melalui HTTPS.
- NestJS melakukan hash dan verifikasi dengan Argon2id.
- Database menyimpan encoded Argon2 PHC string yang sudah memuat salt dan
  parameter algoritma.
- Password tidak dienkripsi dan tidak dapat dipulihkan kembali.
- Parameter hash dapat dinaikkan; credential direhash setelah login berhasil
  ketika parameter lama sudah tidak memenuhi baseline.
- Respons login gagal selalu generik agar tidak membocorkan apakah username
  terdaftar, nonaktif, atau password salah.
- Password, hash, session token, CSRF token, dan secret tidak boleh masuk log.

Hash password dan hash session token memiliki kebutuhan berbeda. Password
berentropi rendah sehingga memakai Argon2id. Session token dibangkitkan secara
acak dengan entropi tinggi dan dapat disimpan sebagai SHA-256 digest agar token
asli tidak tersimpan di database.

## Session browser

Cookie sesi menggunakan baseline berikut:

```text
name: mitrafaskes_session
HttpOnly: true
Secure: true pada production
SameSite: Lax
Path: /
```

Cookie hanya berisi opaque random token. Record `AuthSession` minimal memuat:

- `id`, `userId`, dan `tokenHash`;
- `createdAt`, `lastSeenAt`, dan `expiresAt`;
- `revokedAt` dan alasan revokasi bila ada;
- metadata aman seperti user agent dan informasi jaringan yang sudah
  diminimalkan sesuai kebutuhan audit.

Sesi memiliki idle expiry dan absolute expiry yang dapat dikonfigurasi.
Perubahan password, penonaktifan user, atau pencabutan membership harus dapat
mencabut sesi terkait. Token dirotasi pada kejadian sensitif untuk mencegah
session fixation.

Database session dipilih agar logout-all, pencabutan akses segera, pembatasan
concurrent session, dan penemuan sesi bermasalah dapat dilakukan server-side.
Redis boleh ditambahkan sebagai cache atau shared rate-limit store pada SaaS
multi-instance, tetapi PostgreSQL tetap menjadi sumber kebenaran sesi.

Pada vertical slice ini, perubahan password mencabut seluruh sesi lain dan
mempertahankan sesi aktif agar pengguna tidak terputus di tengah pekerjaan.
Rotasi sesi aktif setelah kejadian sensitif dan rehash transparan saat login
merupakan penguatan tahap berikutnya.

## Alur autentikasi

### Login browser

```text
Browser -> GET  /api/auth/csrf
Browser -> POST /api/auth/login + X-CSRF-Token
NestJS  -> validasi DTO dan rate limit
NestJS  -> cari identity lokal dan user aktif
NestJS  -> verifikasi Argon2id
NestJS  -> buat AuthSession
NestJS  -> Set-Cookie HttpOnly
Browser -> GET /api/auth/me
```

`POST /api/auth/login` mengembalikan `{ user }` tanpa raw token. Untuk mobile,
CLI, integration test, atau client yang memang tidak memakai cookie, gunakan
`POST /api/auth/token`; endpoint ini mengembalikan `{ accessToken, user }` dan
tidak mengatur cookie.

### Request terlindungi

```text
Request
  -> SessionGuard
  -> resolve session dan user aktif
  -> resolve organisasi/lokasi aktif
  -> PermissionGuard
  -> pemeriksaan aturan object-level di domain service
  -> controller/service operation
```

### Logout

Logout mencabut record sesi di server dan menghapus cookie. Logout-all mencabut
seluruh sesi aktif milik user. Menghapus cookie saja tidak cukup untuk dianggap
sebagai revokasi server-side.

## Otorisasi

Permission code stabil tetap berada di `packages/shared`, misalnya:

```text
patient.read
queue.create
rme.write-draft
rme.finalize
pharmacy.prescription.read
pharmacy.dispense.create
```

Role adalah kumpulan permission yang dapat di-seed atau dikonfigurasi melalui
database. Controller menyatakan permission, bukan role:

```ts
@RequirePermission(AccessPermission.RME_FINALIZE)
```

Guard endpoint tidak cukup untuk semua keputusan. Aturan seperti "dokter hanya
dapat mengubah encounter yang ditugaskan kepadanya", status final RME, scope
lokasi, dan kepemilikan record harus tetap diperiksa di domain service dalam
transaksi yang relevan.

CASL belum diperlukan selama permission endpoint dan aturan domain masih dapat
dibaca dengan jelas. CASL atau policy engine lain baru dipertimbangkan ketika
aturan object-level menjadi sulit dipelihara secara konsisten.

## Isolasi tenant

- `User` bersifat global, sedangkan role dan akses berada pada
  `OrganizationMembership`.
- Organisasi dan lokasi aktif tidak boleh diterima begitu saja dari browser;
  API memverifikasi keduanya terhadap membership setiap request.
- Semua query dan mutation data fasilitas harus menerima tenant context dari
  principal server-side.
- Pengujian lintas tenant wajib memastikan ID record dari organisasi lain
  tetap menghasilkan penolakan tanpa membocorkan detail sensitif.

## Security middleware

### Helmet

NestJS menggunakan Helmet untuk security headers response API. Middleware
dipasang sebelum route atau middleware lain yang perlu dilindungi. Header CSP
untuk HTML Next.js dikonfigurasi terpisah di aplikasi web karena Helmet pada
origin API tidak melindungi dokumen yang dirender Next.js. Karena API dan web
dapat berbeda origin, `Cross-Origin-Resource-Policy` API memakai `cross-origin`;
CORS allowlist tetap menjadi batas akses baca.

### CORS

CORS memakai allowlist origin eksplisit dari environment dan
`credentials: true`. Konfigurasi wildcard tidak boleh digabungkan dengan
credential. Method dan request header dibatasi pada kebutuhan aplikasi.

### CSRF

Karena autentikasi memakai cookie, semua operasi yang mengubah state dilindungi
dari CSRF. Backend menghasilkan dan memvalidasi token; frontend meneruskan
token melalui header khusus. `SameSite=Lax` dan pemeriksaan `Origin` menjadi
lapisan tambahan, bukan pengganti validasi CSRF.

### Rate limiting

`@nestjs/throttler` digunakan secara global dengan kebijakan lebih ketat untuk
login, perubahan password, dan endpoint auth sensitif. Baseline saat ini adalah
120 request/menit per tracker API dan 5 request/15 menit untuk login/token per
IP. Storage throttler masih in-memory untuk single instance/local; SaaS
multi-instance wajib menggantinya dengan shared storage atau edge limiter.

Deployment di belakang reverse proxy harus mempercayai proxy yang benar-benar
dikenal agar IP client tidak dapat dipalsukan melalui header forwarding. SaaS
multi-instance memakai shared throttler storage atau rate limiting pada edge.

## Kontrak frontend

- `fetch` ke API menggunakan `credentials: 'include'`.
- Frontend mengambil profil melalui `GET /api/auth/me`; data user di browser
  bukan sumber kebenaran authorization.
- Frontend tidak membaca cookie session dan tidak menyimpan bearer token.
- `401 UNAUTHENTICATED` membersihkan state UI dan mengarahkan ke login tanpa
  loop.
- `403 FORBIDDEN` menampilkan akses ditolak dan tidak mengulangi request.
- Menu dan action mengikuti permission efektif untuk UX, tetapi endpoint tetap
  dijaga backend.

## OIDC dan SaaS di masa depan

Local auth tetap dapat digunakan pada SaaS karena ia berjalan pada NestJS dan
database pusat. Bila organisasi membutuhkan SSO, `AuthIdentity` ditambah dengan
provider `OIDC` dan `subject` dari issuer. NestJS memverifikasi issuer,
audience, signature, expiry, dan claim token, kemudian memetakan identity ke
`User` serta membership lokal.

Provider eksternal hanya membuktikan identitas. Role klinis, scope organisasi,
scope lokasi, dan permission tetap dimiliki Mitra Faskes. Dengan batas ini,
Keycloak, Microsoft Entra ID, atau provider OIDC lain dapat ditambahkan tanpa
memindahkan authorization domain ke provider.

## Respons dan audit

| Kondisi | Respons |
| --- | --- |
| Credential login salah | `401 UNAUTHENTICATED` dengan pesan generik |
| Session hilang, kedaluwarsa, atau dicabut | `401 UNAUTHENTICATED` |
| User atau membership nonaktif | `401 UNAUTHENTICATED` atau sesi dicabut |
| Session sah tanpa permission | `403 FORBIDDEN` |
| Terkena rate limit | `429 TOO_MANY_REQUESTS` |
| CSRF tidak valid | `403 FORBIDDEN` dengan kode aman yang konsisten |

Audit auth khusus belum menjadi tabel pada vertical slice ini. Logging aplikasi
tidak boleh mencatat password, hash, cookie, token, atau secret. Tabel/event
audit auth dan correlation ID wajib ditambahkan sebelum kebutuhan compliance
produksi diaktifkan.

## Tahapan migrasi

1. ~~Tambahkan model session~~ **selesai**: `AuthSession` dan migrasi database.
2. ~~Buat `AuthModule`, Argon2id password service, dan endpoint
   login/me/logout~~ **selesai**.
3. ~~Ganti mock token dengan global `SessionGuard` dan `PermissionGuard`~~
   **selesai**.
4. ~~Migrasikan credential seed development menjadi hash Argon2id~~
   **selesai**.
5. ~~Ganti penyimpanan frontend dari `localStorage` ke cookie session dan
   CSRF~~ **selesai**.
6. ~~Aktifkan Helmet, CORS allowlist, CSRF, serta rate limiting~~ **selesai**.
7. Pertahankan akun `PERAWAT` sebagai role klinis dan buat akun
   `PETUGAS_PENDAFTARAN` untuk tugas administratif.
8. Tambahkan audit event auth, membership scope, OIDC adapter, dan verifikasi
   tenant isolation sebelum SaaS multi-organisasi diaktifkan.

## Gate verifikasi

- Unit test hash/verify, login generik, expiry, rotasi, dan revokasi sesi.
- E2E login cookie, `/auth/me`, bearer token, logout, dan CSRF.
- E2E setiap role terhadap endpoint yang diizinkan dan ditolak.
- Uji dependency bahwa user nonaktif dan membership dicabut kehilangan akses.
- Uji CSRF, CORS origin ditolak, cookie flags, dan rate limit auth.
- Uji tenant isolation dengan record milik organisasi berbeda.
- Uji bahwa password, hash, cookie, token, dan secret tidak muncul pada log atau
  response.
- Browser test login, refresh, multi-tab, expiry, `401`, `403`, dan logout.

## Checklist hardening sebelum SaaS production

Checklist ini berasal dari pentest lokal dan menjadi gate sebelum deployment
production. Jangan menganggap auth siap SaaS hanya karena login lokal sudah
berhasil.

### Prioritas wajib sebelum production

- [ ] Nonaktifkan akun demo dan password default dari `prisma/seed.ts` ketika
  `NODE_ENV=production`; bootstrap admin harus memakai secret/environment yang
  berbeda dan password awal wajib diganti.
- [ ] Tolak `AUTH_CSRF_SECRET` yang kosong, placeholder, atau terlalu pendek;
  gunakan secret manager dan rotasi secret sesuai prosedur deployment.
- [ ] Paksa `AUTH_COOKIE_SECURE=true` pada production. Jangan mengizinkan
  konfigurasi sample development menurunkan flag `Secure`.
- [ ] Ubah penolakan CORS origin menjadi respons terkontrol `403` tanpa
  exception stack trace atau error log yang dapat dibanjiri.
- [ ] Audit dan upgrade dependency rentan sebelum build production. Pindahkan
  package tooling seperti `shadcn` ke `devDependencies`, gunakan install
  production tanpa dev dependency, lalu jalankan `npm audit` kembali pada image
  final.

### Prioritas wajib sebelum multi-tenant SaaS

- [ ] Pisahkan akses berdasarkan `OrganizationMembership` dan `location scope`;
  setiap query/mutation wajib menerima tenant context dari principal server,
  bukan dari ID yang dipercaya dari browser.
- [ ] Tambahkan pengujian lintas tenant untuk detail, list, update, dan endpoint
  integrasi; record tenant lain harus ditolak tanpa membocorkan detail.
- [ ] Ganti throttler in-memory dengan shared store seperti Redis atau edge
  rate-limiter ketika API berjalan multi-instance.
- [ ] Atur `trust proxy` hanya untuk proxy yang dikenal agar IP client dan
  kebijakan rate limit/CSRF tidak dapat dimanipulasi melalui forwarding header.

### Hardening lanjutan

- [ ] Tambahkan audit event untuk login sukses/gagal, logout, logout-all,
  perubahan password, revoke session, perubahan membership, dan perubahan
  permission; sertakan correlation ID tanpa menyimpan password/token/secret.
- [ ] Aktifkan MFA untuk admin dan akun dengan permission sensitif.
- [ ] Disable Swagger atau lindungi `/api/docs` dan `/api/docs-json` di
  production.
- [ ] Tambahkan monitoring dan alert untuk brute force, lonjakan `401`/`403`,
  `429`, dan perubahan pola session.

### Keputusan arsitektur yang dipertahankan

Local auth tetap menjadi pilihan utama: NestJS API memegang identity, session,
role, permission, dan tenant authorization. Auth.js tidak perlu ditambahkan.
Provider OIDC/SSO dapat ditambahkan kemudian hanya sebagai pembuktian identity;
authorization klinis tetap berada di domain Mitra Faskes.

## Referensi resmi

- [Authentication NestJS](https://docs.nestjs.com/security/authentication)
- [Authorization NestJS](https://docs.nestjs.com/security/authorization)
- [Encryption and Hashing NestJS](https://docs.nestjs.com/security/encryption-and-hashing)
- [Helmet NestJS](https://docs.nestjs.com/security/helmet)
- [CORS NestJS](https://docs.nestjs.com/security/cors)
- [CSRF Protection NestJS](https://docs.nestjs.com/security/csrf)
- [Rate Limiting NestJS](https://docs.nestjs.com/security/rate-limiting)
