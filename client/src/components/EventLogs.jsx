import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, ArrowRight } from 'lucide-react';

const EventLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    axios.get('/api/events')
      .then(response => {
        setLogs(response.data);
        setLoading(false);
      })
      .catch(() => {
        setLogs([
          { 
            timestamp: '2026-07-28 05:00:56', 
            name: 'IPS DOMPU SEWA', 
            ip: '172.20.21.250', 
            site: 'PLTD Dompu', 
            previous_status: 'offline', 
            current_status: 'online', 
            offline_timestamp: '2026-07-28 04:59:17', 
            duration_text: '00.01.40' 
          },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading event logs...
      </div>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const dateObj = new Date(timeStr.includes('Z') ? timeStr : timeStr + 'Z');
      return dateObj.toLocaleString('id-ID');
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col w-full">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">System Event History</h2>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {/* JIKA FILE INI BENAR, JUDUL KOLOM INI AKAN BERUBAH */}
              <th className="pb-3 pt-1 text-amber-400">TIMESTAMP (TEST UPDATE)</th>
              <th className="pb-3 pt-1">Device</th>
              <th className="pb-3 pt-1">Site</th>
              <th className="pb-3 pt-1 text-center">Status Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs text-white">
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const deviceName = log.device_name || log.name;
                const ipAddress = log.ip_address || log.ip;
                const prevStatus = String(log.previous_status || log.from || '').toUpperCase().trim();
                const currStatus = String(log.current_status || log.to || '').toUpperCase().trim();
                
                const isRecovery = prevStatus === 'OFFLINE' && currStatus === 'ONLINE';

                return (
                  <tr key={index} className="hover:bg-slate-950/40 transition-colors">
                    
                    <td className="py-3 font-mono">
                      {isRecovery ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="text-rose-400 text-[11px] font-semibold">
                            {log.offline_timestamp ? formatTime(log.offline_timestamp) : 'Menunggu DB...'} (Waktu Offline)
                          </div>
                          <div className="text-emerald-400 text-[11px] font-semibold">
                            {formatTime(log.timestamp)} (Waktu Online)
                          </div>
                          <div className="text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit mt-1">
                            Duration : {log.duration_text || '00.00.00'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400">{formatTime(log.timestamp)}</div>
                      )}
                    </td>

                    <td className="py-3">
                      <div className="font-bold text-slate-200">{deviceName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ipAddress}</div>
                    </td>
                    <td className="py-3 text-slate-300 font-medium">{log.site}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${prevStatus === 'OFFLINE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : prevStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                          <span className={`w-1 h-1 rounded-full ${prevStatus === 'OFFLINE' ? 'bg-rose-500' : prevStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span> {prevStatus}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${currStatus === 'OFFLINE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : currStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                          <span className={`w-1 h-1 rounded-full ${currStatus === 'OFFLINE' ? 'bg-rose-500' : currStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span> {currStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-500">
                  No event logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventLogs;