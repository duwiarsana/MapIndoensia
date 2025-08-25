import React from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker, Popup } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet'

// Approximate bounding box of Indonesia: [minLng, minLat], [maxLng, maxLat]
const indonesiaBounds: LatLngBoundsExpression = [
  [-11.0, 95.0], // [south, west] as [lat, lng]
  [6.0, 141.0],  // [north, east]
]

type AnyProps = Record<string, any>

// --- Value display helpers (dummy demo) ---
// Deterministic pseudo-random score from a string key (range ~20..95)
function dummyScore(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const n = (h % 76) + 20 // 20..95
  return Math.max(0, Math.min(100, n))
}

// Color scale helper (low -> high)
function colorForValue(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return '#5c5c5c' // no data -> gray
  return v > 60 ? '#2e7d32' /* green */ : '#d32f2f' /* red */
}

// --- Geometry helpers for dummy school placement ---
function centroidOf(geom: Geometry): LatLngTuple | null {
  try {
    if (geom.type === 'Polygon') {
      const rings = (geom.coordinates as any[])
      let sumLat = 0, sumLng = 0, count = 0
      rings.forEach((ring) => {
        ring.forEach((pt: [number, number]) => { sumLng += pt[0]; sumLat += pt[1]; count++ })
      })
      if (count === 0) return null
      return [sumLat / count, sumLng / count]
    }
    if (geom.type === 'MultiPolygon') {
      const polys = (geom.coordinates as any[])
      if (!polys.length) return null
      const first = polys[0]
      let sumLat = 0, sumLng = 0, count = 0
      first.forEach((ring: any[]) => {
        ring.forEach((pt: [number, number]) => { sumLng += pt[0]; sumLat += pt[1]; count++ })
      })
      if (count === 0) return null
      return [sumLat / count, sumLng / count]
    }
  } catch {}
  return null
}

function seededRng(seedStr: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return function next() {
    // xorshift32
    h ^= h << 13; h >>>= 0
    h ^= h >> 17; h >>>= 0
    h ^= h << 5;  h >>>= 0
    return (h >>> 0) / 0xffffffff
  }
}

// Compute bbox [minLng, minLat, maxLng, maxLat] from geometry
function geometryBBox(geom: Geometry | null | undefined): [number, number, number, number] | null {
  if (!geom) return null
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity
  const push = (c: any) => {
    if (typeof c?.[0] === 'number' && typeof c?.[1] === 'number') {
      const lng = c[0]; const lat = c[1]
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    } else if (Array.isArray(c)) {
      c.forEach(push)
    }
  }
  // @ts-expect-error traverse coords
  push(geom.coordinates)
  if (!Number.isFinite(minLat)) return null
  return [minLng, minLat, maxLng, maxLat]
}

// Ray casting point in polygon for a single ring
function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// GeoJSON Polygon: [ [outer], [hole1], ... ] ; MultiPolygon: [ [rings...], [rings...] ]
function pointInPolygonGeo(lng: number, lat: number, geom: Geometry): boolean {
  if (geom.type === 'Polygon') {
    const rings = (geom.coordinates as any[])
    if (!rings.length) return false
    const inOuter = pointInRing(lng, lat, rings[0] as any)
    if (!inOuter) return false
    for (let k = 1; k < rings.length; k++) {
      if (pointInRing(lng, lat, rings[k] as any)) return false // inside a hole
    }
    return true
  }
  if (geom.type === 'MultiPolygon') {
    const polys = (geom.coordinates as any[])
    for (const poly of polys) {
      if (!poly?.length) continue
      const inOuter = pointInRing(lng, lat, poly[0] as any)
      if (inOuter) {
        let inHole = false
        for (let k = 1; k < poly.length; k++) {
          if (pointInRing(lng, lat, poly[k] as any)) { inHole = true; break }
        }
        if (!inHole) return true
      }
    }
  }
  return false
}

