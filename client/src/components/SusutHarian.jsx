import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// ==========================================
// 1. TEMPLATE DEVICE LIST & HELPERS (Persis dengan AnalisaSusutHarian)
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

// ==========================================
// 2. KOMPONEN DASHBOARD SUSUT HARIAN
// ==========================================
const SusutHarian = ({ darkMode }) => {
    const [data, setData] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Format Tanggal untuk parameter API (YYYY-MM-DD HH:mm)
    const formatDateTimeLocal = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    };

    // Menghasilkan daftar interval 30 menit dari 00:00 hingga jam sekarang
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

    // LOGIKA PERHITUNGAN SUSUT (Persis dengan yang ada di AnalisaSusutHarian)
    const calculateSusutForInterval = (dataAwal, dataAkhir) => {
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

        return parseFloat(persentase.toFixed(2));
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const intervals = generateTodayIntervals();
            
            // Fetch data per 30 menit ke API secara paralel
            const promises = intervals.map(async (interval) => {
                try {
                    const res = await axios.get('/api/analisa-susut', { 
                        params: { waktu_awal: interval.startStr, waktu_akhir: interval.endStr } 
                    });
                    
                    const records = res.data;
                    const dataAwal = records.filter(r => standardizeTime(r.DateTime) === interval.startStr);
                    const dataAkhir = records.filter(r => standardizeTime(r.DateTime) === interval.endStr);

                    // Kalkulasi rumusnya
                    const persentase = calculateSusutForInterval(dataAwal, dataAkhir);

                    return {
                        time: interval.label,
                        susut: persentase
                    };
                } catch (error) {
                    return { time: interval.label, susut: 0 };
                }
            });

            const chartData = await Promise.all(promises);
            setData(chartData);
            
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
        }, 1800000); // 30 Menit
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className={`p-6 min-h-screen ${darkMode ? 'text-white bg-slate-900' : 'text-slate-900 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Dashboard Susut Harian</h2>
                <div className="flex items-center gap-4">
                    {isLoading && <span className="text-sm font-semibold text-blue-500 animate-pulse">Menghitung Data 30 Menitan...</span>}
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
                        
                        <Tooltip 
                            formatter={(value) => [`${value}%`, 'Persentase Susut']}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                            contentStyle={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        
                        <Line 
                            type="monotone" 
                            dataKey="susut" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SusutHarian;