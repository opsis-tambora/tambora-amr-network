import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, Zap, Cpu, Settings, ChevronLeft, Sun, Moon, ChevronDown, Lock, Mail, LogOut, List, BarChart3, CalendarDays, Receipt, FileText, Menu } from 'lucide-react';

// IMPORT KOMPONEN
import SusutTambora from './components/SusutTambora';
import IpMeterView from './components/IpMeterView';
import SettingsPage from './components/Settings';
import StatusKwhMeter from './components/StatusKwhMeter';
import SusutSubSistem from './components/SusutSubSistem';
import SusutBulanan from './components/SusutBulanan';
import BillingKwh from './components/BillingKwh';
import AnalisaSusutHarian from './components/AnalisaSusutHarian'; 
import SusutHarian from './components/SusutHarian'; 

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', role: 'User' });

  // STATE DATA GLOBAL
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // STATE UI GLOBAL
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Search query state dipertahankan agar tidak merusak filter (meskipun input visualnya dihapus)
  const [searchQuery] = useState(''); 
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // STATE TEMA PERSISTEN
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    return true; 
  });

  // MENU STATES
  const [isSusutMenuOpen, setIsSusutMenuOpen] = useState(true);
  const [isKwhMenuOpen, setIsKwhMenuOpen] = useState(true);
  const [isBillingMenuOpen, setIsBillingMenuOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (location.pathname.includes('/Susut') || location.pathname.includes('/Analisa') || location.pathname.includes('/Rekapan')) setIsSusutMenuOpen(true);
    if (location.pathname.includes('/kWh') || location.pathname.includes('/Status')) setIsKwhMenuOpen(true);
    if (location.pathname.includes('/Billing')) setIsBillingMenuOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true; 
    let timerId;

    const pollData = async () => {
      if (!isMounted) return;
      try {
        const [devicesRes, eventsRes] = await Promise.all([
          axios.get('/api/devices'),
          axios.get('/api/events')
        ]);
        if (isMounted) setDevices(devicesRes.data);
        if (isMounted && eventsRes.data) {
          const mappedLogs = eventsRes.data.map(e => {
            const utcDate = e.timestamp.endsWith('Z') ? e.timestamp : e.timestamp + 'Z';
            let formattedOfflineTime = null;
            if (e.offline_timestamp) {
              const offlineUtc = e.offline_timestamp.endsWith('Z') ? e.offline_timestamp : e.offline_timestamp + 'Z';
              formattedOfflineTime = new Date(offlineUtc).toLocaleString('id-ID');
            }
            return {
              raw_timestamp: new Date(utcDate).getTime(),
              timestamp: new Date(utcDate).toLocaleString('id-ID'),
              name: e.device_name || 'Unknown Device',
              ip: e.ip_address || '-',
              site: e.site || '-',
              from: e.previous_status ? e.previous_status.toUpperCase().trim() : 'UNKNOWN',
              to: e.current_status ? e.current_status.toUpperCase().trim() : 'UNKNOWN',
              offline_timestamp: formattedOfflineTime,
              duration_text: e.duration_text || null
            };
          });
          setLogs(mappedLogs);
        }
      } catch (error) {
        console.error("Gagal menarik data pemantauan:", error);
      } finally {
        if (isMounted) timerId = setTimeout(pollData, 10000); 
      }
    };
    if (isLoggedIn) pollData();
    return () => { isMounted = false; if (timerId) clearTimeout(timerId); };
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await axios.post('/api/login', { email, password });
      if (response.data.success && response.data.user) {
        setIsLoggedIn(true);
        setCurrentUser({ name: response.data.user.name, role: response.data.user.role });
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      } else {
        setLoginError('Username atau Password salah!');
      }
    } catch (err) {
      setLoginError('Username atau Password salah!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setCurrentUser({ name: 'Guest', role: 'User' });
    setIsProfileOpen(false);
    localStorage.removeItem('currentUser');
  };

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.ip_address.includes(searchQuery) ||
    d.site.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkActiveMenu = (path) => location.pathname === path;

  const getSubMenuClass = (path) => {
    const isActive = checkActiveMenu(path);
    if (isActive) {
      return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white shadow-md ml-2`;
    }
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ml-2 ${darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-slate-950 font-sans flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl">
              <Zap className="w-8 h-8 fill-blue-500/10" />
            </div>
            <h2 className="text-2xl font-bold tracking-wider uppercase mt-2">TAMBORA SYSTEM</h2>
            <p className="text-xs text-slate-400">CENTRALIZED METER DASHBOARD MONITOR</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
              <div className="relative flex items-center">
                <input type="text" required placeholder="Masukkan Username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
              </div>
            </div>
            {loginError && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg font-medium">{loginError}</div>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-blue-600/10 mt-2">
              Sign In
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-500">Hubungi PIC <b>TTL OPS 2</b> untuk Akses Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    // PERBAIKAN: Root dibatasi h-screen dan overflow-hidden agar tidak ada scroll utama
    <div className={`h-screen w-full font-sans select-none overflow-hidden transition-colors duration-200 flex flex-row ${darkMode ? 'bg-slate-950 text-white dark-mode-wrap' : 'bg-slate-50 text-slate-900 light-mode-wrap'}`}>
      
      {/* CSS CUSTOM SCROLLBAR HOVER */}
      <style>
        {`
          .custom-scroll {
            overflow-y: auto;
          }
          .custom-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scroll::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 10px;
            transition: background-color 0.3s;
          }
          .group:hover .custom-scroll::-webkit-scrollbar-thumb,
          .custom-scroll:hover::-webkit-scrollbar-thumb {
            background-color: rgba(148, 163, 184, 0.3); 
          }
          .group:hover .custom-scroll::-webkit-scrollbar-thumb:hover,
          .custom-scroll:hover::-webkit-scrollbar-thumb:hover {
            background-color: rgba(148, 163, 184, 0.6); 
          }
        `}
      </style>

      {/* SIDEBAR NAVIGATION (h-full mengambil layar penuh) */}
      <div className={`group border-r flex flex-col transition-all duration-300 print:hidden h-full ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'} ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* HEADER SIDEBAR (Dikunci h-[72px] & shrink-0 agar lurus persis dengan Topbar) */}
        <div className={`h-[72px] shrink-0 box-border px-5 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            <span className="font-bold tracking-wider text-xl uppercase">TTL OPS 2</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* CONTAINER MENU */}
        <div className="flex-1 p-4 flex flex-col gap-2 custom-scroll pb-10">
          <p className="text-[10px] font-bold text-slate-500 px-3 mb-1 uppercase tracking-widest">Main Menu</p>
          
          {/* MENU 1: SUSUT SISTEM */}
          <div className="flex flex-col gap-1">
            <button onClick={() => setIsSusutMenuOpen(!isSusutMenuOpen)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3"><Activity className="w-4 h-4" /><span>Susut Sistem</span></div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSusutMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 ${isSusutMenuOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className={`border-l-2 ml-4 flex flex-col gap-1 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button onClick={() => navigate('/Susut-Harian')} className={getSubMenuClass('/Susut-Harian')}><Activity className="w-4 h-4" /> Susut Harian</button>
                <button onClick={() => navigate('/Analisa-Susut')} className={getSubMenuClass('/Analisa-Susut')}><FileText className="w-4 h-4" /> Analisa Susut</button>
                <button onClick={() => navigate('/Susut-Sub-Sistem')} className={getSubMenuClass('/Susut-Sub-Sistem')}><BarChart3 className="w-4 h-4" /> Susut Sub Sistem</button>
                <button onClick={() => navigate('/Susut-Bulanan')} className={getSubMenuClass('/Susut-Bulanan')}><CalendarDays className="w-4 h-4" /> Susut Bulanan</button>
                <button onClick={() => navigate('/Rekapan-Susut')} className={getSubMenuClass('/Rekapan-Susut')}><List className="w-4 h-4" /> Rekapan Susut</button>
              </div>
            </div>
          </div>

          {/* MENU 2: KWH METER */}
          <div className="flex flex-col gap-1 mt-1">
            <button onClick={() => setIsKwhMenuOpen(!isKwhMenuOpen)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3"><Cpu className="w-4 h-4" /><span>Monitoring kWh</span></div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isKwhMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 ${isKwhMenuOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className={`border-l-2 ml-4 flex flex-col gap-1 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button onClick={() => navigate('/kWh-Meter')} className={getSubMenuClass('/kWh-Meter')}><Cpu className="w-4 h-4" /> Monitoring kWh</button>
                <button onClick={() => navigate('/Status-kWh')} className={getSubMenuClass('/Status-kWh')}><List className="w-4 h-4" /> Status kWh</button>
              </div>
            </div>
          </div>

          {/* MENU 3: BILLING KWH */}
          <div className="flex flex-col gap-1 mt-1">
            <button onClick={() => setIsBillingMenuOpen(!isBillingMenuOpen)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3"><Receipt className="w-4 h-4" /><span>Billing kWh</span></div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBillingMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 ${isBillingMenuOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className={`border-l-2 ml-4 flex flex-col gap-1 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button onClick={() => navigate('/Billing/Harian')} className={getSubMenuClass('/Billing/Harian')}><FileText className="w-4 h-4" /> Billing Data</button>
                <button onClick={() => navigate('/Billing/01')} className={getSubMenuClass('/Billing/01')}><FileText className="w-4 h-4" /> Billing Tanggal 1</button>
                <button onClick={() => navigate('/Billing/25')} className={getSubMenuClass('/Billing/25')}><FileText className="w-4 h-4" /> Billing Tanggal 25</button>
              </div>
            </div>
          </div>
          
          {/* MENU 4: SETTINGS */}
          <div className="mt-1">
            <button onClick={() => navigate('/Settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Settings') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* HEADER TOPBAR (Dikunci h-[72px] & shrink-0 agar lurus dengan Sidebar) */}
        <div className={`h-[72px] shrink-0 box-border w-full flex justify-between items-center px-4 md:px-8 border-b z-30 print:hidden ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-6 flex-1">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className={`p-2 border rounded-lg transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'}`}>
                <Menu className="w-4 h-4" />
              </button>
            )}
            {checkActiveMenu('/Settings') && <h1 className="text-lg font-bold tracking-wider uppercase hidden lg:block">Settings</h1>}
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg border transition-all ${darkMode ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative">
              <div onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 cursor-pointer group select-none">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="User Avatar" className="w-8 h-8 rounded-full border border-blue-500 object-cover" />
                <div className="hidden sm:flex flex-col text-left">
                  <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-black'}`}>{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{currentUser.role}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              {isProfileOpen && (
                <div className={`absolute right-0 mt-3 w-40 rounded-xl border p-1 shadow-2xl flex flex-col z-50 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                  <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 text-left w-full transition-all">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AREA KONTEN (ROUTER) dengan Scrollbar Mandiri */}
        <div className="w-full flex-1 overflow-y-auto p-4 md:p-8 flex flex-col custom-scroll">
          <Routes>
            <Route path="/" element={<Navigate to="/kWh-Meter" replace />} />
            
            <Route path="/Susut-Harian" element={<div className="w-full"><SusutHarian darkMode={darkMode} /></div>} />
            <Route path="/Analisa-Susut" element={<div className="w-full"><SusutTambora darkMode={darkMode} /></div>} />
            
            <Route path="/Rekapan-Susut" element={<div className="mt-6 w-full"><AnalisaSusutHarian darkMode={darkMode} /></div>} />
            <Route path="/Susut-Sub-Sistem" element={<div className="mt-6 w-full"><SusutSubSistem darkMode={darkMode} /></div>} />
            <Route path="/Susut-Bulanan" element={<div className="mt-6 w-full"><SusutBulanan darkMode={darkMode} /></div>} />

            <Route path="/Settings" element={<div className="mt-6 w-full"><SettingsPage darkMode={darkMode} /></div>} />
            <Route path="/Status-kWh" element={<div className="mt-6 w-full"><StatusKwhMeter devices={devices} darkMode={darkMode} /></div>} />
            
            <Route path="/Billing/Harian" element={<div className="mt-6 w-full"><BillingKwh darkMode={darkMode} tanggal="Harian" /></div>} />
            <Route path="/Billing/01" element={<div className="mt-6 w-full"><BillingKwh darkMode={darkMode} tanggal="01" /></div>} />
            <Route path="/Billing/25" element={<div className="mt-6 w-full"><BillingKwh darkMode={darkMode} tanggal="25" /></div>} />

            <Route path="/kWh-Meter" element={
              <IpMeterView 
                devices={devices} 
                filteredDevices={filteredDevices} 
                logs={logs} 
                darkMode={darkMode} 
              />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}