import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ArrowRight, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

const EventLogs = () => {
  const [logs, setLogs] = useState([]);
  
  const BACKEND_URL = `http://${window.location.hostname}:3000`;

  useEffect(() => {
    const fetchLogs = () => {
      axios.get(`${BACKEND_URL}/api/events`)
        .then(res => setLogs(res.data))
        .catch(err => console.error("Failed to fetch logs", err));
    };
    
    fetchLogs();
    // Refresh logs every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'online') return <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20"><CheckCircle2 className="w-3 h-3"/> ONLINE</span>;
    if (status === 'offline') return <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-400/10 px-2 py-1 rounded border border-rose-400/20"><AlertTriangle className="w-3 h-3"/> OFFLINE</span>;
    return <span className="text-xs font-bold text-slate-400 uppercase">{status}</span>;
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white tracking-wide">System Event History</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-bold">Timestamp</th>
              <th className="p-4 font-bold">Device</th>
              <th className="p-4 font-bold">Site</th>
              <th className="p-4 font-bold">Status Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {logs.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500 italic">No events logged yet.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-sm text-slate-300 font-mono">
                    {new Date(log.timestamp + 'Z').toLocaleString()} 
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-200">{log.device_name || 'Deleted Device'}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{log.ip_address || 'Unknown IP'}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-400 font-semibold uppercase tracking-wider">
                    {log.site || '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(log.previous_status)}
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      {getStatusBadge(log.current_status)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventLogs;