import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

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

const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px] border transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <p className={`font-bold text-sm border-b pb-1 ${darkMode ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-slate-100'}`}>{label}</p>
        
        <p className="flex justify-between gap-4">
          <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Susut 30 Menit :</span> 
          <span className={`font-mono font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{data.susut}%</span>
        </p>

        <p className="flex justify-between gap-4">
          <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Losis 30 Menit :</span> 
          <span className={`font-mono font-semibold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>{formatRibuan(data.losis)} kWh</span>
        </p>

        <p className="flex justify-between gap-4">
          <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Susut Kumulatif :</span> 
          <span className={`font-mono font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{data.susutKumulatif}%</span>
        </p>

        <p className="flex justify-between gap-4">
          <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Losis Kumulatif :</span> 
          <span className={`font-mono font-semibold ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>{formatRibuan(data.losisKumulatif)} kWh</span>
        </p>
      </div>
    );
  }
  return null;
};

const SusutHarian = ({ darkMode }) => {
    const [data, setData] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [gangguanHariIni, setGangguanHariIni] = useState([]);

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

    // PERBAIKAN TOTAL: Pencocokan Tanggal Awal yang sangat toleran terhadap format JSON Spreadsheet
    useEffect(() => {
        fetch('/data_gangguan.json')
            .then(res => res.json())
            .then(json => {
                const now = new Date();
                const todayY = now.getFullYear();
                const todayM = String(now.getMonth() + 1).padStart(2, '0');
                const todayD = String(now.getDate()).padStart(2, '0');
                const todayStrStandard = `${todayY}-${todayM}-${todayD}`;

                const parseToStandardString = (dateStr) => {
                    if (!dateStr) return null;
                    const clean = String(dateStr).trim().split(' ')[0];
                    if (clean.includes('-')) {
                        const parts = clean.split('-');
                        if (parts[0].length === 4) return clean; // YYYY-MM-DD
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                    if (clean.includes('/')) {
                        const parts = clean.split('/');
                        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                        // Format M/D/YYYY atau D/M/YYYY
                        let m = parts[0], d = parts[1], y = parts[2];
                        if (Number(m) > 12) { d = parts[0]; m = parts[1]; }
                        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    }
                    return null;
                };

                const activeGangguan = json.filter(item => {
                    // Cari field tanggal awal secara fleksibel
                    const startRaw = item.TglAwal || item.Tanggal || item.Tgl_Awal || item['Tgl Awal'] || item.tgl_awal;
                    const endRaw = item.TglAkhir || item.Tgl_Akhir || item['Tgl Akhir'] || item.tgl_akhir;

                    // INSTRUKSI 3: Jika tanggal akhir sudah terisi (tidak kosong/-), abaikan/hapus
                    if (endRaw && String(endRaw).trim() !== '' && String(endRaw).trim() !== '-') {
                        return false;
                    }

                    const startStd = parseToStandardString(startRaw);
                    if (!startStd) return false;

                    // INSTRUKSI 1: Cocokkan persis dengan hari ini
                    return startStd === todayStrStandard;
                });
                
                setGangguanHariIni(activeGangguan);
            })
            .catch(err => console.error("Gagal mengambil data gangguan:", err));
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(() => {
            fetchData();
        }, 60000); 

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className={`w-full flex flex-col transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Susut 30 Menit - {todayDateStr}
                </h2>
                <div className="flex items-center gap-4">
                    {isLoading && <span className="text-sm font-semibold text-blue-500 animate-pulse">Menyelaraskan Data...</span>}
                    <span className={`text-sm px-3 py-1.5 rounded-md font-medium border transition-colors ${darkMode ? 'text-slate-300 bg-slate-800 border-slate-700' : 'text-slate-700 bg-white border-slate-300 shadow-sm'}`}>
                        Update Terakhir: {lastUpdate}
                    </span>
                </div>
            </div>
            
            <div className={`p-6 rounded-xl border shadow-sm transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-slate-200/50'}`} style={{ height: '450px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#cbd5e1"} />
                        
                        <XAxis 
                            dataKey="time" 
                            stroke={darkMode ? "#94a3b8" : "#64748b"} 
                            tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontWeight: 500 }}
                            tickMargin={10}
                        />
                        
                        <YAxis 
                            stroke={darkMode ? "#94a3b8" : "#64748b"} 
                            tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontWeight: 500 }}
                            tickFormatter={(value) => `${value}%`} 
                            domain={['auto', 'auto']} 
                        />
                        
                        <Tooltip content={<CustomTooltip darkMode={darkMode} />} cursor={{ stroke: darkMode ? '#64748b' : '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="susut" 
                            name="Susut 30 Menit"
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0, fill: '#10b981' }} 
                        />

                        <Line 
                            type="monotone" 
                            dataKey="susutKumulatif" 
                            name="Susut Kumulatif"
                            stroke="#f59e0b" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0, fill: '#f59e0b' }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* TABEL GANGGUAN PEMBANGKIT HARI INI */}
            <div className={`mt-8 p-6 rounded-xl border transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xl font-bold mb-4 border-b pb-3 ${darkMode ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-slate-100'}`}>
                    Gangguan Pembangkit ({todayDateStr})
                </h3>
                
                <div className={`border rounded-lg overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className={`${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            <tr>
                                <th className={`p-4 border-b w-[15%] font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Jam Gangguan</th>
                                <th className={`p-4 border-b w-[25%] font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Pembangkit</th>
                                <th className={`p-4 border-b w-[15%] font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>DMP</th>
                                <th className={`p-4 border-b w-[15%] font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Status</th>
                                <th className={`p-4 border-b w-[30%] font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {gangguanHariIni.length > 0 ? (
                                gangguanHariIni.map((item, idx) => {
                                    // INSTRUKSI 2: Tarik Jam Gangguan secara fleksibel dari berbagai variasi key Excel (Kolom H)
                                    const jamDisplay = item['Jam Gangguan'] || item.JamAwal || item.Jam_Gangguan || item.Jam || item.Waktu || item['Jam'] || '-';
                                    
                                    // INSTRUKSI 4: Tarik DMP secara fleksibel dan tambahkan "MW" di belakangnya (Kolom O)
                                    const dmpVal = item.DMP || item.Daya || item['DMP (MW)'] || item.MW || item.dmp;
                                    const dmpDisplay = (dmpVal !== undefined && dmpVal !== null && String(dmpVal).trim() !== '') ? `${dmpVal} MW` : '-';

                                    return (
                                        <tr key={idx} className={`border-b transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                                            <td className={`p-4 font-mono font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{jamDisplay}</td>
                                            <td className={`p-4 break-words font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.Pembangkit || item.Mesin || '-'}</td>
                                            <td className={`p-4 font-mono font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{dmpDisplay}</td>
                                            <td className={`p-4 break-words ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.Status || item.Klasifikasi || item.OMC || '-'}</td>
                                            <td className={`p-4 break-words ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.Keterangan || item.Uraian || '-'}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className={`p-6 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        Tidak ada gangguan pembangkit tercatat hari ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default SusutHarian;