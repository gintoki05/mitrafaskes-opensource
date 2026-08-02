<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Aturan arsitektur frontend

- Utamakan Server Page dan Server Component. Tambahkan `"use client"` hanya pada batas terkecil yang benar-benar membutuhkan state interaktif, event handler, effect, atau API browser.
- Jangan menjadikan seluruh halaman Client Component hanya karena satu bagian membutuhkan interaksi. Pisahkan bagian interaktif tersebut menjadi Client Component tersendiri.
- Jika file halaman atau komponen terlalu panjang dan memiliki bagian yang cocok dipisahkan, pecah menjadi komponen berdasarkan tanggung jawab yang jelas.
- Buat dan gunakan file reusable untuk komponen, hook, utilitas, tipe, serta pola state yang dipakai bersama. Gunakan komponen UI dan abstraksi yang sudah ada sebelum membuat implementasi duplikat.
- Route `page.tsx` harus tetap tipis dan hanya merakit screen/feature component.
- Gunakan folder feature-local di bawah `components/screens/<feature>/` untuk
  komponen, tipe form, konstanta display, dan utilitas yang hanya dipakai fitur
  tersebut.
- Tipe resource/API yang dipakai lintas frontend-backend tetap berada di
  `packages/shared`; tipe draft form dan opsi label UI tetap lokal di fitur.
- File screen di atas sekitar 300 baris adalah sinyal untuk menilai pemisahan;
  file di atas 500 baris harus dipecah berdasarkan tanggung jawab atau diberi
  alasan teknis yang jelas.
- Jangan memindahkan `const` atau `type` saja untuk membuat file terlihat
  pendek. Ekstrak bagian yang memiliki perilaku dan kontrak props yang jelas.
- Saat memecah komponen interaktif, tetapkan pemilik state dengan jelas dan
  pertahankan satu sumber kebenaran untuk setiap state.
- Setelah refactor struktur, jalankan lint/type check yang relevan dan build
  web bila praktis. Pastikan import route, permission, aksesibilitas, dan
  perilaku submit tidak berubah.

Mulai pertimbangkan refactor ketika:

- Banyak state saling berkaitan dan sering diperbarui bersamaan: gunakan `useReducer`.
- Beberapa `useEffect` menangani satu fitur yang sama: pindahkan fitur tersebut ke custom hook.
- `useEffect` dipakai untuk menghitung nilai dari state lain: biasanya tidak perlu effect; hitung langsung atau gunakan `useMemo` bila perhitungannya memang mahal.
- Satu file menangani UI, fetch data, form, timer, dan event listener sekaligus: pecah berdasarkan tanggung jawab.
- Dependency array makin sulit dijaga atau sering menimbulkan loop.

## Checklist sebelum menambah kode ke screen

Sebelum menambahkan bagian besar ke screen yang sudah ada, AI harus:

1. Memeriksa ukuran file dan mencatat tanggung jawab yang sudah ada.
2. Mencari komponen, hook, tipe, konstanta, dan primitive UI yang sudah dapat
   digunakan kembali.
3. Memecah screen terlebih dahulu jika perubahan menambah tanggung jawab baru
   atau melewati ambang review di atas.
4. Menyebutkan file yang dibuat/diubah serta verifikasi yang dijalankan.