function generateDummySchoolsInside(geom: Geometry, seed: string) {
  const rng = seededRng(seed)
  const count = 5 + Math.floor(rng() * 6) // 5..10 nodes
  const bbox = geometryBBox(geom)
  const pts: { id: string, name: string, lat: number, lng: number }[] = []
  if (!bbox) return pts
  const [minLng, minLat, maxLng, maxLat] = bbox
  let attempts = 0
  for (let i = 0; i < count; i++) {
    // rejection sampling inside bbox until point is inside polygon
    let placed = false
    for (let tries = 0; tries < 200; tries++) {
      const lng = minLng + rng() * (maxLng - minLng)
      const lat = minLat + rng() * (maxLat - minLat)
      if (pointInPolygonGeo(lng, lat, geom)) {
        pts.push({ id: `${seed}-${i}`, name: `Sekolah Dummy ${i + 1}`, lat, lng })
        placed = true
        break
      }
    }
    if (!placed) attempts++
  }
  // fallback: if none placed (degenerate geom), try centroid jitter
  if (pts.length === 0) {
    const c = centroidOf(geom)
    if (c) {
      const [lat0, lng0] = c
      for (let i = 0; i < Math.max(3, count); i++) {
        const angle = rng() * Math.PI * 2
        const r = rng() * 0.01
        const lat = lat0 + Math.cos(angle) * r
        const lng = lng0 + Math.sin(angle) * r
        pts.push({ id: `${seed}-fb-${i}`, name: `Sekolah Dummy ${i + 1}`, lat, lng })
      }
    }
  }
  return pts
}

// Map province code (string) -> district folder name under public/data/indonesia-district-master 3/
// Derived from on-disk folders (e.g., id31_dki_jakarta)
const PROV_FOLDER_MAP: Record<string, string> = {
  '11': 'id11_aceh',
  '12': 'id12_sumatera_utara',
  '13': 'id13_sumatera_barat',
  '14': 'id14_riau',
  '15': 'id15_jambi',
  '16': 'id16_sumatera_selatan',
  '17': 'id17_bengkulu',
  '18': 'id18_lampung',
  '19': 'id19_kepulauan_bangka_belitung',
  '21': 'id21_kepulauan_riau',
  '31': 'id31_dki_jakarta',
  '32': 'id32_jawa_barat',
  '33': 'id33_jawa_tengah',
  '34': 'id34_daerah_istimewa_yogyakarta',
  '35': 'id35_jawa_timur',
  '36': 'id36_banten',
  '51': 'id51_bali',
  '52': 'id52_nusa_tenggara_barat',
  '53': 'id53_nusa_tenggara_timur',
  '61': 'id61_kalimantan_barat',
  '62': 'id62_kalimantan_tengah',
  '63': 'id63_kalimantan_selatan',
  '64': 'id64_kalimantan_timur',
  '65': 'id65_kalimantan_utara',
  '71': 'id71_sulawesi_utara',
  '72': 'id72_sulawesi_tengah',
  '73': 'id73_sulawesi_selatan',
  '74': 'id74_sulawesi_tenggara',
  '75': 'id75_gorontalo',
  '76': 'id76_sulawesi_barat',
  '81': 'id81_maluku',
  '82': 'id82_maluku_utara',
  '91': 'id91_papua_barat',
  '94': 'id94_papua',
}

