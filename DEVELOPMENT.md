# Development Notes

## Arsitektur Singkat
- `src/IndonesiaMap.tsx`: pusat logika peta (react-leaflet `MapContainer`, `TileLayer`).
- `src/main.tsx`: bootstrap React dan import CSS Leaflet.
- `src/styles.css`: layout fullscreen.

## Kustomisasi Peta
- Ubah center/zoom awal:

```tsx
<MapContainer center={[-2, 118]} zoom={5} minZoom={3} />
```
- Batasi panning ke Indonesia:

```tsx
<MapContainer maxBounds={indonesiaBounds} />
```
- Ganti tiles:

```tsx
<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
```
- Opsi lain (no-labels):

```tsx
<TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
```

## Menambah Layer/Overlay
- Bisa gunakan `Marker`, `Polyline`, `Polygon` dari `react-leaflet`.
- Simpan data di komponen terpisah jika kompleks.

## Standar Kode
- TypeScript strict.
- Functional components, hooks React.
- Conventional Commits + Changelog.

## Dependency Tips
- `react-leaflet@4` kompatibel dengan React 18.
- Import `leaflet/dist/leaflet.css` sekali di `main.tsx`.

## Kecamatan Selection Flow

- State utama di `src/IndonesiaMap.tsx`:
  - `selectedKec: string | null` menyimpan kecamatan terpilih (sudah dinormalisasi).
  - Merged features menyimpan `district_key` (nama kecamatan ter-normalisasi) untuk pencocokan yang konsisten.
- Perilaku klik:
  - Klik kecamatan: set `selectedKec` segera, layer difilter hanya menampilkan kecamatan terpilih.
  - Setelah set state, animasikan zoom ke bounds kecamatan (util `fitToFeature`).
- Render ulang layer:
  - Pakai prop `key` pada `GeoJSON` yang bergantung pada `selectedKec` dan kabupaten agar force remount saat berubah.
- Navigasi balik:
  - Tombol "Back to All Kecamatan" mengosongkan `selectedKec` dan zoom kembali ke bounds kabupaten.
- Normalisasi nama:
  - Hapus prefix umum ("Kecamatan", "Kec.") dan samakan case untuk membangun `district_key`.

## Roadmap Ide
- Toggle provider tiles (OSM/Carto/Esri) via dropdown atau env.
- Mode no-labels/labels switch.
- Batas panning opsional.
- Offline tiles (cache) bila diperlukan.

