import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ==========================================
// 1. URUTAN CUSTOM GI & PLTD
// ==========================================
const SITE_ORDER = [
  "GI KERTASARI", "GI TALIWANG", "GI ALAS", "GI SUMBAWA", "GI LABUHAN",
  "GI PLAMPANG", "GI EMPANG", "GI DOMPU", "GI WOHA", "GI BIMA",
  "GI BONTO", "GI SAPE", "PLTD BOAK", "PLTD LABUHAN", "PLTD DOMPU", "PLTD NIU"
];

const formatRibuan = (num) => {
  if (num === undefined || num === null || num === '') return "-";
  return new Intl.NumberFormat('id-ID').format(num);
};

// ==========================================
// FUNGSI HELPER: MENDAPATKAN ARRAY HALAMAN (Maks 5 Tombol)
// ==========================================
const getPaginationGroup = (currentPage, totalPages) => {
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }
  
  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
};

export default function BillingKwh({ darkMode, tanggal }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State untuk dropdown Show limit
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State paginasi untuk masing-masing Site { "GI KERTASARI": 1, "GI TALIWANG": 2 }
  const [pageConfigs, setPageConfigs] = useState({});
  
  const [sortConfig, setSortConfig] = useState({ key: 'DateTime', direction: 'desc' });

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/billing?tgl=${tanggal}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
        setPageConfigs({}); // Reset page saat tanggal/menu berubah
      })
      .catch(err => {
        console.error("Gagal menarik data billing:", err);
        setLoading(false);
      });
  }, [tanggal]);

  // ==========================================
  // 2. FILTER & SORTING DATA GLOBAL
  // ==========================================
  let processedData = [...data];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedData = processedData.filter(item =>
      (item.Site && item.Site.toLowerCase().includes(q)) ||
      (item.Device && item.Device.toLowerCase().includes(q)) ||
      (item.SerialNumber && item.SerialNumber.toLowerCase().includes(q)) ||
      (item.DateTime && item.DateTime.toLowerCase().includes(q))
    );
  }

  // Sorting berdasarkan header kolom yang di-klik pengguna
  processedData.sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    if (sortConfig.key === 'kWhDelivery' || sortConfig.key === 'kWhReceived') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // ==========================================
  // 3. GROUPING DATA BERDASARKAN SITE
  // ==========================================
  const groupedData = processedData.reduce((acc, item) => {
    const site = item.Site ? item.Site.trim().toUpperCase() : '-';
    if (!acc[site]) acc[site] = [];
    acc[site].push(item);
    return acc;
  }, {});

  // Urutkan Site sesuai dengan SITE_ORDER
  const sortedSites = Object.keys(groupedData).sort((a, b) => {
    let indexA = SITE_ORDER.indexOf(a);
    let indexB = SITE_ORDER.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    if (indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b);
  });

  // Handler Event Paginasi & Control
  const handlePageChange = (site, pageNumber) => {
    setPageConfigs(prev => ({ ...prev, [site]: pageNumber }));
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setPageConfigs({}); // Reset semua halaman site ke 1
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPageConfigs({}); // Reset semua halaman site ke 1
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Logika Judul Dinamis
  const getHeaderTitle = () => {
    if (tanggal === 'Harian') return 'BILLING DATA KWH PER 30 MENIT';
    if (tanggal === '01') return 'BILLING DATA KWH PER TANGGAL 1';
    if (tanggal === '25') return 'BILLING DATA KWH PER TANGGAL 25';
    return `BILLING DATA KWH PER TANGGAL ${tanggal}`;
  };

  return (
    <div className={`w-full rounded-xl border shadow-xl p-5 flex flex-col min-h-[500px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* ========================================== */}
      {/* HEADER CONTROLS (Judul, Dropdown Show, dan Search) */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        
        {/* TULISAN JUDUL (DIPINDAHKAN DARI NAVBAR KE SINI) */}
        <h2 className={`text-base font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          {getHeaderTitle()}
        </h2>

        {/* INPUT PENCARIAN & SHOW ENTRIES */}
        <div className="flex justify-end items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              className={`border rounded px-1.5 py-1 focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="relative w-48">
            <input
              type="text"
              placeholder="Search Device, SN, Date..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={`w-full pl-3 pr-8 py-1.5 text-[11px] rounded border focus:outline-none transition-all ${darkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'}`}
            />
            <Search className="w-3 h-3 text-slate-400 absolute right-2.5 top-1.5 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* TABEL AREA (Di-render terpisah per Site) */}
      {/* ========================================== */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
          Sedang memuat data...
        </div>
      ) : sortedSites.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-medium border border-dashed rounded-xl p-10 mt-4 border-slate-700">
          Tidak ada data ditemukan.
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-4">
          {sortedSites.map(site => {
            const siteData = groupedData[site];
            const totalRows = siteData.length;
            const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
            
            const currentPage = pageConfigs[site] || 1;
            const safePage = Math.min(currentPage, totalPages);
            
            const indexOfLastRow = safePage * rowsPerPage;
            const indexOfFirstRow = indexOfLastRow - rowsPerPage;
            const currentSiteRows = siteData.slice(indexOfFirstRow, indexOfLastRow);

            return (
              <div key={site} className={`rounded-xl border overflow-hidden shadow-sm ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                
                {/* Header Tabel (Nama Site) */}
                <div className={`px-5 py-3 border-b flex items-center gap-3 ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                  <h3 className={`font-extrabold text-sm uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {site}
                  </h3>
                </div>

                {/* Isi Tabel dengan Lebar Kolom Presisi (Table-Fixed) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'border-slate-800 text-slate-500 bg-slate-950/30' : 'border-slate-200 text-slate-400 bg-slate-50/50'}`}>
                        <th className="w-[30%] p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('Device')}>
                          <div className="flex items-center gap-1">Device {renderSortIcon('Device')}</div>
                        </th>
                        <th className="w-[20%] p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('SerialNumber')}>
                          <div className="flex items-center gap-1">Serial Number {renderSortIcon('SerialNumber')}</div>
                        </th>
                        <th className="w-[18%] p-3 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('DateTime')}>
                          <div className="flex items-center gap-1">Date Time {renderSortIcon('DateTime')}</div>
                        </th>
                        <th className="w-[16%] p-3 cursor-pointer hover:text-blue-500 transition-colors text-right" onClick={() => handleSort('kWhDelivery')}>
                          <div className="flex items-center justify-end gap-1">kWh Delivery {renderSortIcon('kWhDelivery')}</div>
                        </th>
                        <th className="w-[16%] p-3 cursor-pointer hover:text-blue-500 transition-colors text-right" onClick={() => handleSort('kWhReceived')}>
                          <div className="flex items-center justify-end gap-1">kWh Received {renderSortIcon('kWhReceived')}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${darkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                      {currentSiteRows.map((row, index) => (
                        <tr key={index} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`p-3 font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.Device}</td>
                          <td className="p-3 font-mono text-slate-400 truncate">{row.SerialNumber}</td>
                          <td className="p-3 font-mono text-slate-400">{row.DateTime}</td>
                          <td className="p-3 font-mono text-right text-emerald-500 font-bold truncate">{formatRibuan(row.kWhDelivery)}</td>
                          <td className="p-3 font-mono text-right text-rose-500 font-bold truncate">{formatRibuan(row.kWhReceived)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Paginasi Khusus Per-Site (MAKSIMAL 5 TOMBOL HALAMAN) */}
                {totalRows > 0 && (
                  <div className={`flex justify-between items-center px-5 py-4 text-[11px] ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500'}`}>
                    <span>
                      Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, totalRows)} of <span className="font-bold">{totalRows}</span> results
                    </span>

                    {/* Navigasi Pagination */}
                    {totalPages > 1 && (
                      <div className={`flex items-center rounded-md border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                        
                        <button
                          disabled={safePage === 1}
                          onClick={() => handlePageChange(site, safePage - 1)}
                          className={`px-2 py-1.5 transition-colors ${darkMode ? 'hover:bg-slate-800 disabled:opacity-30' : 'hover:bg-slate-100 disabled:opacity-50'}`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Deretan Angka Halaman (Dibatasi Maksimal 5 Tombol) */}
                        {getPaginationGroup(safePage, totalPages).map(page => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(site, page)}
                            className={`px-3 py-1.5 font-semibold transition-colors border-l ${
                              darkMode ? 'border-slate-700' : 'border-slate-300'
                            } ${
                              page === safePage
                                ? 'bg-blue-500 text-white'
                                : darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          disabled={safePage === totalPages}
                          onClick={() => handlePageChange(site, safePage + 1)}
                          className={`px-2 py-1.5 transition-colors border-l ${
                            darkMode ? 'border-slate-700 hover:bg-slate-800 disabled:opacity-30' : 'border-slate-300 hover:bg-slate-100 disabled:opacity-50'
                          }`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    )}
                  </div>
                )}
                
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}