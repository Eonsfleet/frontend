'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function pin() {
    return L.divIcon({
        className: 'fuel-mini-pin',
        html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#ef4444;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;display:flex;align-items:center;justify-content:center"><div style="width:7px;height:7px;border-radius:50%;background:#fff;transform:rotate(45deg)"></div></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
    })
}

export function MiniLocationMap({ lat, lng }: { lat: number; lng: number }) {
    return (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-100">
            <MapContainer
                key={`${lat},${lng}`}
                center={[lat, lng]}
                zoom={13}
                scrollWheelZoom={false}
                zoomControl
                dragging={false}
                className="h-full w-full"
                style={{ background: '#e5e7eb' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <Marker position={[lat, lng]} icon={pin()} />
            </MapContainer>
        </div>
    )
}
