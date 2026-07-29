import { useState } from 'react';
import { Search, User, CheckCircle2, XCircle } from 'lucide-react';

const StatusKwhMeter = ({ devices, darkMode }) => {
  const [filter, setFilter] = useState('all'); 
  const [localSearch, setLocalSearch] = useState('');

  const filteredDevices = devices.filter(d => {
    const searchString = localSearch.toLowerCase();
    const matchesSearch = 
      (d.name || '').toLowerCase().includes(searchString) || 
      (d.serial_number || '').toLowerCase().includes(searchString) ||
      (d.site || '').toLowerCase().includes(searchString);
      
    if (filter === 'online') return matchesSearch && d.status === 'online';
    if (filter === 'offline') return matchesSearch && d.status === 'offline';
    return matchesSearch;
  });

  return (
    <div className={`w-full h-full flex flex-col rounded-xl border shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* Header, Search, dan Filter */}
      <div className={`p-5 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <h2 className="text-lg font-bold tracking-wider uppercase">Daftar Status KWH</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari KWH / Serial..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
              }`}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className={`flex rounded-lg border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-xs font-bold transition-all ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-slate-900 text-slate-400 hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('online')}
              className={`px-4 py-2 text-xs font-bold border-l transition-all flex items-center gap-2 ${
                filter === 'online' 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : darkMode ? 'bg-slate-900 text-emerald-500 border-slate-700 hover:bg-slate-800' : 'bg-white text-emerald-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Meter
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-4 py-2 text-xs font-bold border-l transition-all flex items-center gap-2 ${
                filter === 'offline' 
                  ? 'bg-rose-500 text-white border-rose-500' 
                  : darkMode ? 'bg-slate-900 text-rose-500 border-slate-700 hover:bg-slate-800' : 'bg-white text-rose-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Offline / Fault
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="overflow-x-auto flex-1 p-5">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className={`border-b text-[11px] font-bold tracking-wider uppercase ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500 bg-slate-50'}`}>
              <th className="p-4 rounded-tl-lg">No</th>
              <th className="p-4">Nama KWH</th>
              <th className="p-4">Unit Sistem</th>
              <th className="p-4">Serial Number</th>
              <th className="p-4">IP Address</th>
              <th className="p-4">Update Terakhir (Online)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-sm ${darkMode ? 'divide-slate-800/50 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
            {filteredDevices.length > 0 ? (
              filteredDevices.map((device, index) => (
                <tr key={device.id || index} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                  <td className="p-4 text-xs font-medium">{index + 1}</td>
                  <td className="p-4 font-bold">{device.name}</td>
                  <td className="p-4 text-sm">{device.site}</td>
                  <td className="p-4 text-rose-500 text-sm font-medium">{device.serial_number}</td>
                  <td className="p-4 text-sm">{device.ip_address}</td>
                  <td className="p-4 text-sm text-slate-500">
                    2026-07-28 14:55:49
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${
                        device.status === 'online' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {device.status === 'online' ? 'ONLINE' : 'OFFLINE / FAULT'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button className={`px-4 py-1.5 rounded-md border transition-colors flex items-center gap-2 mx-auto text-xs font-bold ${
                      darkMode 
                      ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white' 
                      : 'border-cyan-500 text-cyan-600 bg-cyan-50 hover:bg-cyan-500 hover:text-white'
                    }`}>
                      <User className="w-3.5 h-3.5" /> Profile
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-500">
                  Tidak ada data meter yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatusKwhMeter;