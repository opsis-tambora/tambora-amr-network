import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SusutTambora = () => {
  const [data, setData] = useState([]);
  const [gangguan, setGangguan] = useState([]);
  const [transmisi, setTransmisi] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [groupedHighSusut, setGroupedHighSusut] = useState({});
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-31');
  const [summary, setSummary] = useState({ totalLosis: '0', maxSusut: '0%', dateMax: '-' });

  const formatToLongDateID = (dateStr) => {
    const [d, m, y] = dateStr.split('/');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    if (isNaN(dateObj)) return dateStr;
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-lg">
          <p className="text-white font-bold mb-1">{label}</p>
          <p style={{ color: '#ef4444' }}>Losis Sistem : {payload[0].value}</p>
          <p style={{ color: '#3b82f6' }}>Susut Harian : {payload[0].payload['Susut Harian']}%</p>
          <p style={{ color: '#f59e0b' }}>Susut Kumulatif : {payload[0].payload['Susut Kumulatif']}%</p>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    Promise.all([
      fetch('/data_susut.json').then(res => res.json()),
      fetch('/data_gangguan.json').then(res => res.json()),
      fetch('/data_transmisi.json').then(res => res.json())
    ]).then(([susutJson, gangguanJson, transmisiJson]) => {
      
      const parsedSusut = susutJson.map(item => {
        const parts = item.Tanggal.split('/');
        let dateObj;
        if (parts.length === 3) {
          dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          dateObj = new Date(item.Tanggal);
        }
        dateObj.setHours(0, 0, 0, 0); 
        
        return { 
          ...item, 
          dateObj, 
          'Losis Sistem': Number(item['Losis Sistem']) || 0, 
          'Susut Harian': Number(item['Susut Harian']) || 0,
          'Susut Kumulatif': Number(item['Susut Kumulatif']) || 0 
        };
      }).filter(item => !isNaN(item.dateObj)).sort((a, b) => a.dateObj - b.dateObj);
      setData(parsedSusut);

      const parseDateMMDDYYYY = (dateStr) => {
        if (!dateStr) return null;
        const [m, d, y] = dateStr.split('/');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        dateObj.setHours(0, 0, 0, 0); 
        return dateObj;
      };

      const parseIndonesianDate = (dateStr) => {
        if (!dateStr) return null;
        const cleanStr = dateStr.trim();
        const parts = cleanStr.split(' ');
        if (parts.length !== 3) return null;

        const day = Number(parts[0]);
        const monthStr = parts[1].toLowerCase();
        const year = Number(parts[2]);

        const months = {
          'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
          'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
          'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
        };

        const month = months[monthStr];
        if (month === undefined) return null;

        const dateObj = new Date(year, month, day);
        dateObj.setHours(0, 0, 0, 0); 
        return dateObj;
      };
      
      setGangguan(gangguanJson.map(item => ({ 
        ...item, 
        startObj: parseDateMMDDYYYY(item.TglAwal), 
        endObj: parseDateMMDDYYYY(item.TglAkhir) 
      })));

      setTransmisi(transmisiJson.map(item => ({
        ...item,
        dateObj: parseIndonesianDate(item.Tanggal)
      })));
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    const rangeFiltered = data.filter(item => {
      const itemDate = item.dateObj;
      return itemDate >= start && itemDate <= end && itemDate < today;
    });
    
    setFilteredData(rangeFiltered);

    const groups = {};
    rangeFiltered.filter(item => item['Susut Harian'] > 1.5).forEach(dayItem => {
      const dateStr = dayItem.Tanggal;
      const dObj = dayItem.dateObj;
      const susutHarian = dayItem['Susut Harian'];
      
      const activeGangguan = gangguan.filter(g => {
        if (!g.startObj || !g.endObj) return false;
        return dObj >= g.startObj && dObj <= g.endObj;
      });

      const activeTransmisi = transmisi.filter(t => {
        if (!t.dateObj) return false;
        return dObj.getTime() === t.dateObj.getTime();
      });
      
      groups[dateStr] = {
        susut: susutHarian,
        items: activeGangguan.length > 0 ? activeGangguan : [{ Pembangkit: '-', Status: '-', Keterangan: '-' }],
        transmisiItems: activeTransmisi 
      };
    });
    setGroupedHighSusut(groups);

    const totalLosis = rangeFiltered.reduce((sum, item) => sum + item['Losis Sistem'], 0);
    const maxSusutItem = rangeFiltered.reduce((prev, curr) => ((curr['Susut Harian'] || 0) > (prev?.['Susut Harian'] || 0) ? curr : prev), null);
    setSummary({
      totalLosis: totalLosis.toLocaleString('id-ID') + ' kWh',
      maxSusut: maxSusutItem ? `${maxSusutItem['Susut Harian']}%` : '0%',
      dateMax: maxSusutItem ? maxSusutItem.Tanggal : '-'
    });
  }, [startDate, endDate, data, gangguan, transmisi]); 

  return (
    <div className="h-auto w-full p-6 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-xl flex flex-col">
      
      <div className="flex gap-4 mb-6">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded border border-slate-700"><p className="text-slate-400 text-sm">Total Losis</p><p className="text-2xl font-bold">{summary.totalLosis}</p></div>
        <div className="bg-slate-800 p-4 rounded border border-slate-700"><p className="text-slate-400 text-sm">Susut Harian Max</p><p className="text-2xl font-bold">{summary.maxSusut}</p><p className="text-xs text-slate-500">Tanggal: {summary.dateMax}</p></div>
      </div>

      <div className="h-80 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="Tanggal" 
              stroke="#94a3b8" 
              tickFormatter={(val) => val.substring(0, 5)} 
              padding={{ left: 30, right: 30 }} 
            />
            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Losis Sistem" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {Object.keys(groupedHighSusut).length > 0 ? (
        Object.entries(groupedHighSusut).map(([date, groupData]) => (
          <div key={date} className="mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4 text-blue-400 border-b border-slate-700 pb-2">
              {formatToLongDateID(date)} (Susut: {groupData.susut}%)
            </h3>
            
            {/* TABEL GANGGUAN PEMBANGKIT */}
            <div className={`border border-slate-700 rounded-lg overflow-hidden shadow-md ${groupData.transmisiItems && groupData.transmisiItems.length > 0 ? 'mb-6' : ''}`}>
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    {/* LEBAR KOLOM DISAMAKAN DENGAN TABEL TRANSMISI */}
                    <th className="p-3 border-b border-slate-700 w-1/3">Pembangkit</th>
                    <th className="p-3 border-b border-slate-700 w-1/6">Status</th>
                    <th className="p-3 border-b border-slate-700 w-1/2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {groupData.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800">
                      <td className="p-3 break-words font-medium">{item.Pembangkit || '-'}</td>
                      <td className="p-3 break-words">{item.Status || '-'}</td>
                      <td className="p-3 break-words text-slate-300">{item.Keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABEL PEMELIHARAAN TRANSMISI (Hanya Muncul Jika Ada Data) */}
            {groupData.transmisiItems && groupData.transmisiItems.length > 0 && (
              <div className="border border-slate-700 rounded-lg overflow-hidden shadow-md">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-slate-800 text-slate-300">
                    <tr>
                      {/* LEBAR KOLOM DISAMAKAN DENGAN TABEL PEMBANGKIT */}
                      <th className="p-3 border-b border-slate-700 w-1/3">Unit</th>
                      <th className="p-3 border-b border-slate-700 w-1/6">Peralatan</th>
                      <th className="p-3 border-b border-slate-700 w-1/2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {groupData.transmisiItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800">
                        <td className="p-3 break-words font-medium">{item.Unit || '-'}</td>
                        <td className="p-3 break-words">{item.Peralatan || '-'}</td>
                        <td className="p-3 break-words text-slate-300">{item.Keterangan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center p-8 border border-slate-800 rounded-xl bg-slate-800/20">
          <p className="text-slate-500 font-medium">Tidak ada data susut {'>'} 1.5% dalam rentang ini.</p>
        </div>
      )}
    </div>
  );
};

export default SusutTambora;