function ControlsOverlay({
  selectedProv,
  selectedKab,
  selectedKec,
  setSelectedProv,
  setSelectedKab,
  setSelectedKec,
}: {
  selectedProv: { id: string, name: string, feature?: Feature<Geometry, AnyProps> } | null,
  selectedKab: { name: string, feature?: Feature<Geometry, AnyProps> } | null,
  selectedKec: { name: string, feature?: Feature<Geometry, AnyProps> } | null,
  setSelectedProv: React.Dispatch<React.SetStateAction<{ id: string, name: string, feature?: Feature<Geometry, AnyProps> } | null>>,
  setSelectedKab: React.Dispatch<React.SetStateAction<{ name: string, feature?: Feature<Geometry, AnyProps> } | null>>,
  setSelectedKec: React.Dispatch<React.SetStateAction<{ name: string, feature?: Feature<Geometry, AnyProps> } | null>>,
}) {
  const map = useMap()
  return (
    <div className="controls-overlay">
      {(() => {
        const crumbs: string[] = ['Provinsi']
        if (selectedProv) crumbs.push('Kabupaten/Kota')
        if (selectedProv && selectedKab) crumbs.push('Kecamatan')
        if (selectedProv && selectedKab && selectedKec) crumbs.push('Detail')
        return (
          <div className="controls-breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={c + i}>
                <span className={`crumb${i === crumbs.length - 1 ? ' active' : ''}`}>{c}</span>
                {i < crumbs.length - 1 && <span className="sep">›</span>}
              </React.Fragment>
            ))}
          </div>
        )
      })()}
      <div className="controls-actions">
        {selectedProv && (
          <button
            className="btn-back"
            onClick={() => {
              // Single context-aware back button:
              // 1) From Detail (kecamatan selected) -> back to Kecamatan list
              if (selectedKab && selectedKec) {
                if (selectedKab?.feature) {
                  fitToFeature(map as any, selectedKab.feature as any)
                  map.once('moveend', () => setSelectedKec(null))
                } else {
                  setSelectedKec(null)
                }
                return
              }
              // 2) From Kecamatan list -> back to Kabupaten list (within province)
              // Desired: end on kabupaten list with the map showing the full selected province
              if (selectedKab && !selectedKec) {
                if (selectedProv?.feature) {
                  // Zoom to province first, then switch layer to kabupaten list
                  fitToFeature(map as any, selectedProv.feature as any)
                  map.once('moveend', () => setSelectedKab(null))
                } else {
                  setSelectedKab(null)
                }
                return
              }
              // 3) From Kabupaten list (selectedProv only) -> back to Provinces
              // Clear selection first so layers update, then zoom out to Indonesia
              setSelectedKec(null)
              setSelectedKab(null)
              // Start zoom-out first; only after it finishes, clear selectedProv
              // so the Provinces layer mounts and loads AFTER the zoom completes.
              map.flyToBounds(indonesiaBounds, { padding: [24, 24], duration: 0.7 })
              map.once('moveend', () => {
                setSelectedProv(null)
              })
            }}
          >
            {selectedKab && selectedKec && 'Kembali ke Semua Kecamatan'}
            {selectedKab && !selectedKec && 'Kembali ke Kabupaten/Kota'}
            {!selectedKab && 'Kembali ke Provinsi'}
          </button>
        )}
      </div>
    </div>
  )
}

type ClickHandlers = {
  onProvinceClick: (provFeature: Feature<Geometry, AnyProps>) => void
  onKabupatenClick: (kabFeature: Feature<Geometry, AnyProps>) => void
}

function useFetchGeoJSON(url: string | null) {
  const [data, setData] = React.useState<FeatureCollection<Geometry, AnyProps> | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function load() {
      if (!url) {
        setData(null)
        return
      }
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(encodeURI(url))
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
        const json = (await res.json()) as FeatureCollection<Geometry, AnyProps>
        if (active) {
          console.log('[GeoJSON] loaded', url, json?.features?.length ?? 0)
          setData(json)
        }
      } catch (e: any) {
        const msg = e?.message ?? 'Unknown error'
        console.error('[GeoJSON] error', url, msg)
        if (active) setError(msg)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [url])

  return { data, loading, error }
}

function fitToFeature(map: ReturnType<typeof useMap>, feature: Feature<Geometry, AnyProps>) {
  const coords: LatLngTuple[] = []
  const pushCoords = (c: any) => {
    if (typeof c?.[0] === 'number' && typeof c?.[1] === 'number') {
      // GeoJSON is [lng, lat]
      coords.push([c[1], c[0]])
    } else if (Array.isArray(c)) {
      c.forEach(pushCoords)
    }
  }
  // @ts-expect-error runtime traversal
  pushCoords(feature.geometry?.coordinates)
  if (coords.length) {
    const lats = coords.map((p) => p[0])
    const lngs = coords.map((p) => p[1])
    const south = Math.min(...lats)
    const north = Math.max(...lats)
    const west = Math.min(...lngs)
    const east = Math.max(...lngs)
    map.flyToBounds([[south, west], [north, east]], { padding: [24, 24], duration: 0.7 })
  }
}

