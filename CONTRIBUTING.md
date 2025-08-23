# Contributing Guide

Terima kasih telah berkontribusi! Panduan ini membantu menjaga kualitas dan konsistensi.


## Setup Lokal

```bash
npm install
npm run dev
```


## Branching

  - `main`: stabil.
  - Fitur/bugfix: buat branch `feat/...` atau `fix/...` dari `main`.


## Commit Message (Conventional Commits)

  - `feat: add voyager tiles`
  - `fix: correct indonesia center`
  - `docs: update README`
  - `chore: bump deps`


## PR Checklist

  - Sudah build lokal `npm run build`.
  - Tidak melanggar lisensi (attribution tampil bila diwajibkan).
  - Perubahan peta dijelaskan singkat di PR.


## Testing Manual

  - Buka http://localhost:5173
  - Cek drag, zoom, dan tampilan awal Indonesia.
  - Jika mengganti tiles, cek performa dan lisensi.
  - Navigasi wilayah:
    - Masuk ke kabupaten/kota, pastikan boundary tampil benar.
    - Masuk ke kecamatan, klik salah satu kecamatan:
      - Map melakukan zoom ke kecamatan.
      - Hanya boundary kecamatan tersebut yang tampil.
    - Klik "Back to All Kecamatan" untuk menampilkan semua kecamatan lagi.
    - Naik level kembali ke kabupaten/provinsi via kontrol yang tersedia.


## Rilis

  - Update `CHANGELOG.md`.
  - Tag versi semantik (mis. `v0.2.0`).
