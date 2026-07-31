import { useState, useEffect } from 'react';
import axios from 'axios';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

// Fungsi untuk format angka ribuan dengan standar Indonesia (pakai titik)
const formatRibuan = (num) => {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat('id-ID').format(num);
};

// Kamus Nama Bulan Lengkap
const namaBulanLengkap = {
  'Jan': 'Januari', 'Feb': 'Februari', 'Mar': 'Maret', 'Apr': 'April',
  'Mei': 'Mei', 'Jun': 'Juni', 'Jul': 'Juli', 'Ags': 'Agustus',
  'Sep': 'September', 'Okt': 'Oktober', 'Nov': 'November', 'Des': 'Desember'
};

// Custom Tooltip Khusus untuk OPSIS TAMBORA, UP2B NTB, dan UIW NTB
const CustomTooltipBulanan = ({ active, payload, label, darkMode, type }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const fullMonthName = `${namaBulanLengkap[label] || label} 2026`;
    
    let losisLabel = "";
    let losisValue = 0;
    let extras = null;

    if (type === 'OPSIS_TAMBORA') {
      losisLabel = "Losis Opsis Tambora NTB:";
      losisValue = data.up2b_losis;
      extras = (
        <>
          <p className="flex justify-between gap-4"><span>Loko UP2B:</span> <span className="font-mono">{formatRibuan(data.up2b_loko)} kWh</span></p>
          <p className="flex justify-between gap-4"><span>Siap Salur UP2B:</span> <span className="font-mono">{formatRibuan(data.up2b_siap_salur)} kWh</span></p>
          <p className="flex justify-between gap-4"><span>PS GI UP2B:</span> <span className="font-mono">{formatRibuan(data.up2b_ps_gi)} kWh</span></p>
        </>
      );
    } else if (type === 'UP2B_NTB') {
      losisLabel = "Losis UP2B NTB:";
      losisValue = data.up2b_ntb_losis;
      extras = null; // Tidak ada data tambahan untuk UP2B NTB
    } else if (type === 'UIW') {
      losisLabel = "Losis UIW NTB:";
      losisValue = data.uiw_losis;
      extras = (
        <>
          <p className="flex justify-between gap-4"><span>Netto UIW NTB:</span> <span className="font-mono">{formatRibuan(data.uiw_netto)} kWh</span></p>
          <p className="flex justify-between gap-4"><span>Loko UIW NTB:</span> <span className="font-mono">{formatRibuan(data.uiw_loko)} kWh</span></p>
          <p className="flex justify-between gap-4"><span>Siap Salur UIW NTB:</span> <span className="font-mono">{formatRibuan(data.uiw_siap_salur)} kWh</span></p>
          <p className="flex justify-between gap-4"><span>PS GI UIW NTB:</span> <span className="font-mono">{formatRibuan(data.uiw_ps_gi)} kWh</span></p>
        </>
      );
    }

    return (
      <div className={`p-4 rounded-lg border shadow-xl ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <p className={`text-base font-extrabold mb-3 border-b pb-2 ${darkMode ? 'text-white border-slate-700' : 'text-slate-800 border-slate-200'}`}>
          {fullMonthName}
        </p>
        
        {/* Value Grafik Utama + Losis (Ditaruh di atas garis pembatas) */}
        <div className="flex flex-col gap-1.5 mb-3">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-bold m-0 flex justify-between gap-4">
              <span>{entry.name}:</span> <span>{entry.value}%</span>
            </p>
          ))}
          <p className="text-sm font-bold m-0 flex justify-between gap-4 text-rose-500">
            <span>{losisLabel}</span> <span className="font-mono">{formatRibuan(losisValue)} kWh</span>
          </p>
        </div>

        {/* Nilai Ekstra Energi (Hanya dirender jika ada datanya) */}
        {extras && (
          <div className={`flex flex-col gap-1 pt-2 border-t text-sm font-medium ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
            {extras}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const SusutBulanan = ({ darkMode }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timestamp = new Date().getTime();
    axios.get(`/data_susut_bulanan.json?t=${timestamp}`)
      .then(response => {
        const currentMonthIndex = new Date().getMonth();
        const validData = response.data.filter((item, index) => index < currentMonthIndex);
        
        setData(validData);
        setLoading(false);
      })
      .catch(error => {
        console.error("Gagal mengambil data susut bulanan:", error);
        setLoading(false);
      });
  }, []);

  const formatLabel = (val) => (val > 0 ? `${val}%` : '');

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {loading ? (
        <div className="flex items-center justify-center text-slate-400 text-sm mt-10">Memuat data Susut Bulanan...</div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center text-slate-400 text-sm mt-10 border rounded-xl p-10 border-dashed border-slate-700">Data valid untuk bulan ini belum tersedia.</div>
      ) : (
        <>
          {/* GRAFIK 1: SUSUT OPSIS TAMBORA NTB */}
          <div className={`w-full rounded-xl border shadow-xl p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 text-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              SUSUT OPSIS TAMBORA NTB
            </h2>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="bulan" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  
                  <Tooltip cursor={{ fill: darkMode ? '#0f172a' : '#f1f5f9' }} content={<CustomTooltipBulanan darkMode={darkMode} type="OPSIS_TAMBORA" />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  
                  {/* Offset diperbesar dari 15 ke 45 agar turun lebih jauh */}
                  <Bar dataKey="up2b_susut" name="Susut Bulanan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="up2b_susut" position="insideTop" offset={45} formatter={formatLabel} fill="#ffffff" fontSize={11} fontWeight="bold" />
                  </Bar>
                  <Line type="monotone" dataKey="up2b_kumulatif" name="Susut Kumulatif" stroke="#eab308" strokeWidth={3} dot={{ r: 5, fill: "#eab308" }} activeDot={{ r: 8 }}>
                     <LabelList dataKey="up2b_kumulatif" position="top" offset={10} formatter={formatLabel} fill={darkMode ? '#f8fafc' : '#334155'} fontSize={12} fontWeight="bold" />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAFIK 2: SUSUT UP2B NTB */}
          <div className={`w-full rounded-xl border shadow-xl p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 text-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              SUSUT UP2B NTB
            </h2>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="bulan" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  
                  <Tooltip cursor={{ fill: darkMode ? '#0f172a' : '#f1f5f9' }} content={<CustomTooltipBulanan darkMode={darkMode} type="UP2B_NTB" />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  
                  {/* Offset diperbesar dari 15 ke 45 agar turun lebih jauh */}
                  <Bar dataKey="up2b_ntb_susut" name="Susut Bulanan" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="up2b_ntb_susut" position="insideTop" offset={45} formatter={formatLabel} fill="#ffffff" fontSize={11} fontWeight="bold" />
                  </Bar>
                  <Line type="monotone" dataKey="up2b_ntb_kumulatif" name="Susut Kumulatif" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: "#f97316" }} activeDot={{ r: 8 }}>
                     <LabelList dataKey="up2b_ntb_kumulatif" position="top" offset={10} formatter={formatLabel} fill={darkMode ? '#f8fafc' : '#334155'} fontSize={12} fontWeight="bold" />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAFIK 3: SUSUT UIW NTB */}
          <div className={`w-full rounded-xl border shadow-xl p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 text-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              SUSUT UIW NTB
            </h2>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="bulan" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  
                  <Tooltip cursor={{ fill: darkMode ? '#0f172a' : '#f1f5f9' }} content={<CustomTooltipBulanan darkMode={darkMode} type="UIW" />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  
                  {/* Offset diperbesar dari 15 ke 45 agar turun lebih jauh */}
                  <Bar dataKey="uiw_susut" name="Susut Bulanan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="uiw_susut" position="insideTop" offset={45} formatter={formatLabel} fill="#ffffff" fontSize={11} fontWeight="bold" />
                  </Bar>
                  <Line type="monotone" dataKey="uiw_kumulatif" name="Susut Kumulatif" stroke="#eab308" strokeWidth={3} dot={{ r: 5, fill: "#eab308" }} activeDot={{ r: 8 }}>
                     <LabelList dataKey="uiw_kumulatif" position="top" offset={10} formatter={formatLabel} fill={darkMode ? '#f8fafc' : '#334155'} fontSize={12} fontWeight="bold" />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default SusutBulanan;