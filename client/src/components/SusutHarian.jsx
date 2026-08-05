import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// ==========================================
// 1. TEMPLATE DEVICE LIST & HELPERS
// ==========================================
const TEMPLATE_DEVICES = [
  { no: 1, site: 'GI KERTASARI', dbName: 'GT PLTU 1 MAIN', label: 'GT PLTU 1 MAIN' },
  { no: '', site: 'GI KERTASARI', dbName: 'GT PLTU 2 MAIN', label: 'GT PLTU 2 MAIN' },
  { no: '', site: 'GI KERTASARI', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 2, site: 'GI TALIWANG', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 3, site: 'GI ALAS', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 4, site: 'GI SUMBAWA', dbName: 'GT 1 PLTMG SBW 1 MAIN', label: 'GT 1 PLTMG SBW 1 MAIN' },
  { no: '', site: 'GI SUMBAWA', dbName: 'GT 2 PLTMG SBW 1 MAIN', label: 'GT 2 PLTMG SBW 1 MAIN' },
  { no: '', site: 'GI SUMBAWA', dbName: 'GT 3 PLTMG SBW 2 MAIN', label: 'GT 3 PLTMG SBW 2 MAIN' },
  { no: '', site: 'GI SUMBAWA', dbName: 'GT 4 PLTMG SBW 2 MAIN', label: 'GT 4 PLTMG SBW 2 MAIN' },
  { no: '', site: 'GI SUMBAWA', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 5, site: 'GI LABUHAN', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 6, site: 'GI PLAMPANG', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 7, site: 'GI EMPANG', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
  { no: 8, site: 'GI DOMPU', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1 ' }, 
  { no: '', site: 'GI DOMPU', dbName: 'INC TRAFO 2', label: 'INC TRAFO 2 ' },
  { no: 9, site: 'GI WOHA', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1 ' },
  { no: '', site: 'GI WOHA', dbName: 'INC TRAFO 2', label: 'INC TRAFO 2 ' },
  { no: 10, site: 'GI BIMA', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1 ' },
  { no: '', site: 'GI BIMA', dbName: 'INC TRAFO 2', label: 'INC TRAFO 2 ' },
  { no: 11, site: 'GI BONTO', dbName: 'GT 1 PLTMG BONTO MAIN', label: 'GT 1 PLTMG BONTO MAIN' },
  { no: '', site: 'GI BONTO', dbName: 'GT 2 PLTMG BONTO MAIN', label: 'GT 2 PLTMG BONTO MAIN' },
  { no: '', site: 'GI BONTO', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1 ' },
  { no: '', site: 'GI BONTO', dbName: 'INC TRAFO 2', label: 'INC TRAFO 2 ' },
  { no: 12, site: 'GI SAPE', dbName: 'INC TRAFO 1', label: 'INC TRAFO 1' },
];

const standardizeTime = (timeStr) => {
  if (!timeStr) return "";
  let clean = timeStr.replace(/\//g, '-');
  return clean.substring(0, 16); 
};

const formatRibuan = (num) => {
  if (num === undefined || num === null || num === "") return "0";
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// ==========================================
// 2. CUSTOM TOOLTIP COMPONENT
// ==========================================
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs text-white space-y-1.5 min-w-[190px]">
        <p className="font-bold text-sm text-blue-400 border-b border-slate-800 pb-1">{label}</p>
        
        {/* Urutan 1: Susut 30 Menit */}
        <p className="flex justify-between gap-4">
          <span className="text-slate-400">Susut 30 Menit :</span> 
          <span className="font-mono font-semibold text-emerald-400">{data.susut}%</span>
        </p>

        {/* Urutan 2: Losis 30 Menit */}
        <p className="flex justify-between gap-4">
          <span className="text-slate-400">Losis 30 Menit :</span> 
          <span className="font-mono font-semibold text-rose-400">{formatRibuan(data.losis)} kWh</span>
        </p>

        {/* Urutan 3: Susut Kumulatif */}
        <p className="flex justify-between gap-4">
          <span className="text-slate-400">Susut Kumulatif :</span> 
          <span className="font-mono font-semibold text-amber-400">{data.susutKumulatif}%</span>
        </p>

        {/* Urutan 4: Losis Kumulatif */}
        <p className="flex justify-between gap-4">
          <span className="text-slate-400">Losis Kumulatif :</span> 
          <span className="font-mono font-semibold text-violet-400">{formatRibuan(data.losisKumulatif)} kWh</span>
        </p>
      </div>
    );
  }
  return null;
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
const SusutHarian = ({ darkMode }) => {
    const [data, setData] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Dapatkan tanggal hari ini dengan format "DD Bulan YYYY" (misal: 05 Agustus 2026)
    const todayDateStr = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(new Date());

    const formatDateTimeLocal = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    };

    const generateTodayIntervals = () => {
        const intervals = [];
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        
        let current = startOfDay;
        while (current < now) {
            const next = new Date(current.getTime() + 30 * 60000); 
            if (next > now) break; 

            intervals.push({
                startStr: formatDateTimeLocal(current),
                endStr: formatDateTimeLocal(next),
                label: `${String(next.getHours()).padStart(2, '0')}.${String(next.getMinutes()).padStart(2, '0')}` 
            });
            current = next;
        }
        return intervals;
    };

    const calculateMetricsForInterval = (dataAwal, dataAkhir) => {
        let sumLokoColumn = 0;   
        let sumSalurColumn = 0;  
        let sumGtExp = 0;        
        
        TEMPLATE_DEVICES.forEach((template) => {
            ['IMP', 'EXP'].forEach((type) => {
                const isSwapped = template.site === 'GI ALAS' || 
                                  template.site === 'GI PLAMPANG' || 
                                  (template.site === 'GI KERTASARI' && template.label.includes('INC TRAFO'));
                const isDompuTrafo1 = template.site === 'GI DOMPU' && template.label.includes('INC TRAFO 1');
                const isBontoTrafo1 = template.site === 'GI BONTO' && template.label.includes('INC TRAFO 1');
                const isGT = template.label.includes('GT') || template.dbName.includes('GT');

                const recAwal = dataAwal.find(r => r.Site.toUpperCase() === template.site.toUpperCase() && r.Device.toUpperCase() === template.dbName.toUpperCase());
                const recAkhir = dataAkhir.find(r => r.Site.toUpperCase() === template.site.toUpperCase() && r.Device.toUpperCase() === template.dbName.toUpperCase());

                let awalStr = "";
                let akhirStr = "";
                let diffValue = 0;

                if (isDompuTrafo1) {
                    awalStr = type === 'IMP' ? 0.86 : 292011.68;
                    akhirStr = type === 'IMP' ? 0.86 : 292011.68;
                } else if (isBontoTrafo1) {
                    awalStr = type === 'IMP' ? 10149500 : 28242580;
                    akhirStr = type === 'IMP' ? 10149500 : 28242580;
                } else {
                    if (type === 'IMP') {
                        awalStr = recAwal ? recAwal.kWhReceived : "";
                        akhirStr = recAkhir ? recAkhir.kWhReceived : "";
                    } else {
                        awalStr = recAwal ? recAwal.kWhDelivery : "";
                        akhirStr = recAkhir ? recAkhir.kWhDelivery : "";
                    }
                    if (awalStr !== "" && akhirStr !== "") {
                        const awal = parseFloat(awalStr) || 0;
                        const akhir = parseFloat(akhirStr) || 0;
                        diffValue = akhir - awal;
                        if (diffValue < 0) diffValue += 10000000; 
                    }
                }

                if (awalStr !== "" && akhirStr !== "") {
                    if (type === 'IMP') {
                        if (isSwapped) sumSalurColumn += diffValue;
                        else sumLokoColumn += diffValue;
                    } else { 
                        if (isSwapped) sumLokoColumn += diffValue;
                        else {
                            sumSalurColumn += diffValue;
                            if (isGT) sumGtExp += diffValue;
                        }
                    }
                }
            });
        });

        const totalLokoFormula = sumLokoColumn - sumGtExp;
        const totalSalurFormula = sumSalurColumn - sumGtExp;
        const losis = totalLokoFormula - totalSalurFormula;
        const persentase = totalLokoFormula > 0 ? ((losis / totalLokoFormula) * 100) : 0;

        return {
            susut: parseFloat(persentase.toFixed(2)),
            losis: parseFloat(losis.toFixed(2)),
            totalLoko: totalLokoFormula 
        };
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const intervals = generateTodayIntervals();
            
            const promises = intervals.map(async (interval) => {
                try {
                    const res = await axios.get('/api/analisa-susut', { 
                        params: { waktu_awal: interval.startStr, waktu_akhir: interval.endStr } 
                    });
                    
                    const records = res.data;
                    const dataAwal = records.filter(r => standardizeTime(r.DateTime) === interval.startStr);
                    const dataAkhir = records.filter(r => standardizeTime(r.DateTime) === interval.endStr);

                    const metrics = calculateMetricsForInterval(dataAwal, dataAkhir);

                    return {
                        time: interval.label,
                        susut: metrics.susut,
                        losis: metrics.losis,
                        totalLoko: metrics.totalLoko 
                    };
                } catch (error) {
                    return { time: interval.label, susut: 0, losis: 0, totalLoko: 0 };
                }
            });

            const rawChartData = await Promise.all(promises);

            let runningLosis = 0;
            let runningTotalLoko = 0;

            const finalChartData = rawChartData.map((item) => {
                runningLosis += item.losis;
                runningTotalLoko += item.totalLoko;
                
                let susutKumulatif = 0;
                if (runningTotalLoko > 0) {
                    susutKumulatif = (runningLosis / runningTotalLoko) * 100;
                }

                return {
                    ...item,
                    susutKumulatif: parseFloat(susutKumulatif.toFixed(2)),
                    losisKumulatif: parseFloat(runningLosis.toFixed(2)) 
                };
            });

            setData(finalChartData);
            
            const now = new Date();
            setLastUpdate(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        } catch (error) {
            console.error("Gagal mengambil data grafik:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        const intervalId = setInterval(() => {
            fetchData();
        }, 60000); 

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className={`p-6 min-h-screen ${darkMode ? 'text-white bg-slate-900' : 'text-slate-900 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-6">
                {/* Perubahan Judul Dashboard Disini */}
                <h2 className="text-2xl font-bold">Susut 30 Menit - {todayDateStr}</h2>
                <div className="flex items-center gap-4">
                    {isLoading && <span className="text-sm font-semibold text-blue-500 animate-pulse">Menyelaraskan Data 30 Menit...</span>}
                    <span className={`text-sm px-3 py-1 rounded-md font-medium ${darkMode ? 'text-gray-400 bg-slate-800' : 'text-gray-600 bg-slate-200'}`}>
                        Update Terakhir: {lastUpdate}
                    </span>
                </div>
            </div>
            
            <div className={`p-6 rounded-xl shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{ height: '450px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                        
                        <XAxis 
                            dataKey="time" 
                            stroke={darkMode ? "#94a3b8" : "#64748b"} 
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }}
                            tickMargin={10}
                        />
                        
                        <YAxis 
                            stroke={darkMode ? "#94a3b8" : "#64748b"} 
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }}
                            tickFormatter={(value) => `${value}%`} 
                            domain={['auto', 'auto']} 
                        />
                        
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Garis Susut 30 Menit */}
                        <Line 
                            type="monotone" 
                            dataKey="susut" 
                            name="Susut 30 Menit"
                            stroke="#10b981" 
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} 
                        />

                        {/* Garis Susut Kumulatif */}
                        <Line 
                            type="monotone" 
                            dataKey="susutKumulatif" 
                            name="Susut Kumulatif"
                            stroke="#f59e0b" 
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SusutHarian;