function ProvincesLayer({ onProvinceClick }: { onProvinceClick: ClickHandlers['onProvinceClick'] }) {
  const map = useMap()
  const { data } = useFetchGeoJSON('/data/indonesia-district-master 3/prov 37.geojson')
  if (!data) return null
  return (
    <GeoJSON
      data={data as any}
      style={(feature?: any) => {
        const pid = String(feature?.properties?.prov_id ?? '')
        const score = pid ? dummyScore(pid) : undefined
        return { color: '#ffffff', weight: 1, fillColor: colorForValue(score), fillOpacity: 0.6 }
      }}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {}
        const title = p.prov_name || p.name || 'Provinsi'
        const pid = String(p.prov_id ?? '')
        const score = pid ? dummyScore(pid) : null
        const color = colorForValue(score ?? undefined)
        const scoreHtml = score != null ? `<br/><small><strong style="color: ${color}">Skor:</strong> <strong style="color: ${color}">${score}</strong></small>` : ''
        layer.bindTooltip(`<strong>Provinsi:</strong> ${String(title)}${scoreHtml}`, { sticky: true })
        layer.on('mouseover', () => {
          ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.7 })
          ;(layer as any).bringToFront?.()
        })
        layer.on('mouseout', () => {
          const base = pid ? dummyScore(pid) : null
          ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.6, fillColor: colorForValue(base) })
        })
        layer.on('click', () => {
          fitToFeature(map, feature as any)
          map.once('moveend', () => onProvinceClick(feature as any))
        })
      }}
    />
  )
}

function KabupatenLayer({ provId, onKabupatenClick }: { provId: string, onKabupatenClick: ClickHandlers['onKabupatenClick'] }) {
  const map = useMap()
  const { data, loading, error } = useFetchGeoJSON('/data/indonesia-district-master 3/kab 37.geojson')
  if (error) console.error('Kabupaten error:', error)
  if (!data) return null
  const filtered: FeatureCollection<Geometry, AnyProps> = {
    type: 'FeatureCollection',
    features: data.features.filter((f) => String(f.properties?.prov_id ?? '') === String(provId)),
  } as any
  return (
    <GeoJSON
      data={filtered as any}
      style={(feature?: any) => {
        const p = feature?.properties || {}
        const kabName = normalizeRegencyName(String(p.name || ''))
        const score = kabName ? dummyScore(`kab:${kabName}`) : undefined
        return { color: '#ffffff', weight: 1, fillColor: colorForValue(score), fillOpacity: 0.55 }
      }}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {}
        const title = p.name || 'Kabupaten/Kota'
        const kabName = normalizeRegencyName(String(p.name || ''))
        const score = kabName ? dummyScore(`kab:${kabName}`) : null
        const color = colorForValue(score ?? undefined)
        const scoreHtml = score != null ? `<br/><small><strong style="color: ${color}">Skor:</strong> <strong style="color: ${color}">${score}</strong></small>` : ''
        layer.bindTooltip(`<strong>Kabupaten:</strong> ${String(title)}${scoreHtml}`, { sticky: true })
        layer.on('mouseover', () => {
          ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.65 })
          ;(layer as any).bringToFront?.()
        })
        layer.on('mouseout', () => {
          const base = kabName ? dummyScore(`kab:${kabName}`) : null
          ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.55, fillColor: colorForValue(base) })
        })
        layer.on('click', (e) => {
          e.originalEvent?.stopPropagation?.()
          fitToFeature(map, feature as any)
          map.once('moveend', () => onKabupatenClick(feature as any))
        })
      }}
    />
  )
}

function normalizeRegencyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^kabupaten\s+/i, '')
    .replace(/^kota\s+/i, '')
    .replace(/^kab\.?\s+/i, '')
    .replace(/^kota administrasi\s+/i, '')
    .trim()
}

function normalizeDistrictName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^kecamatan\s+/i, '')
    .replace(/^kec\.?\s+/i, '')
    .trim()
}

