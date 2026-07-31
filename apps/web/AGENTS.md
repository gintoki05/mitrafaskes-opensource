<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Aturan arsitektur frontend

- Utamakan Server Page dan Server Component. Tambahkan `"use client"` hanya pada batas terkecil yang benar-benar membutuhkan state interaktif, event handler, effect, atau API browser.
- Jangan menjadikan seluruh halaman Client Component hanya karena satu bagian membutuhkan interaksi. Pisahkan bagian interaktif tersebut menjadi Client Component tersendiri.
- Jika file halaman atau komponen terlalu panjang dan memiliki bagian yang cocok dipisahkan, pecah menjadi komponen berdasarkan tanggung jawab yang jelas.
- Buat dan gunakan file reusable untuk komponen, hook, utilitas, tipe, serta pola state yang dipakai bersama. Gunakan komponen UI dan abstraksi yang sudah ada sebelum membuat implementasi duplikat.

Mulai pertimbangkan refactor ketika:

- Banyak state saling berkaitan dan sering diperbarui bersamaan: gunakan `useReducer`.
- Beberapa `useEffect` menangani satu fitur yang sama: pindahkan fitur tersebut ke custom hook.
- `useEffect` dipakai untuk menghitung nilai dari state lain: biasanya tidak perlu effect; hitung langsung atau gunakan `useMemo` bila perhitungannya memang mahal.
- Satu file menangani UI, fetch data, form, timer, dan event listener sekaligus: pecah berdasarkan tanggung jawab.
- Dependency array makin sulit dijaga atau sering menimbulkan loop.
