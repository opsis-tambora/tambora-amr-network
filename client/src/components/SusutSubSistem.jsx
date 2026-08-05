import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label, darkMode, chartType }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateParts = label.split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : label;

    return (
      <div className={`p-4 rounded-lg border shadow-xl transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <p className={`text-base font-extrabold mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          {formattedDate}
        </p>
        <div className="flex flex-col gap-1.5">
          {chartType === 'bar' && (
            <p className="text-sm font-semibold m-0 text-rose-500">
              Susut Sistem : {data.susut_harian}%
            </p>
          )}
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-semibold m-0">
              {entry.name} : {entry.value}%
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const SusutSubSistem = ({ darkMode }) => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  const [startDate, setStartDate] = useState(formatDateForInput(firstDay));
  const [endDate, setEndDate] = useState(formatDateForInput(yesterday));
  const maxAllowedDate = formatDateForInput(yesterday);

  useEffect(() => {
    setLoading(true);
    const timestamp = new Date().getTime();
    axios.get(`/data_susut_subsistem.json?t=${timestamp}`)
      .then(response => {
        const parsedData = response.data.map(item => ({
          ...item,
          susut_harian: Number(item.susut_harian) || 0,
          sub_talas: Number(item.sub_talas) || 0,
          sub_sumbawa: Number(item.sub_sumbawa) || 0,
          sub_bima: Number(item.sub_bima) || 0,
          line_talas: Number(item.line_talas) || 0,
          line_sumbawa: Number(item.line_sumbawa) || 0,
          line_bima: Number(item.line_bima) || 0,
        })).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        setAllData(parsedData);
        setLoading(false);
      })
      .catch(error => {
        console.error("Gagal mengambil data dari server:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (allData.length > 0) {
      const effectiveEndDate = endDate > maxAllowedDate ? maxAllowedDate : endDate;
      const filtered = allData.filter(item => {
        return item.tanggal >= startDate && item.tanggal <= effectiveEndDate;
      });
      setFilteredData(filtered);
    }
  }, [allData, startDate, endDate, maxAllowedDate]);

  const maxBarValue = filteredData.length > 0
    ? Math.max(...filteredData.map(d => (d.sub_talas || 0) + (d.sub_sumbawa || 0) + (d.sub_bima || 0)))
    : 0;
  const yAxisMaxBar = maxBarValue > 0 ? Math.ceil(maxBarValue + (maxBarValue * 0.1)) : 'auto';

  const maxLineValue = filteredData.length > 0
    ? Math.max(...filteredData.map(d => Math.max(d.line_talas || 0, d.line_sumbawa || 0, d.line_bima || 0)))
    : 0;
  const yAxisMaxLine = maxLineValue > 0 ? Math.ceil(maxLineValue + (maxLineValue * 0.1)) : 'auto';

  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const parts = tickItem.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return tickItem;
  };

  return (
    <div className={`w-full flex flex-col gap-6 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      
      {/* FILTER TANGGAL */}
      <div className="flex flex-row items-center justify-start gap-4">
        <div className={`flex flex-row items-center gap-3 rounded-xl border shadow-sm px-4 py-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ colorScheme: darkMode ? 'dark' : 'light' }}
            className={`text-sm focus:outline-none transition-all cursor-pointer ${
              darkMode ? 'bg-transparent text-white' : 'bg-transparent text-slate-900'
            }`}
          />
        </div>
        <div className={`flex flex-row items-center gap-3 rounded-xl border shadow-sm px-4 py-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ colorScheme: darkMode ? 'dark' : 'light' }}
            className={`text-sm focus:outline-none transition-all cursor-pointer ${
              darkMode ? 'bg-transparent text-white' : 'bg-transparent text-slate-900'
            }`}
          />
        </div>
      </div>

      {loading ? (
        <div className={`flex-1 flex items-center justify-center text-sm mt-10 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Memuat data grafik...
        </div>
      ) : filteredData.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-sm mt-10 border rounded-xl p-10 border-dashed ${darkMode ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-300'}`}>
          Tidak ada data pada rentang tanggal yang dipilih.
        </div>
      ) : (
        <>
          {/* GRAFIK 1: BAR CHART */}
          <div className={`w-full rounded-xl border shadow-sm p-5 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 text-center transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              KONTRIBUSI SUSUT SISTEM TAMBORA
            </h2>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="tanggal" stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} axisLine={false} dy={10} tickFormatter={formatXAxis} />
                  <YAxis domain={[0, yAxisMaxBar]} stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} dx={-10} />
                  
                  <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} content={<CustomTooltip darkMode={darkMode} chartType="bar" />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  
                  <Bar dataKey="sub_talas" name="Sub Sistem Talas" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="sub_sumbawa" name="Sub Sistem Sumbawa" stackId="a" fill="#10b981" />
                  <Bar dataKey="sub_bima" name="Sub Sistem Bima" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAFIK 2: LINE CHART */}
          <div className={`w-full rounded-xl border shadow-sm p-5 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 text-center transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              SUSUT REGIONAL SISTEM TAMBORA
            </h2>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="tanggal" stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} axisLine={false} dy={10} tickFormatter={formatXAxis} />
                  <YAxis domain={[0, yAxisMaxLine]} stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} dx={-10} />
                  
                  <Tooltip content={<CustomTooltip darkMode={darkMode} chartType="line" />} cursor={{ stroke: darkMode ? '#64748b' : '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  
                  <Line type="monotone" dataKey="line_talas" name="Sub Sistem Talas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="line_sumbawa" name="Sub Sistem Sumbawa" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="line_bima" name="Sub Sistem Bima" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SusutSubSistem;