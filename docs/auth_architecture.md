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

## Status implementasi saat dokumen dibuat

Auth saat ini masih merupakan scaffold development:

- endpoint login berada di `apps/api/src/app.controller.ts`;
- username dan token demo masih hard-coded;
- password demo belum diverifikasi sebagai hash yang aman;
- `SessionPermissionGuard` masih membaca token mock;
- frontend masih menyimpan token di `localStorage`.

Kondisi tersebut bukan kontrak production. Implementasi auth berikutnya harus
mengganti scaffold ini secara bertahap tanpa mengubah workflow klinis yang
sudah berjalan.

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
│   ├── GET  /api/auth/me
│   ├── POST /api/auth/logout
│   ├── POST /api/auth/logout-all
│   └── POST /api/auth/change-password
├── AuthService
│   └── orkestrasi login, logout, dan perubahan password
├── PasswordService
│   └── hash, verify, dan rehash Argon2id
├── SessionService
│   └── create, resolve, rotate, expire, dan revoke sesi
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

Nilai `PERAWAT` saat ini merupakan kode legacy untuk petugas pendaftaran.
Arsitektur target menggunakan kode produk `PENDAFTARAN` secara eksplisit dan
mempertahankan compatibility mapping sampai migrasi data selesai. Role
`PERAWAT` selanjutnya mewakili profesi perawat, bukan petugas pendaftaran.

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

## Alur autentikasi

### Login

```text
Browser -> POST /api/auth/login
NestJS  -> validasi DTO dan rate limit
NestJS  -> cari identity lokal dan user aktif
NestJS  -> verifikasi Argon2id
NestJS  -> buat session dan audit event
NestJS  -> Set-Cookie HttpOnly
Browser -> GET /api/auth/me
```

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
origin API tidak melindungi dokumen yang dirender Next.js.

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
login, reset password, perubahan password, dan endpoint auth sensitif. Login
dibatasi berdasarkan kombinasi sinyal seperti alamat jaringan dan username
yang dinormalisasi agar serangan terdistribusi maupun penguncian akun palsu
lebih sulit dilakukan.

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

Audit auth minimal mencatat login berhasil/gagal, logout, logout-all, perubahan
password, pencabutan sesi, dan perubahan membership/role. Event menyimpan actor,
waktu, hasil, request/correlation ID, dan metadata aman; tidak menyimpan secret.

## Tahapan migrasi

1. Tambahkan model session dan fondasi membership/role tanpa mengubah alur
   klinis.
2. Buat `AuthModule`, Argon2id password service, dan endpoint login/me/logout.
3. Ganti mock token dengan global `SessionGuard` dan `PermissionGuard`.
4. Migrasikan credential seed development menjadi hash Argon2id.
5. Ganti penyimpanan frontend dari `localStorage` ke cookie session dan CSRF.
6. Aktifkan Helmet, CORS allowlist, CSRF, serta rate limiting.
7. Migrasikan kode legacy `PERAWAT` menuju `PENDAFTARAN` dengan compatibility
   test.
8. Verifikasi session lifecycle, `401`/`403`, permission, audit, dan isolasi
   lintas tenant sebelum menghapus scaffold auth lama.

## Gate verifikasi

- Unit test hash/verify, login generik, expiry, rotasi, dan revokasi sesi.
- E2E login, `/auth/me`, logout, logout-all, dan perubahan password.
- E2E setiap role terhadap endpoint yang diizinkan dan ditolak.
- Uji dependency bahwa user nonaktif dan membership dicabut kehilangan akses.
- Uji CSRF, CORS origin ditolak, cookie flags, dan rate limit auth.
- Uji tenant isolation dengan record milik organisasi berbeda.
- Uji bahwa password, hash, cookie, token, dan secret tidak muncul pada log atau
  response.
- Browser test login, refresh, multi-tab, expiry, `401`, `403`, dan logout.

## Referensi resmi

- [Authentication NestJS](https://docs.nestjs.com/security/authentication)
- [Authorization NestJS](https://docs.nestjs.com/security/authorization)
- [Encryption and Hashing NestJS](https://docs.nestjs.com/security/encryption-and-hashing)
- [Helmet NestJS](https://docs.nestjs.com/security/helmet)
- [CORS NestJS](https://docs.nestjs.com/security/cors)
- [CSRF Protection NestJS](https://docs.nestjs.com/security/csrf)
- [Rate Limiting NestJS](https://docs.nestjs.com/security/rate-limiting)
