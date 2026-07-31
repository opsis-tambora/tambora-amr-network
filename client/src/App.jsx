import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, Zap, Cpu, Settings, Clock, ArrowRight, Menu, ChevronLeft, Search, Sun, Moon, ChevronDown, Lock, Mail, LogOut, List, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, CalendarDays } from 'lucide-react';
import SusutTambora from './components/SusutTambora';
import IpMeterView from './components/IpMeterView';
import SettingsPage from './components/Settings';
import StatusKwhMeter from './components/StatusKwhMeter';
import SusutSubSistem from './components/SusutSubSistem';
import SusutBulanan from './components/SusutBulanan'; // Import Komponen Baru

// Komponen Utama yang dibungkus oleh Router
function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATE AUTENTIKASI ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', role: 'User' });

  // --- STATE DASHBOARD UTAMA ---
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- STATE TABLE EVENT HISTORY ---
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSortConfig, setLogSortConfig] = useState({ key: 'raw_timestamp', direction: 'desc' });

  // --- LOGIKA METER HEALTH ---
  const activeMeters = devices.filter(d => d.status === 'online').length;
  const totalMeters = devices.length;
  const offlineMeters = totalMeters - activeMeters;
  const healthPercentage = totalMeters > 0 ? Math.round((activeMeters / totalMeters) * 100) : 0;

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // --- METODE RECURSIVE POLLING ---
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
        if (isMounted) {
          timerId = setTimeout(pollData, 10000); 
        }
      }
    };

    if (isLoggedIn) {
      pollData();
    }

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await axios.post('/api/login', { email, password });
      if (response.data.success && response.data.user) {
        setIsLoggedIn(true);
        setCurrentUser({
          name: response.data.user.name,
          role: response.data.user.role
        });
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

  let processedLogs = [...logs];
  if (logSearchQuery) {
    const q = logSearchQuery.toLowerCase();
    processedLogs = processedLogs.filter(log =>
      log.name.toLowerCase().includes(q) ||
      log.site.toLowerCase().includes(q) ||
      log.from.toLowerCase().includes(q) ||
      log.to.toLowerCase().includes(q)
    );
  }

  processedLogs.sort((a, b) => {
    if (a[logSortConfig.key] < b[logSortConfig.key]) {
      return logSortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[logSortConfig.key] > b[logSortConfig.key]) {
      return logSortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (logSortConfig.key === key && logSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setLogSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (logSortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return logSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = processedLogs.slice(indexOfFirstLog, indexOfLastLog);

  const checkActiveMenu = (path) => location.pathname === path;

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
    <div className={`min-h-screen w-full font-sans select-none overflow-x-hidden transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`} style={{ display: 'flex', flexDirection: 'row' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div className={`border-r flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'} ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={{ minHeight: '100vh', sticky: 'top', position: 'sticky' }}>
        <div className={`p-5 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            <span className="font-bold tracking-wider text-xl uppercase">TTL OPS 2</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold text-slate-500 px-3 mb-2 uppercase tracking-widest">Main Menu</p>
          
          <button onClick={() => navigate('/Susut-Harian')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Susut-Harian') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <Activity className="w-4 h-4" /> Susut Harian
          </button>

          <button onClick={() => navigate('/Susut-Sub-Sistem')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Susut-Sub-Sistem') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <BarChart3 className="w-4 h-4" /> Susut Sub Sistem
          </button>

          <button onClick={() => navigate('/Susut-Bulanan')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Susut-Bulanan') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <CalendarDays className="w-4 h-4" /> Susut Bulanan
          </button>
          
          <button onClick={() => navigate('/kWh-Meter')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/kWh-Meter') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <Cpu className="w-4 h-4" /> kWh Meter
          </button>
          
          <button onClick={() => navigate('/Status-kWh')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Status-kWh') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <List className="w-4 h-4" /> Status kWh
          </button>
          
          <button onClick={() => navigate('/Settings')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${checkActiveMenu('/Settings') ? 'bg-blue-600 text-white shadow-md' : darkMode ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* DASHBOARD CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Dashboard */}
        <div className={`w-full flex justify-between items-center p-4 md:px-8 border-b sticky top-0 z-30 backdrop-blur-sm ${darkMode ? 'border-slate-900 bg-slate-950/80' : 'border-slate-200 bg-white/80'}`}>
          <div className="flex items-center gap-6 flex-1">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className={`p-2 border rounded-lg transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'}`}>
                <Menu className="w-4 h-4" />
              </button>
            )}
            
            {checkActiveMenu('/Settings') && (
              <h1 className="text-lg font-bold tracking-wider uppercase hidden lg:block">Settings</h1>
            )}

            <div className="relative max-w-md w-full flex items-center">
              <input type="text" placeholder="Search Data..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-4 pr-10 py-2 text-sm rounded-lg border focus:outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-slate-300'}`} />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
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
                <div className={`absolute right-0 mt-3 w-40 rounded-xl border p-1 shadow-2xl flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                  <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 text-left w-full transition-all">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AREA KONTEN (ROUTER) */}
        <div className="w-full flex-1 p-4 md:p-8 md:pt-0 pt-0 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/kWh-Meter" replace />} />
            
            <Route path="/Susut-Harian" element={<SusutTambora />} />
            
            <Route path="/Susut-Sub-Sistem" element={
              <div className="mt-6 w-full">
                <SusutSubSistem darkMode={darkMode} />
              </div>
            } />
            
            {/* Rute Baru Susut Bulanan */}
            <Route path="/Susut-Bulanan" element={
              <div className="mt-6 w-full">
                <SusutBulanan darkMode={darkMode} />
              </div>
            } />

            <Route path="/Settings" element={<SettingsPage />} />
            
            <Route path="/Status-kWh" element={
              <div className="mt-6 w-full">
                <StatusKwhMeter devices={devices} darkMode={darkMode} />
              </div>
            } />

            <Route path="/kWh-Meter" element={
              <div className="flex flex-col gap-6 h-full w-full mt-6">
                <div className="grid grid-cols-12 gap-6 h-[460px] min-h-[460px]">
                  <div className="col-span-9 h-full">
                    <IpMeterView devices={filteredDevices} />
                  </div>
                  <div className={`col-span-3 h-full border rounded-xl p-5 shadow-xl flex flex-col justify-between ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                      <h2 className="text-base font-bold text-center uppercase tracking-wider">STATUS METER</h2>
                      <div className="relative flex flex-col items-center justify-center my-10">
                        <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'} strokeWidth="8" fill="transparent" />
                          <circle cx="50" cy="50" r="40" className="stroke-emerald-500 transition-all duration-500 ease-out" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * healthPercentage) / 100} strokeLinecap="round" />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-4xl font-extrabold">{healthPercentage}%</span>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ONLINE</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className={`border rounded-xl px-4 py-2.5 flex justify-between items-center ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ONLINE
                        </span>
                        <span className="text-xs font-bold">{activeMeters}</span>
                      </div>
                      <div className={`border rounded-xl px-4 py-2.5 flex justify-between items-center ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> OFFLINE
                        </span>
                        <span className="text-xs font-bold">{offlineMeters}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EVENT HISTORY TABLE */}
                <div className={`border rounded-xl p-5 shadow-xl flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <h2 className="text-base font-bold whitespace-nowrap">System Event History</h2>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                      
                      <div className={`flex items-center gap-2 text-xs font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>Show</span>
                        <select
                          value={logsPerPage}
                          onChange={(e) => {
                            setLogsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className={`border rounded-md px-2 py-1.5 focus:outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                        >
                          <option value={5}>5</option>
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
                          placeholder="Search Device, Site, Status..."
                          value={logSearchQuery}
                          onChange={(e) => {
                            setLogSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
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
                          
                          <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500 transition-colors" onClick={() => handleSort('raw_timestamp')}>
                            <div className="flex items-center gap-1">Timestamp {renderSortIcon('raw_timestamp')}</div>
                          </th>
                          <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500 transition-colors" onClick={() => handleSort('name')}>
                            <div className="flex items-center gap-1">Device {renderSortIcon('name')}</div>
                          </th>
                          <th className="pb-3 pt-1 cursor-pointer select-none hover:text-blue-500 transition-colors" onClick={() => handleSort('site')}>
                            <div className="flex items-center gap-1">Site {renderSortIcon('site')}</div>
                          </th>
                          <th className="pb-3 pt-1 cursor-pointer select-none text-center hover:text-blue-500 transition-colors" onClick={() => handleSort('to')}>
                            <div className="flex items-center justify-center gap-1">Status Change {renderSortIcon('to')}</div>
                          </th>

                        </tr>
                      </thead>
                      <tbody className={`divide-y text-xs ${darkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                        {currentLogs.map((log, index) => {
                          const isRecovery = log.from === 'OFFLINE' && log.to === 'ONLINE';
                          return (
                            <tr key={index} className={darkMode ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'}>
                              <td className="py-3 font-mono">
                                {isRecovery ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="text-rose-400 text-[11px] font-semibold">{log.offline_timestamp ? log.offline_timestamp : 'Menunggu DB...'} (Time Offline)</div>
                                    <div className="text-emerald-400 text-[11px] font-semibold">{log.timestamp} (Time Online)</div>
                                    <div className="text-amber-400 font-bold text-[11px] mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">Duration: {log.duration_text || '00.00.00'}</div>
                                  </div>
                                ) : (
                                  <div className="text-slate-400">{log.timestamp}</div>
                                )}
                              </td>
                              <td className="py-3">
                                <div className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.ip}</div>
                              </td>
                              <td className="py-3 font-medium text-slate-400">{log.site}</td>
                              <td className="py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${log.from === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}><span className={`w-1 h-1 rounded-full ${log.from === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> {log.from}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${log.to === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}><span className={`w-1 h-1 rounded-full ${log.to === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> {log.to}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {currentLogs.length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-6 text-center text-slate-500 font-medium">Tidak ada data ditemukan.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
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