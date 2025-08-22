# Map Indonesia (React + Vite)

Peta Indonesia berbasis React + Vite menggunakan Leaflet. Menampilkan peta yang dapat digerakkan/di-zoom. Default tile: OpenStreetMap Standard (labels). Tujuan: sederhana, mudah dikembangkan oleh manusia maupun AI.

## Fitur
- Fullscreen map halaman tunggal.
- Interaktif: drag, scroll zoom, double-click zoom.
- Pusat dan zoom awal ke Indonesia (`center={[-2, 118]}`, `zoom={5}`).
- Dapat dengan/atau tanpa labels sesuai tile yang dipilih.

## Tech Stack
- React 18 + Vite 5
- TypeScript
- Leaflet + react-leaflet

## Struktur Proyek
```
/ (root)
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ IndonesiaMap.tsx
│  └─ styles.css
├─ README.md
├─ RULES.md
├─ CHANGELOG.md
├─ CONTRIBUTING.md
└─ DEVELOPMENT.md
```

## Menjalankan
1) Install dependencies
```bash
npm install
```
2) Jalankan dev server
```bash
npm run dev
```
3) Buka di browser: http://localhost:5173

## Build & Preview
```bash
npm run build
npm run preview
```

## Pengaturan Peta (utama)
- File: `src/IndonesiaMap.tsx`
- Properti penting:
  - `center`, `zoom`, `minZoom`
  - `TileLayer.url` dan `TileLayer.attribution`
  - `zoomControl`, `attributionControl`
- Batas Indonesia (opsional): gunakan `maxBounds={indonesiaBounds}` untuk membatasi panning.

### Opsi Tile Umum
- OpenStreetMap Standard (labels):
  - `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Carto Voyager (labels):
  - `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- Carto Voyager No Labels:
  - `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png`
- Carto Dark Matter No Labels (gelap, no labels):
  - `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png`
- Esri World Imagery (citra satelit):
  - `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

Catatan: beberapa provider membutuhkan attribution dan/atau API key. Sesuaikan `attribution` dan kebijakan penggunaan masing-masing provider.

## Troubleshooting
- Halaman putih atau tile tidak muncul: cek Network tab apakah domain tile terblokir.
- Type error untuk paket map: pastikan `react-leaflet@4`, `leaflet`, dan `@types/leaflet` terpasang.
- Peta terlalu jauh/terdekat: atur `center` dan `zoom`.

## Lisensi Data Tile
- Menggunakan OSM default: attribution wajib ditampilkan. Jangan sembunyikan attribution untuk layer yang mensyaratkannya.

## Kontribusi
Lihat `CONTRIBUTING.md` untuk panduan kontribusi dan standar commit.