function KecamatanLayer({ provCode, kabName, selectedKec, setSelectedKec }: { provCode: string, kabName: string, selectedKec: { name: string, feature?: Feature<Geometry, AnyProps> } | null, setSelectedKec: React.Dispatch<React.SetStateAction<{ name: string, feature?: Feature<Geometry, AnyProps> } | null>> }) {
  // Districts are stored per province file, e.g. id31_dki_jakarta_district.geojson
  // We try to map provCode like "31" -> folder starting with id31_*
  const map = useMap()
  const [provFolder, setProvFolder] = React.useState<string | null>(null)
  React.useEffect(() => {
    // Use the explicit mapping to the on-disk folder names
    const folder = PROV_FOLDER_MAP[String(provCode)] || null
    setProvFolder(folder)
  }, [provCode])

  const url = provFolder
    ? `/data/indonesia-district-master 3/${provFolder}/${provFolder}_district.geojson`
    : null

  const { data, loading, error } = useFetchGeoJSON(url)
  if (error) console.error('Kecamatan error:', error)
  if (!data) return null

  const target = normalizeRegencyName(kabName)
  // Step 1: filter to the selected kabupaten
  const filteredFeatures = data.features.filter((f) => {
    const regName = String(f.properties?.regency || f.properties?.kabupaten || '').toLowerCase()
    return normalizeRegencyName(regName) === target
  })

  // Helper: normalize district name from feature
  const getDistrictName = (f: Feature<Geometry, AnyProps>): string => {
    const p = f.properties || {}
    return String(p.district || p.name || '').trim()
  }

  // Helper: ensure MultiPolygon coordinates array from Polygon/MultiPolygon
  const toMultiPolygonCoords = (geom: Geometry | null | undefined): any[] => {
    if (!geom) return []
    if (geom.type === 'Polygon') {
      // Polygon: coordinates -> [rings]
      // Wrap to MultiPolygon: [[rings]]
      return [(geom as any).coordinates]
    }
    if (geom.type === 'MultiPolygon') {
      return (geom as any).coordinates
    }
    return []
  }

  // Step 2: dissolve by district name (merge all polygon parts into one MultiPolygon per district)
  const groups = new Map<string, Feature<Geometry, AnyProps>[]>()
  for (const f of filteredFeatures) {
    const name = getDistrictName(f)
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push(f)
  }

  const mergedFeatures: Feature<Geometry, AnyProps>[] = []
  for (const [name, feats] of groups.entries()) {
    const coords: any[] = []
    for (const f of feats) coords.push(...toMultiPolygonCoords(f.geometry))
    const baseProps = { ...(feats[0]?.properties || {}), district: name }
    const merged: Feature<Geometry, AnyProps> = {
      type: 'Feature',
      properties: { ...baseProps, district_key: normalizeDistrictName(name) },
      geometry: {
        type: 'MultiPolygon',
        // coordinates: array of polygons (each polygon is array of linear rings)
        // We simply concatenate parts; no topological union required for display
        coordinates: coords as any,
      },
    }
    mergedFeatures.push(merged)
  }

  // If a kecamatan is selected, only keep that feature
  const visibleFeatures = selectedKec?.name
    ? mergedFeatures.filter((f) => String((f.properties as any)?.district_key || normalizeDistrictName(getDistrictName(f))) === normalizeDistrictName(selectedKec.name))
    : mergedFeatures

  const filtered: FeatureCollection<Geometry, AnyProps> = {
    type: 'FeatureCollection',
    features: visibleFeatures,
  }

  return (
    <>
      <GeoJSON
        key={`kec-${kabName}-${selectedKec?.name || 'all'}`}
        data={filtered as any}
        style={(feature?: any) => {
          const key = String(feature?.properties?.district_key || '')
          const score = key ? dummyScore(`kec:${key}`) : undefined
          return { color: '#ffffff', weight: 1, fillColor: colorForValue(score), fillOpacity: 0.5 }
        }}
        onEachFeature={(feature, layer) => {
          const p = feature.properties || {}
          const title = p.district || p.name || 'Kecamatan'
          const key = String(p.district_key || '')
          const score = key ? dummyScore(`kec:${key}`) : null
          const color = colorForValue(score ?? undefined)
          const scoreHtml = score != null ? `<br/><small><strong style="color: ${color}">Skor:</strong> <strong style="color: ${color}">${score}</strong></small>` : ''
          // When focused on a kecamatan (selectedKec set), do not show tooltip
          if (!selectedKec) {
            layer.bindTooltip(`<strong>Kecamatan:</strong> ${String(title)}${scoreHtml}`, { sticky: true })
          }
          layer.on('mouseover', () => {
            ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.6 })
            ;(layer as any).bringToFront?.()
          })
          layer.on('mouseout', () => {
            const base = key ? dummyScore(`kec:${key}`) : null
            ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.5, fillColor: colorForValue(base) })
          })
          layer.on('click', (e) => {
            e.originalEvent?.stopPropagation?.()
            const name = String((feature.properties as any)?.district || (feature.properties as any)?.name || '')
            // Immediately focus to only the clicked kecamatan
            setSelectedKec({ name, feature: feature as any })
            // Then animate zoom into it
            fitToFeature(map as any, feature as any)
          })
        }}
      />
      {/* Dummy school markers when a kecamatan is focused (kept inside boundary) */}
      {selectedKec && (() => {
        const g: Geometry | undefined = (selectedKec.feature as any)?.geometry
        if (!g) return null
        const keySeed = String((selectedKec.feature as any)?.properties?.district_key || (selectedKec.feature as any)?.properties?.name || 'kec')
        const nodes = generateDummySchoolsInside(g, `school:${keySeed}`)
        return (
          <>
            {nodes.map(n => (
              <CircleMarker pane="markerPane" key={n.id} center={[n.lat, n.lng]} radius={5} pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.9 }}>
                <Popup>
                  <div>
                    <strong>{n.name}</strong>
                    <div>Lat: {n.lat.toFixed(5)}, Lng: {n.lng.toFixed(5)}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )
      })()}
    </>
  )
}

