import { useState } from 'react';
import axios from 'axios';
import { Calculator, Printer } from 'lucide-react';

// ==========================================
// 1. TEMPLATE DEVICE LIST SESUAI EXCEL TERBARU
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

// Menampilkan bulan dengan huruf KAPITAL PENUH (AGUSTUS, SEPTEMBER, dll)
const formatIndoDateUpper = (dateStr) => {
  if (!dateStr) return "";
  const monthsUpper = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd} ${monthsUpper[parseInt(mm, 10) - 1]} ${yyyy}`;
};

// Menampilkan bulan dengan Title Case (Agustus, September, dll)
const formatIndoDateTitle = (dateStr) => {
  if (!dateStr) return "";
  const monthsTitle = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd} ${monthsTitle[parseInt(mm, 10) - 1]} ${yyyy}`;
};

const formatRibuan = (num) => {
  if (num === undefined || num === null || num === "") return "";
  if (num === 0 || num === "0") return "0"; 
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

export default function AnalisaSusutHarian({ darkMode }) {
  const [mulai, setMulai] = useState('');
  const [akhir, setAkhir] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [dataAwal, setDataAwal] = useState([]);
  const [dataAkhir, setDataAkhir] = useState([]);

  // Validasi ketat untuk input waktu agar selalu kelipatan 30 Menit (xx:00 atau xx:30)
  const handleTimeInput = (setter) => (e) => {
    let val = e.target.value;
    if (val) {
      const minutes = parseInt(val.split(':')[1], 10);
      if (minutes !== 0 && minutes !== 30) {
         val = val.substring(0, 13) + ":00";
      }
    }
    setter(val);
  };

  const handlePreview = async () => {
    if (!mulai || !akhir) {
      alert("Silakan lengkapi Datetime Mulai dan Datetime Akhir.");
      return;
    }

    setLoading(true);
    const wAwal = mulai.replace('T', ' ').substring(0, 16);
    const wAkhir = akhir.replace('T', ' ').substring(0, 16);

    try {
      const res = await axios.get('/api/analisa-susut', { params: { waktu_awal: wAwal, waktu_akhir: wAkhir } });
      const records = res.data;
      
      setDataAwal(records.filter(r => standardizeTime(r.DateTime) === wAwal));
      setDataAkhir(records.filter(r => standardizeTime(r.DateTime) === wAkhir));
      setPreviewMode(true);
    } catch (err) {
      console.error(err);
      alert("Gagal menarik data analisa susut.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // ==========================================
  // VARIABEL KALKULASI RUMUS TOTAL (TETAP)
  // ==========================================
  let sumLokoColumn = 0;   
  let sumSalurColumn = 0;  
  let sumGtExp = 0;        
  
  const rowsToRender = [];

  if (previewMode) {
    TEMPLATE_DEVICES.forEach((template) => {
      ['IMP', 'EXP'].forEach((type, typeIndex) => {
        
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
        let lokoTrans = "";
        let siapSalur = "";
        let diffValue = 0;

        if (isDompuTrafo1) {
          awalStr = type === 'IMP' ? 0.86 : 292011.68;
          akhirStr = type === 'IMP' ? 0.86 : 292011.68;
          diffValue = 0;
        } else if (isBontoTrafo1) {
          awalStr = type === 'IMP' ? 10149500 : 28242580;
          akhirStr = type === 'IMP' ? 10149500 : 28242580;
          diffValue = 0;
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
            if (isSwapped) {
              siapSalur = diffValue;
              sumSalurColumn += diffValue;
            } else {
              lokoTrans = diffValue;
              sumLokoColumn += diffValue;
            }
          } else { 
            if (isSwapped) {
              lokoTrans = diffValue;
              sumLokoColumn += diffValue;
            } else {
              siapSalur = diffValue;
              sumSalurColumn += diffValue;
              
              if (isGT) {
                sumGtExp += diffValue;
              }
            }
          }
        }

        rowsToRender.push({
          displayNo: typeIndex === 0 ? template.no : "",
          displayLokasi: (template.no !== '' && typeIndex === 0) ? template.site : "",
          namaMeter: `${template.label.trim()} ${type}`, 
          stanAwal: awalStr,
          stanAkhir: akhirStr,
          lokoTrans,
          siapSalur
        });
      });
    });
  }

  // ==========================================
  // RUMUS FINAL (TETAP)
  // ==========================================
  const totalLokoFormula = sumLokoColumn - sumGtExp;
  const totalSalurFormula = sumSalurColumn - sumGtExp;
  
  const losis = totalLokoFormula - totalSalurFormula;
  const persentase = totalLokoFormula > 0 ? ((losis / totalLokoFormula) * 100) : 0;

  const startDateStr = mulai ? mulai.split('T')[0] : '';
  const startTimeStr = mulai ? mulai.split('T')[1] : '';
  const endDateStr = akhir ? akhir.split('T')[0] : '';
  const endTimeStr = akhir ? akhir.split('T')[1] : '';

  return (
    <div className="w-full flex flex-col">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              /* Margin kertas dikembalikan agar halaman 2 tidak menempel di ujung atas */
              margin: 15mm 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
            }
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              /* Mematikan background, border, dan bayangan bawaan tailwind secara paksa */
              background: white !important;
              color: black !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* Konfigurasi pemotongan tabel yang rapi antar halaman */
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            
            .print\\:border-black { border-color: black !important; }
          }
        `}
      </style>

      {/* Kontrol Input Datetime */}
      <div className={`p-6 rounded-xl border shadow-md mb-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:hidden`}>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Datetime Mulai</label>
            <input 
              type="datetime-local" 
              step="1800"
              value={mulai} 
              onChange={handleTimeInput(setMulai)} 
              className={`px-3 py-2 border rounded-lg focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'}`} 
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Datetime Akhir</label>
            <input 
              type="datetime-local" 
              step="1800"
              value={akhir} 
              onChange={handleTimeInput(setAkhir)} 
              className={`px-3 py-2 border rounded-lg focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'}`} 
            />
          </div>
          
          <button 
            onClick={handlePreview} 
            disabled={loading}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Calculator className="w-5 h-5" /> {loading ? 'Memproses...' : 'Preview'}
          </button>

          {previewMode && (
            <button 
              onClick={handlePrint} 
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ml-auto"
            >
              <Printer className="w-5 h-5" /> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Tabel Template PDF */}
      {previewMode && (
        <div id="print-area" className={`w-full rounded-xl border shadow-xl p-8 flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:border-none print:shadow-none print:bg-white print:p-0`}>
          
          {/* HEADER CETAK DENGAN 2 LOGO (BUMN KIRI, PLN KANAN) */}
          <div className={`relative flex items-center justify-center font-bold text-sm leading-snug print:text-[11px] ${darkMode ? 'text-white' : 'text-black'} print:text-black`}>
            
            {/* Logo BUMN (Kiri) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-40 print:w-32 h-auto flex items-center">
              <img src="/logo-bumn.png" alt="Danantara / BUMN" className="max-w-full h-10 print:h-8 object-contain" />
            </div>
            
            <div className="text-center w-full">
              {/* Tambahkan spasi 1.5 (mt-6) sebelum teks PT PLN */}
              <p className="mt-6 print:mt-6">PT PLN (PERSERO) UNIT INDUK WILAYAH NTB</p>
              <p>UNIT PELAKSANA PENGATUR BEBAN - OPERASI SISTEM 2</p>
              <p>NERACA ENERGI SISTEM TAMBORA</p>
              {/* Tambahkan spasi 1.5 (mb-6) setelah teks PERIODE */}
              <p className="mb-6 print:mb-6">PERIODE {formatIndoDateUpper(startDateStr)} JAM {startTimeStr} - {formatIndoDateUpper(endDateStr)} JAM {endTimeStr} WITA</p>
            </div>

            {/* Logo PLN (Kanan) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 print:w-12 h-auto flex items-center justify-end">
              <img src="/logo-pln.png" alt="PLN" className="max-w-full h-14 print:h-12 object-contain" />
            </div>

          </div>
          
          {/* TABEL DIOPTIMALKAN UNTUK PRINT A4 */}
          <div className="overflow-x-auto w-full">
            <table className={`w-full border-collapse border text-[11px] print:text-[9px] ${darkMode ? 'border-slate-600 text-slate-200' : 'border-black text-black'} print:border-black print:text-black`}>
              <thead>
                <tr className={`text-center ${darkMode ? 'bg-slate-800' : 'bg-gray-100'} print:bg-gray-100`}>
                  <th className={`border p-1.5 print:p-1 w-8 ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>NO</th>
                  <th className={`border p-1.5 print:p-1 w-28 ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>LOKASI</th>
                  <th className={`border p-1.5 print:p-1 ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>METER</th>
                  <th className={`border p-1.5 print:p-1 w-24 ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>STAN AWAL</th>
                  <th className={`border p-1.5 print:p-1 w-24 ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>STAN AKHIR</th>
                  {/* Diperlebar agar tidak turun baris (1 Line) */}
                  <th className={`border p-1.5 print:p-1 w-36 print:w-[14%] whitespace-nowrap ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>ENERGI LOKO TRANS</th>
                  <th className={`border p-1.5 print:p-1 w-28 print:w-[12%] whitespace-nowrap ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>ENERGI SIAP SALUR</th>
                </tr>
              </thead>
              <tbody>
                {rowsToRender.map((r, i) => (
                  <tr key={i} className={`${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'} print:hover:bg-transparent`}>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] text-center ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{r.displayNo}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] font-normal ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{r.displayLokasi}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{r.namaMeter}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{formatRibuan(r.stanAwal)}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{formatRibuan(r.stanAkhir)}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{formatRibuan(r.lokoTrans)}</td>
                    <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>{formatRibuan(r.siapSalur)}</td>
                  </tr>
                ))}
                
                {/* BARIS TOTAL */}
                <tr className="font-bold">
                  <td colSpan="5" className={`border p-1.5 print:px-1 print:py-[2px] text-center ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>TOTAL KWH PRODUKSI (kWh)</td>
                  <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600 text-emerald-400' : 'border-black'} print:border-black print:text-black`}>{formatRibuan(totalLokoFormula)}</td>
                  <td className={`border p-1.5 print:px-1 print:py-[2px] text-right font-mono ${darkMode ? 'border-slate-600 text-emerald-400' : 'border-black'} print:border-black print:text-black`}>{formatRibuan(totalSalurFormula)}</td>
                </tr>

                {/* BARIS LOSIS */}
                <tr className="font-bold">
                  <td colSpan="5" className={`border p-1.5 print:px-1 print:py-[2px] text-center ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>LOSIS SISTEM TAMBORA (kWh)</td>
                  <td colSpan="2" className={`border p-1.5 print:px-1 print:py-[2px] text-center font-mono bg-transparent ${darkMode ? 'border-slate-600 text-rose-400' : 'border-black text-rose-600'} print:border-black print:text-black`}>{formatRibuan(losis)}</td>
                </tr>

                {/* BARIS PERSENTASE */}
                <tr className="font-bold">
                  <td colSpan="5" className={`border p-1.5 print:px-1 print:py-[2px] text-center ${darkMode ? 'border-slate-600' : 'border-black'} print:border-black`}>PERSENTASE SUSUT</td>
                  <td colSpan="2" className={`border p-1.5 print:px-1 print:py-[2px] text-center font-mono bg-transparent ${darkMode ? 'border-slate-600 text-amber-400' : 'border-black text-amber-600'} print:border-black print:text-black`}>
                    {formatRibuan(persentase)} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========================================== */}
          {/* AREA TANDA TANGAN (1 KOLOM TENGAH BAWAH - POLA V) */}
          {/* ========================================== */}
          <div className={`mt-8 print:mt-4 w-full flex flex-col items-center text-xs print:text-[10px] font-semibold leading-tight gap-4 ${darkMode ? 'text-white' : 'text-black'} print:text-black`}>
            
            {/* Tanggal TTD Format Title Case (Agustus) */}
            <p className="font-bold mb-4 print:mb-2">Sumbawa, {formatIndoDateTitle(endDateStr)}</p>

            <div className="w-full grid grid-cols-3 text-center relative">
              {/* Kolom Kiri */}
              <div className="flex flex-col items-center justify-start">
                <p>Diperiksa Oleh,</p>
                <p>Team Leader TTL & Metering</p>
                <img src="/Farid Azhar.png" alt="Ttd Farid" className="h-16 print:h-14 object-contain my-2 print:my-1" />
                <p className="font-bold">Farid Azhar</p>
              </div>

              {/* Kolom Tengah (Posisi diturunkan membentuk pola V) */}
              <div className="flex flex-col items-center justify-start pt-12 print:pt-10">
                <p>Mengetahui,</p>
                <p>Asman Operasi Sistem 2</p>
                <img src="/B. Ricardo Tampubolon.png" alt="Ttd Ricardo" className="h-16 print:h-14 object-contain my-2 print:my-1" />
                <p className="font-bold">B. Ricardo Tampubolon</p>
              </div>

              {/* Kolom Kanan */}
              <div className="flex flex-col items-center justify-start">
                <p>Dibuat Oleh,</p>
                <p>Technician TTL & Metering</p>
                <img src="/Ivan Edjie Pratama.png" alt="Ttd Ivan" className="h-16 print:h-14 object-contain my-2 print:my-1" />
                <p className="font-bold">Ivan Edjie Pratama</p>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}