import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sitePositions } from '../data/sitePositions';

// --- Komponen Helper untuk Memperbaiki Bug Area Abu-Abu Leaflet ---
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    // Memberi jeda agar animasi transisi layout (jika ada) selesai
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300); 
    
    return () => clearTimeout(timer);
  }, [map]);

  return null; // Komponen ini tidak me-render elemen HTML apa pun
};

const IpMeterView = ({ devices }) => {
  // Fungsi pembuat icon label dimodifikasi untuk menerima warna background dinamis
  const createLabelIcon = (name, backgroundColor) => {
    return L.divIcon({
      className: 'custom-label-icon',
      html: `<div style="background-color: ${backgroundColor}; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background-color 0.3s ease;">
               ${name}
             </div>`,
      iconSize: [null, null],
      iconAnchor: [50, 15]
    });
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-800 shadow-lg">
      <MapContainer 
        center={[-8.6, 118.0]} 
        zoom={9.0} 
        maxBounds={[[-9.8, 116.0], [-7.2, 120.0]]} 
        maxBoundsViscosity={1.0}
        style={{ flex: 1, width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer 
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
          attribution="Tiles &copy; Esri"
        />
        
        {/* Panggil Resizer agar peta menyesuaikan lebar layarnya */}
        <MapResizer />

        {Object.keys(sitePositions).map((siteName, index) => {
          const siteDevices = devices ? devices.filter(d => (d.site || '').toUpperCase() === siteName.toUpperCase()) : [];
          const activeCount = siteDevices.filter(d => d.status === 'online').length;
          const offlineCount = siteDevices.filter(d => d.status === 'offline').length;

          // LOGIKA WARNA: Cek apakah ada perangkat dengan status 'offline' di dalam site ini
          const hasOffline = siteDevices.some(d => d.status === 'offline');
          
          // Jika ada yang offline beri warna Merah (#ef4444), jika semua online beri warna Hijau (#10b981)
          const statusColor = hasOffline ? '#ef4444' : '#10b981';

          return (
            <Marker 
              key={index} 
              position={sitePositions[siteName]} 
              icon={createLabelIcon(siteName, statusColor)}
            >
              <Popup minWidth={200} className="custom-popup">
                <div className="p-1">
                  {/* Judul popup ikut menyesuaikan warna status site */}
                  <h3 className="text-lg font-bold mb-1" style={{ color: statusColor }}>{siteName}</h3>
                  
                  <div className="flex border border-gray-200 rounded-md bg-gray-50 mb-2 w-40">
                    <div className="flex-1 border-r border-gray-200 py-0.5 text-center">
                      <p className="text-[8px] text-gray-400 font-bold uppercase">ACTIVE</p>
                      <p className="text-sm font-bold text-green-600">{activeCount}</p>
                    </div>
                    <div className="flex-1 py-0.5 text-center">
                      <p className="text-[8px] text-gray-400 font-bold uppercase">OFFLINE</p>
                      <p className="text-sm font-bold text-red-600">{offlineCount}</p>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto pr-1">
                    {siteDevices.length > 0 ? (
                      siteDevices.map((d, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5 border-b border-gray-100 text-[11px]">
                          <span className="truncate mr-2 text-gray-700">{d.name}</span>
                          <span className={`flex items-center font-bold ${d.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${d.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {d.status?.toUpperCase()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-[10px] text-center py-1">Tidak ada data</p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default IpMeterView;