export default function IndonesiaMap() {
  const [selectedProv, setSelectedProv] = React.useState<{ id: string, name: string, feature?: Feature<Geometry, AnyProps> } | null>(null)
  const [selectedKab, setSelectedKab] = React.useState<{ name: string, feature?: Feature<Geometry, AnyProps> } | null>(null)
  const [selectedKec, setSelectedKec] = React.useState<{ name: string, feature?: Feature<Geometry, AnyProps> } | null>(null)

  const handleProvinceClick: ClickHandlers["onProvinceClick"] = (f) => {
    const id = String(f.properties?.prov_id ?? '')
    const name = String(f.properties?.prov_name ?? f.properties?.name ?? '')
    setSelectedKab(null)
    setSelectedProv({ id, name, feature: f as any })
  }

  const handleKabupatenClick: ClickHandlers['onKabupatenClick'] = (f) => {
    const name = String(f.properties?.name ?? '')
    setSelectedKab({ name, feature: f as any })
    setSelectedKec(null)
  }

  return (
    <div className="map-container" aria-hidden>
      <MapContainer
        center={[-2, 118]}
        zoom={5}
        minZoom={3}
        zoomControl={true}
        attributionControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        boxZoom={true}
        keyboard={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Controls overlay with map-aware actions */}
        <ControlsOverlay
          selectedProv={selectedProv}
          selectedKab={selectedKab}
          selectedKec={selectedKec}
          setSelectedProv={setSelectedProv}
          setSelectedKab={setSelectedKab}
          setSelectedKec={setSelectedKec}
        />

        {/* Level 1: Provinces (initial) */}
        {!selectedProv && (
          <ProvincesLayer onProvinceClick={handleProvinceClick} />
        )}

        {/* Level 2: Kabupaten for selected province */}
        {selectedProv && !selectedKab && (
          <KabupatenLayer provId={selectedProv.id} onKabupatenClick={handleKabupatenClick} />
        )}

        {/* Level 3: Kecamatan for selected kabupaten within the selected province */}
        {selectedProv && selectedKab && (
          <KecamatanLayer provCode={selectedProv.id} kabName={selectedKab.name} selectedKec={selectedKec} setSelectedKec={setSelectedKec} />
        )}
      </MapContainer>
    </div>
  )
}
