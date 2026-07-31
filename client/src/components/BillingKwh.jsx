import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';

const formatRibuan = (num) => {
  if (num === undefined || num === null || num === '') return "-";
  return new Intl.NumberFormat('id-ID').format(num);
};

export default function BillingKwh({ darkMode, tanggal }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'DateTime', direction: 'desc' });

  useEffect(() => {
    setLoading(true);
    // Memanggil API berdasarkan prop tanggal ('01' atau '25')
    axios.get(`/api/billing?tgl=${tanggal}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal menarik data billing:", err);
        setLoading(false);
      });
  }, [tanggal]);

  // Logika Filter Pencarian
  let processedData = [...data];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedData = processedData.filter(item =>
      (item.Site && item.Site.toLowerCase().includes(q)) ||
      (item.Device && item.Device.toLowerCase().includes(q)) ||
      (item.SerialNumber && item.SerialNumber.toLowerCase().includes(q))
    );
  }

  // Logika Sorting Kolom
  processedData.sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    // Khusus untuk angka
    if (sortConfig.key === 'kWhDelivery' || sortConfig.key === 'kWhReceived') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalPages === 0 ? 1 : totalPages);
  const indexOfLastRow = safeCurrentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className={`w-full rounded-xl border shadow-xl p-5 flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold whitespace-nowrap">Data Billing - Tanggal {tanggal}</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className={`flex items-center gap-2 text-xs font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={`border rounded-md px-2 py-1.5 focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search Site, Device, SN..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`w-full pl-4 pr-10 py-1.5 text-sm rounded-lg border focus:outline-none transition-all ${darkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'}`}
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('Site')}>
                <div className="flex items-center gap-1">Site {renderSortIcon('Site')}</div>
              </th>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('Device')}>
                <div className="flex items-center gap-1">Device {renderSortIcon('Device')}</div>
              </th>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('SerialNumber')}>
                <div className="flex items-center gap-1">Serial Number {renderSortIcon('SerialNumber')}</div>
              </th>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500" onClick={() => handleSort('DateTime')}>
                <div className="flex items-center gap-1">Date Time {renderSortIcon('DateTime')}</div>
              </th>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500 text-right" onClick={() => handleSort('kWhDelivery')}>
                <div className="flex items-center justify-end gap-1">kWh Delivery {renderSortIcon('kWhDelivery')}</div>
              </th>
              <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500 text-right" onClick={() => handleSort('kWhReceived')}>
                <div className="flex items-center justify-end gap-1">kWh Received {renderSortIcon('kWhReceived')}</div>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${darkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-slate-500 font-medium">Sedang memuat data...</td>
              </tr>
            ) : currentRows.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-slate-500 font-medium">Tidak ada data ditemukan.</td>
              </tr>
            ) : (
              currentRows.map((row, index) => (
                <tr key={index} className={darkMode ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'}>
                  <td className={`py-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{row.Site}</td>
                  <td className={`py-3 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.Device}</td>
                  <td className="py-3 font-mono text-slate-400">{row.SerialNumber}</td>
                  <td className="py-3 font-mono text-slate-400">{row.DateTime}</td>
                  <td className="py-3 font-mono text-right text-emerald-500 font-bold">{formatRibuan(row.kWhDelivery)}</td>
                  <td className="py-3 font-mono text-right text-rose-500 font-bold">{formatRibuan(row.kWhReceived)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Numbers */}
      <div className="flex justify-end items-center gap-1 mt-6 pt-4 border-t border-slate-800/50">
        {totalPages > 1 && Array.from({ length: totalPages }, (_, i) => (
          <button 
            key={i} 
            onClick={() => setCurrentPage(i + 1)} 
            className={`px-3 py-1.5 text-[11px] font-semibold border rounded-md transition-all ${safeCurrentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

    </div>
  );
}