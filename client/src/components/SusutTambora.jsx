import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const getLocalYYYYMMDD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const SusutTambora = ({ darkMode = false }) => {
  const [data, setData] = useState([]);
  const [gangguan, setGangguan] = useState([]);
  const [transmisi, setTransmisi] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [groupedHighSusut, setGroupedHighSusut] = useState({});
  const [summary, setSummary] = useState({ totalLosis: '0', maxSusut: '0%', dateMax: '-' });

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalYYYYMMDD(yesterday);
  });

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
        <div className={`p-3 rounded-xl shadow-2xl min-w-[200px] border transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <p className={`font-bold mb-2 border-b pb-1 ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-100 text-blue-600'}`}>{label}</p>
          <p className="flex justify-between gap-4">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Losis Sistem:</span> 
            <span className={`font-semibold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>{Number(payload[0].value).toLocaleString('id-ID')} kWh</span>
          </p>
          <p className="flex justify-between gap-4 mt-1">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Susut Harian:</span> 
            <span className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{payload[0].payload['Susut Harian']}%</span>
          </p>
          <p className="flex justify-between gap-4 mt-1">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Susut Kumulatif:</span> 
            <span className={`font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{payload[0].payload['Susut Kumulatif']}%</span>
          </p>
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
    <div className={`w-full flex flex-col transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Date Pickers */}
      <div className="flex gap-4 mb-6">
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
          className={`rounded-lg px-4 py-2 font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800 shadow-sm'}`} 
        />
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
          className={`rounded-lg px-4 py-2 font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800 shadow-sm'}`} 
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`p-6 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
          <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Losis</p>
          <p className="text-3xl font-bold">{summary.totalLosis}</p>
        </div>
        <div className={`p-6 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
          <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Susut Harian Max</p>
          <p className="text-3xl font-bold">{summary.maxSusut}</p>
          <p className={`text-xs mt-2 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tanggal: {summary.dateMax}</p>
        </div>
      </div>

      {/* Line Chart */}
      <div className={`p-6 rounded-xl border mb-8 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`} style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#cbd5e1"} vertical={true} />
            <XAxis 
              dataKey="Tanggal" 
              stroke={darkMode ? "#94a3b8" : "#64748b"} 
              tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontWeight: 500 }}
              tickFormatter={(val) => val.substring(0, 5)} 
              padding={{ left: 30, right: 30 }} 
            />
            <YAxis 
              stroke={darkMode ? "#94a3b8" : "#64748b"} 
              tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontWeight: 500 }}
              domain={['auto', 'auto']} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: darkMode ? '#64748b' : '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Line 
              type="monotone" 
              dataKey="Losis Sistem" 
              stroke="#ef4444" 
              strokeWidth={3}
              activeDot={{ r: 7, fill: '#ef4444', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabel Detail Susut Tinggi */}
      {Object.keys(groupedHighSusut).length > 0 ? (
        Object.entries(groupedHighSusut).map(([date, groupData]) => (
          <div key={date} className={`mb-8 p-6 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`text-xl font-bold mb-4 border-b pb-3 ${darkMode ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-slate-100'}`}>
              {formatToLongDateID(date)} <span className={`text-sm font-semibold ml-2 px-2 py-1 rounded ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>(Susut: {groupData.susut}%)</span>
            </h3>
            
            {/* TABEL GANGGUAN PEMBANGKIT */}
            <div className={`border rounded-lg overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${groupData.transmisiItems && groupData.transmisiItems.length > 0 ? 'mb-6' : ''}`}>
              <table className="w-full text-left border-collapse table-fixed">
                <thead className={`${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  <tr>
                    <th className={`p-4 border-b w-1/3 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Pembangkit</th>
                    <th className={`p-4 border-b w-1/6 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Status</th>
                    <th className={`p-4 border-b w-1/2 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Keterangan</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {groupData.items.map((item, idx) => (
                    <tr key={idx} className={`border-b transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`p-4 break-words font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.Pembangkit || '-'}</td>
                      <td className={`p-4 break-words ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.Status || '-'}</td>
                      <td className={`p-4 break-words ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.Keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABEL PEMELIHARAAN TRANSMISI */}
            {groupData.transmisiItems && groupData.transmisiItems.length > 0 && (
              <div className={`border rounded-lg overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className={`${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <tr>
                      <th className={`p-4 border-b w-1/3 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Unit</th>
                      <th className={`p-4 border-b w-1/6 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Peralatan</th>
                      <th className={`p-4 border-b w-1/2 font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {groupData.transmisiItems.map((item, idx) => (
                      <tr key={idx} className={`border-b transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                        <td className={`p-4 break-words font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.Unit || '-'}</td>
                        <td className={`p-4 break-words ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.Peralatan || '-'}</td>
                        <td className={`p-4 break-words ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.Keterangan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className={`text-center p-8 border rounded-xl ${darkMode ? 'border-slate-800 bg-slate-900 shadow-xl' : 'border-slate-200 bg-white shadow-sm'}`}>
          <p className={`font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tidak ada data susut &gt; 1.5% dalam rentang ini.</p>
        </div>
      )}
    </div>
  );
};

export default SusutTambora;