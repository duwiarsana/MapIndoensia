# public/data

Tempatkan file GeoJSON Anda di sini.

Contoh penamaan:
- indonesia.geojson
- provinces.geojson
- custom-layer.geojson

Cara akses dari kode (Vite):
```ts
// fetch dari public/data (served sebagai /data/...)
const res = await fetch('/data/indonesia.geojson')
const data = await res.json()
```

Catatan:
- File di `public/` tidak masuk ke bundle, cocok untuk dataset besar.
- Pastikan gunakan path relatif dari root server: `/data/nama-file.geojson`.
