# Map Indonesia (React + Vite)

Peta Indonesia berbasis React + Vite menggunakan Leaflet. Menampilkan peta yang dapat digerakkan/di-zoom. Default tile: OpenStreetMap Standard (labels). Tujuan: sederhana, mudah dikembangkan oleh manusia maupun AI.

## Fitur
- Fullscreen map halaman tunggal.
- Interaktif: drag, scroll zoom, double-click zoom.
- Pusat dan zoom awal ke Indonesia (`center={[-2, 118]}`, `zoom={5}`).
- Dapat dengan/atau tanpa labels sesuai tile yang dipilih.
- Navigasi wilayah bertingkat: Provinsi → Kabupaten/Kota → Kecamatan.
- Klik kecamatan untuk zoom dan menampilkan hanya boundary kecamatan yang dipilih.
- Penggabungan (dissolve) polygon kecamatan bernama sama menjadi satu boundary.
- Tombol kembali untuk keluar dari mode fokus kecamatan ke semua kecamatan/kabupaten.
- Menampilkan nilai dummy pada tooltip dan pewarnaan choropleth per level (prov/kab/kec) agar UI dapat diuji tanpa API.

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

### Nilai Dummy & Pewarnaan
- Komponen memunculkan skor dummy (deterministik) berbasis ID fitur agar stabil di reload:
  - Provinsi: gunakan `feature.properties.prov_id`
  - Kabupaten/Kota: gunakan nama yang sudah dinormalisasi (tanpa prefiks "Kabupaten", "Kota", dll.)
  - Kecamatan: gunakan `feature.properties.district_key`
- Skor tampil di tooltip dan memengaruhi warna fill (choropleth). Jika tidak ingin pewarnaan dummy, hapus pemanggilan `dummyScore(...)` dan gunakan warna netral.

### Interaksi Kecamatan
- Klik salah satu kecamatan untuk auto-zoom dan hanya menampilkan boundary kecamatan tersebut.
- Gunakan tombol "Back to All Kecamatan" untuk kembali menampilkan seluruh kecamatan dalam kabupaten aktif.
- Breadcrumb/controls menampilkan level navigasi saat ini.

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
 - Jika setelah klik kecamatan masih terlihat kecamatan lain: pastikan data nama konsisten. Aplikasi sudah melakukan normalisasi nama ("Kecamatan", "Kec."). Laporkan nama kabupaten/kecamatan bila masih terjadi.

## Lisensi Data Tile
- Menggunakan OSM default: attribution wajib ditampilkan. Jangan sembunyikan attribution untuk layer yang mensyaratkannya.

## Kontribusi
Lihat `CONTRIBUTING.md` untuk panduan kontribusi dan standar commit.

## Menghubungkan ke API Nyata

Jika ingin menampilkan nilai nyata dari API:

1) Siapkan environment variable
```
cp .env.example .env
# Edit .env --> set VITE_API ke base backend kamu
```

2) Gunakan base `${VITE_API}/api`
- Contoh endpoint yang diharapkan (selaras dengan proyek referensi):
  - `/province-population`
  - `/kabupaten-population?provId={prov_id}`
  - `/kecamatan-population?kabupaten={nama_kabupaten_ternormalisasi}`

3) Mapping kolom ID
- Provinsi: `geoId` dari API → cocokan ke `feature.properties.prov_id`.
- Kabupaten/Kota: normalisasi nama (hapus prefiks seperti "Kabupaten", "Kota") sebelum dicocokkan dengan `feature.properties.name`.
- Kecamatan: gunakan `district_key`/kode unik (atau `kecamatan_code` bila tersedia) → cocokan ke `feature.properties.district_key`.

4) Langkah implementasi cepat
- Buat fungsi fetch JSON (axios/fetch) yang membaca `import.meta.env.VITE_API`.
- Simpan hasil ke map/dictionary by key (geoId/nama_norm/district_key).
- Pada `style` dan `onEachFeature`, baca skor dari dictionary tersebut; fallback ke warna netral jika tidak ada.

Catatan: Dummy score saat ini tetap aktif. Saat API sudah siap, gantikan pemanggilan `dummyScore(...)` dengan lookup ke data API.

### Memuat Lokasi Sekolah (API) pada Fokus Kecamatan
Saat user mengklik sebuah kecamatan, aplikasi akan fokus pada boundary kecamatan tersebut. Untuk menampilkan node lokasi sekolah dari API (mengganti dummy nodes):

1) Endpoint yang disarankan
- GET `${VITE_API}/api/schools?district_key={district_key}`
- Alternatif jika tidak ada `district_key`: gunakan `kabupaten` + `kecamatan` ter-normalisasi.

2) Bentuk respons (contoh)
```json
[
  { "id": "sch_1", "name": "SDN Sample 1", "lat": -6.2, "lng": 106.8, "level": "SD" },
  { "id": "sch_2", "name": "SMPN Sample 2", "lat": -6.21, "lng": 106.79, "level": "SMP" }
]
```

3) Cara mapping
- `district_key` dipakai dari `feature.properties.district_key` pada kecamatan yang difokuskan.
- Pastikan `lat/lng` valid dan berada di dalam boundary kecamatan.

4) Contoh pseudocode integrasi di `KecamatanLayer`
```ts
const HOST = import.meta.env.VITE_API
const [schools, setSchools] = React.useState<SchoolPoint[] | null>(null)

React.useEffect(() => {
  if (!selectedKec?.feature) { setSchools(null); return }
  const key = String((selectedKec.feature.properties as any)?.district_key || '')
  if (!key) { setSchools(null); return }
  fetch(`${HOST}/api/schools?district_key=${encodeURIComponent(key)}`)
    .then(r => r.json())
    .then(setSchools)
    .catch(() => setSchools([]))
}, [selectedKec])

// Render markers menggantikan dummy
{selectedKec && schools && schools.map(s => (
  <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={5} />
))}
```

5) Catatan penting
- Gunakan `VITE_API` dari `.env` untuk base URL.
- Jaga fallback: jika API gagal/empty, bisa tampilkan pesan atau sembunyikan marker.
- Warna/ikon marker bisa dikodekan berdasarkan `level` (SD/SMP/SMA) bila tersedia.
- Jika backend menyediakan filter tambahan (tahun, status, dsb.), tambahkan query param sesuai kebutuhan.

## Ubah Endpoints/Skema dengan Aman
- Semua logika nilai berada di `src/IndonesiaMap.tsx` pada layer: `ProvincesLayer`, `KabupatenLayer`, `KecamatanLayer`.
- Ubah sumber skor di fungsi `style` dan `onEachFeature` per layer.
- Jika kunci ID API berbeda, sesuaikan normalisasi dan pemetaan kunci sebelum dipakai untuk lookup skor.
