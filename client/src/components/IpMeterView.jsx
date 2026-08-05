import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sitePositions } from '../data/sitePositions';
import { Clock, Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300); 
    return () => clearTimeout(timer);
  }, [map]);
  return null; 
};

const IpMeterView = ({ devices, filteredDevices, logs, darkMode }) => {
  // STATE LOKAL UNTUK TABEL EVENT HISTORY
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSortConfig, setLogSortConfig] = useState({ key: 'raw_timestamp', direction: 'desc' });

  // KALKULASI STATUS METER (HEALTH)
  const activeMeters = devices.filter(d => d.status === 'online').length;
  const totalMeters = devices.length;
  const offlineMeters = totalMeters - activeMeters;
  const healthPercentage = totalMeters > 0 ? Math.round((activeMeters / totalMeters) * 100) : 0;

  // KALKULASI & FILTER TABEL LOGS
  let processedLogs = [...(logs || [])];
  
  if (logSearchQuery) {
    const q = logSearchQuery.toLowerCase();
    processedLogs = processedLogs.filter(log =>
      log.name.toLowerCase().includes(q) ||
      log.site.toLowerCase().includes(q) ||
      log.from.toLowerCase().includes(q) ||
      log.to.toLowerCase().includes(q)
    );
  }

  processedLogs.sort((a, b) => {
    if (a[logSortConfig.key] < b[logSortConfig.key]) return logSortConfig.direction === 'asc' ? -1 : 1;
    if (a[logSortConfig.key] > b[logSortConfig.key]) return logSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (logSortConfig.key === key && logSortConfig.direction === 'asc') direction = 'desc';
    setLogSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (logSortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return logSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = processedLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalLogPages = Math.ceil(processedLogs.length / logsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalLogPages === 0 ? 1 : totalLogPages);

  // FUNGSI CUSTOM ICON LEAFLET
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
    <div className={`flex flex-col gap-6 h-full w-full mt-6 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      
      {/* GRID ATAS: PETA (9 Kolom) & STATUS (3 Kolom) */}
      <div className="grid grid-cols-12 gap-6 h-[460px] min-h-[460px]">
        
        {/* WIDGET PETA */}
        <div className={`col-span-9 h-full flex flex-col rounded-xl overflow-hidden border shadow-lg transition-colors ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
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
            <MapResizer />

            {Object.keys(sitePositions).map((siteName, index) => {
              const siteDevices = filteredDevices ? filteredDevices.filter(d => (d.site || '').toUpperCase() === siteName.toUpperCase()) : [];
              const activeCount = siteDevices.filter(d => d.status === 'online').length;
              const offlineCount = siteDevices.filter(d => d.status === 'offline').length;
              const hasOffline = siteDevices.some(d => d.status === 'offline');
              const statusColor = hasOffline ? '#ef4444' : '#10b981';

              return (
                <Marker 
                  key={index} 
                  position={sitePositions[siteName]} 
                  icon={createLabelIcon(siteName, statusColor)}
                >
                  <Popup minWidth={200} className="custom-popup">
                    <div className={`p-2 rounded-md ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
                      <h3 className="text-lg font-bold mb-2 border-b pb-1" style={{ color: statusColor, borderColor: darkMode ? '#334155' : '#e2e8f0' }}>{siteName}</h3>
                      
                      <div className={`flex border rounded-md mb-3 w-40 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`flex-1 border-r py-1 text-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <p className={`text-[9px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ACTIVE</p>
                          <p className="text-sm font-bold text-emerald-500">{activeCount}</p>
                        </div>
                        <div className="flex-1 py-1 text-center">
                          <p className={`text-[9px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>OFFLINE</p>
                          <p className="text-sm font-bold text-rose-500">{offlineCount}</p>
                        </div>
                      </div>

                      <div className="max-h-40 overflow-y-auto pr-2">
                        {siteDevices.length > 0 ? (
                          siteDevices.map((d, i) => (
                            <div key={i} className={`flex justify-between items-center py-1.5 border-b text-[11px] ${darkMode ? 'border-slate-700 text-slate-200' : 'border-slate-100 text-slate-700'}`}>
                              <span className="truncate mr-2 font-medium">{d.name}</span>
                              <span className={`flex items-center font-bold whitespace-nowrap ${d.status === 'online' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${d.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {d.status?.toUpperCase()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className={`text-[10px] text-center py-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tidak ada data</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* WIDGET STATUS METER (HEALTH) */}
        <div className={`col-span-3 h-full border rounded-xl p-5 shadow-xl flex flex-col justify-between transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <h2 className={`text-base font-bold text-center uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>STATUS METER</h2>
            <div className="relative flex flex-col items-center justify-center my-10">
              <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'} strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="40" className="stroke-emerald-500 transition-all duration-500 ease-out" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * healthPercentage) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <span className={`text-4xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{healthPercentage}%</span>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ONLINE</p>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className={`border rounded-xl px-4 py-2.5 flex justify-between items-center transition-colors ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ONLINE
              </span>
              <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeMeters}</span>
            </div>
            <div className={`border rounded-xl px-4 py-2.5 flex justify-between items-center transition-colors ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> OFFLINE
              </span>
              <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{offlineMeters}</span>
            </div>
          </div>
        </div>
      </div>

      {/* WIDGET TABEL SYSTEM EVENT HISTORY */}
      <div className={`border rounded-xl p-5 shadow-xl flex flex-col transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`text-base font-bold whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-800'}`}>System Event History</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className={`flex items-center gap-2 text-xs font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <span>Show</span>
              <select
                value={logsPerPage}
                onChange={(e) => { setLogsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={`border rounded-md px-2 py-1.5 focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              >
                <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search Device, Site, Status..."
                value={logSearchQuery}
                onChange={(e) => { setLogSearchQuery(e.target.value); setCurrentPage(1); }}
                className={`w-full pl-4 pr-10 py-1.5 text-sm rounded-lg border focus:outline-none transition-all ${darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
              />
              <Search className={`w-4 h-4 absolute right-3 top-2 pointer-events-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('raw_timestamp')}><div className="flex items-center gap-1">Timestamp {renderSortIcon('raw_timestamp')}</div></th>
                <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Device {renderSortIcon('name')}</div></th>
                <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('site')}><div className="flex items-center gap-1">Site {renderSortIcon('site')}</div></th>
                <th className="pb-3 pt-1 cursor-pointer select-none text-center hover:text-blue-500" onClick={() => handleSort('to')}><div className="flex items-center justify-center gap-1">Status Change {renderSortIcon('to')}</div></th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${darkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
              {currentLogs.map((log, index) => {
                const isRecovery = log.from === 'OFFLINE' && log.to === 'ONLINE';
                return (
                  <tr key={index} className={`transition-colors ${darkMode ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 font-mono">
                      {isRecovery ? (
                        <div className="flex flex-col gap-1.5">
                          <div className={`text-[11px] font-semibold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>{log.offline_timestamp ? log.offline_timestamp : 'Menunggu DB...'} (Time Offline)</div>
                          <div className={`text-[11px] font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{log.timestamp} (Time Online)</div>
                          <div className={`font-bold text-[11px] mt-1 px-2 py-0.5 rounded border w-fit ${darkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-600 bg-amber-100 border-amber-200'}`}>Duration: {log.duration_text || '00.00.00'}</div>
                        </div>
                      ) : (
                        <div className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{log.timestamp}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <div className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{log.ip}</div>
                    </td>
                    <td className={`py-3 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{log.site}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${log.from === 'ONLINE' ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-600') : (darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-600')}`}><span className={`w-1 h-1 rounded-full ${log.from === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> {log.from}</span>
                        <ArrowRight className={`w-3 h-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${log.to === 'ONLINE' ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-600') : (darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-600')}`}><span className={`w-1 h-1 rounded-full ${log.to === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> {log.to}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentLogs.length === 0 && (
                <tr><td colSpan="4" className={`py-6 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Tidak ada data ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end items-center gap-1 mt-6 pt-4 border-t border-slate-800/50">
          {totalLogPages > 1 && Array.from({ length: totalLogPages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 text-[11px] font-semibold border rounded-md transition-all ${safeCurrentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{i + 1}</button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default IpMeterView;