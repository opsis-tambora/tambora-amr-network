import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, Plus, Server, CheckCircle2, XCircle, AlertCircle, LayoutGrid, Network, Download, Upload, List } from 'lucide-react';
import NetworkTopology from './components/NetworkTopology';
import EventLogs from './components/EventLogs';
import { exportToExcel, downloadTemplate, readExcelFile } from './utils/excel';

function App() {
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('topology'); 
  
  // Form State
  const [newSite, setNewSite] = useState('GI Sumbawa');
  const [newCategory, setNewCategory] = useState('Incoming');
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null); 


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const parsedDevices = await readExcelFile(file);
      if (parsedDevices.length === 0) {
        alert("The Excel file is empty or formatted incorrectly.");
        return;
      }
      const response = await axios.post('/api/devices/bulk', { devices: parsedDevices });
      alert(response.data.message);
      if (response.data.errors.length > 0) {
        console.warn("Some devices were skipped:", response.data.errors);
      }
      fetchDevices(); 
    } catch (error) {
      alert("Error uploading file: " + error);
    }
    e.target.value = null; 
  };

  const fetchDevices = () => {
    axios.get('/api/devices')
      .then(response => setDevices(response.data))
      .catch(error => console.error("Error fetching data:", error));
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await axios.post('/api/devices', {
        name: newName,
        ip_address: newIp,
        site: newSite,
        category: newCategory
      });
      setNewName(''); setNewIp(''); setNewSite('GI Sumbawa'); setNewCategory('Incoming');
      setIsModalOpen(false);
      fetchDevices();
    } catch (err) {
      setFormError(err.response?.data?.error || 'An error occurred');
    }
  };

  const getStatusUI = (status) => {
    switch (status) {
      case 'online': return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
      case 'offline': return { icon: <XCircle className="w-5 h-5 text-rose-500" />, bg: 'bg-rose-500/10', text: 'text-rose-500' };
      default: return { icon: <AlertCircle className="w-5 h-5 text-slate-500" />, bg: 'bg-slate-800', text: 'text-slate-400' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col">
      
      {/* Header section */}
      <div className="w-full flex justify-between items-center p-4 md:px-8 md:pt-6 md:pb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AMR Meter Hub</h1>
            <p className="text-slate-400 text-sm">Real-time connectivity monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          
          {/* View Toggle Buttons */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1 mr-4">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Grid View"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('topology')} className={`p-2 rounded ${viewMode === 'topology' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Topology View"><Network className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('logs')} className={`p-2 rounded ${viewMode === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Event Logs"><List className="w-4 h-4" /></button>
          </div>

          {/* Excel Controls */}
          <button onClick={() => exportToExcel(devices)} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors" title="Export Live Data to Excel">
            <Download className="w-4 h-4" /> Export
          </button>

          <button onClick={downloadTemplate} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors mr-2">
            Template
          </button>

          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-semibold transition-all border border-slate-600">
            <Upload className="w-4 h-4" /> Import
          </button>

          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" /> Add Device
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`w-full flex-1 flex flex-col ${viewMode === 'grid' || viewMode === 'logs' ? 'max-w-7xl mx-auto px-4 md:px-8' : ''}`}>
        
        {viewMode === 'topology' && <NetworkTopology devices={devices} />}
        {viewMode === 'logs' && <EventLogs />}
        
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {devices.map(device => {
              const ui = getStatusUI(device.status);
              return (
                <div key={device.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-slate-500" />
                      <h3 className="font-bold text-slate-200">{device.name}</h3>
                    </div>
                    {ui.icon}
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">IP ADDRESS</p>
                      <p className="font-mono text-sm text-slate-300">{device.ip_address}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ui.bg} ${ui.text}`}>
                      {device.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Register New Meter</h2>
            <form onSubmit={handleAddDevice} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">DEVICE NAME</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" placeholder="e.g., Trafo 1 Substation" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">IP ADDRESS</label>
                <input type="text" required value={newIp} onChange={(e) => setNewIp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500" placeholder="192.168.x.x" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">SITE / SUBSTATION</label>
                  <input type="text" required value={newSite} onChange={(e) => setNewSite(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500" placeholder="e.g., GI Taliwang" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">CATEGORY</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500">
                    <option>Feeder</option>
                    <option>Incoming</option>
                    <option>GT</option>
                    <option>KIT 20kV</option>
                    <option>Line</option>
                    <option>IBT</option>
                    <option>Misc</option>
                  </select>
                </div>
              </div>
              {formError && <div className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded border border-rose-500/20">{formError}</div>}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold">Save Device</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;