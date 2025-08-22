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

## Rilis
- Update `CHANGELOG.md`.
- Tag versi semantik (mis. `v0.2.0`).
