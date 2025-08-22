import React from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet'

// Approximate bounding box of Indonesia: [minLng, minLat], [maxLng, maxLat]
const indonesiaBounds: LatLngBoundsExpression = [
  [-11.0, 95.0], // [south, west] as [lat, lng]
  [6.0, 141.0],  // [north, east]
]

type AnyProps = Record<string, any>

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
    map.fitBounds([[south, west], [north, east]], { padding: [24, 24] })
  }
}

function ProvincesLayer({ onProvinceClick }: { onProvinceClick: ClickHandlers['onProvinceClick'] }) {
  const map = useMap()
  const { data } = useFetchGeoJSON('/data/indonesia-district-master 3/prov 37.geojson')
  if (!data) return null
  return (
    <GeoJSON
      data={data as any}
      style={() => ({ color: '#ffffff', weight: 1, fillColor: '#7a7a7a', fillOpacity: 0.3 })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {}
        const title = p.prov_name || p.name || 'Provinsi'
        layer.bindTooltip(`Provinsi: ${String(title)}`, { sticky: true })
        layer.on('mouseover', () => {
          ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.4 })
          ;(layer as any).bringToFront?.()
        })
        layer.on('mouseout', () => {
          ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.3 })
        })
        layer.on('click', () => {
          fitToFeature(map, feature as any)
          onProvinceClick(feature as any)
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
      style={() => ({ color: '#ffffff', weight: 1, fillColor: '#6a6a6a', fillOpacity: 0.25 })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {}
        const title = p.name || 'Kabupaten/Kota'
        layer.bindTooltip(`Kabupaten: ${String(title)}`, { sticky: true })
        layer.on('mouseover', () => {
          ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.35 })
          ;(layer as any).bringToFront?.()
        })
        layer.on('mouseout', () => {
          ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.25 })
        })
        layer.on('click', (e) => {
          e.originalEvent?.stopPropagation?.()
          fitToFeature(map, feature as any)
          onKabupatenClick(feature as any)
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

function KecamatanLayer({ provCode, kabName }: { provCode: string, kabName: string }) {
  // Districts are stored per province file, e.g. id31_dki_jakarta_district.geojson
  // We try to map provCode like "31" -> folder starting with id31_*
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
  const filtered: FeatureCollection<Geometry, AnyProps> = {
    type: 'FeatureCollection',
    features: data.features.filter((f) => {
      const regName = String(f.properties?.regency || f.properties?.kabupaten || '').toLowerCase()
      return normalizeRegencyName(regName) === target
    }),
  } as any

  return (
    <GeoJSON
      data={filtered as any}
      style={() => ({ color: '#ffffff', weight: 1, fillColor: '#5a5a5a', fillOpacity: 0.2 })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {}
        const title = p.district || p.name || 'Kecamatan'
        layer.bindTooltip(`Kecamatan: ${String(title)}`, { sticky: true })
        layer.on('mouseover', () => {
          ;(layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.3 })
          ;(layer as any).bringToFront?.()
        })
        layer.on('mouseout', () => {
          ;(layer as any).setStyle?.({ weight: 1, fillOpacity: 0.2 })
        })
      }}
    />
  )
}

export default function IndonesiaMap() {
  const [selectedProv, setSelectedProv] = React.useState<{ id: string, name: string } | null>(null)
  const [selectedKab, setSelectedKab] = React.useState<{ name: string } | null>(null)

  const handleProvinceClick: ClickHandlers['onProvinceClick'] = (f) => {
    const id = String(f.properties?.prov_id ?? '')
    const name = String(f.properties?.prov_name ?? f.properties?.name ?? '')
    setSelectedKab(null)
    setSelectedProv({ id, name })
  }

  const handleKabupatenClick: ClickHandlers['onKabupatenClick'] = (f) => {
    const name = String(f.properties?.name ?? '')
    setSelectedKab({ name })
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

        {/* Simple controls overlay */}
        <div
          style={{
            position: 'absolute', zIndex: 1000, top: 10, left: 10,
            background: 'white', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            padding: 8, fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Level</div>
          <div>
            {!selectedProv && <span>Provinsi</span>}
            {selectedProv && !selectedKab && (
              <span>Provinsi → Kabupaten/Kota</span>
            )}
            {selectedProv && selectedKab && (
              <span>Provinsi → Kabupaten/Kota → Kecamatan</span>
            )}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            {selectedProv && (
              <button onClick={() => { setSelectedKab(null); setSelectedProv(null) }}>
                Back to Provinces
              </button>
            )}
            {selectedKab && (
              <button onClick={() => setSelectedKab(null)}>Back to Kabupaten</button>
            )}
          </div>
          {/* Basic hint if nothing rendered */}
          <div style={{ marginTop: 6, color: '#666' }}>
            Tips: If boundaries are not visible, check DevTools Console for fetch errors and ensure files exist under
            <code> public/data/indonesia-district-master 3/</code>.
          </div>
        </div>

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
          <KecamatanLayer provCode={selectedProv.id} kabName={selectedKab.name} />
        )}
      </MapContainer>
    </div>
  )
}
