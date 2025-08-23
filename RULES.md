# RULES

## Prinsip Umum

- Jaga kesederhanaan: satu halaman, fokus pada peta Indonesia.
- Patuh lisensi penyedia tile (tampilkan attribution jika disyaratkan).
- Hindari menaruh kunci API langsung di source. Gunakan environment variables saat diperlukan.

## Konvensi Kode

- TypeScript strict.
- React function components.
- Import CSS Leaflet di `src/main.tsx`.
- Semua UI selain peta seminimal mungkin. Komponen peta di `src/IndonesiaMap.tsx`.

## Aturan Peta

- Default: OpenStreetMap Standard dengan attribution aktif.
- Opsi no-labels boleh digunakan hanya jika requirement tanpa teks.
- Jika membatasi area ke Indonesia, gunakan `maxBounds` yang sesuai.
- Jangan menghilangkan attribution pada tile yang memerlukannya.

### Kecamatan Navigation & Boundaries

- Boundary kecamatan dengan nama sama harus di-merge (dissolve) menjadi satu MultiPolygon untuk tampilan.
- Saat kecamatan dipilih (klik), hanya boundary kecamatan terpilih yang ditampilkan; lainnya disembunyikan sampai pengguna kembali.
- Normalisasi nama wajib diterapkan untuk kecocokan (hapus prefix "Kecamatan"/"Kec.", case-insensitive). Simpan kunci ter-normalisasi di properti (mis. `district_key`).

## Manajemen Dependensi

- React 18, react-leaflet v4, leaflet.
- Hindari upgrade mayor tanpa pengujian lokal.

## Commit & Changelog

- Gunakan Conventional Commits:
  - `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`
- Perbarui `CHANGELOG.md` pada perubahan berarti.

## Keamanan

- Jangan hardcode API key.
- Perhatikan CORS dan rate limits dari penyedia tile.

## Kualitas & Review

- Jalankan `npm run build` sebelum rilis.
- Uji interaksi peta (drag/zoom) dan tampilan attribution.
