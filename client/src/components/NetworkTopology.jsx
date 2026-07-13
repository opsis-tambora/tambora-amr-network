import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Server, Activity } from 'lucide-react';

const NetworkTopology = ({ devices }) => {
  const [localDevices, setLocalDevices] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  
  // NEW: State to track the exact physical size of the user's browser window
  const [dimensions, setDimensions] = useState({ width: 1400, height: 700 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // --- DYNAMIC SCREEN MEASUREMENT ---
  // This listens to the window resizing and updates our map dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize(); // Measure on first load
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!draggingId) setLocalDevices(devices);
  }, [devices, draggingId]);

  // --- DYNAMIC SCALING LOGIC ---
  // We use your original 1400x700 design as the baseline 'blueprint'
  const REF_W = 1400;
  const REF_H = 700;
  const scaleX = dimensions.width / REF_W;
  const scaleY = dimensions.height / REF_H;

  // Your exact revised coordinates (The Blueprint)
  const BASE_SITES = {
    'GI Kertasari': { x: 70, y: 450 },
    'GI Taliwang': { x: 200, y: 450 },
    'GI Alas': { x: 220, y: 350 },
    'GI Labuhan': { x: 400, y: 350 },
    'GI Sumbawa': { x: 330, y: 290 },
    'GI Plampang': { x: 530, y: 410 },
    'GI Empang': { x: 700, y: 350 },
    'GI Dompu': { x: 950, y: 350 },
    'GI Woha': { x: 1050, y: 550 },
    'GI Bima': { x: 1150, y: 350 },
    'GI Bonto': { x: 1150, y: 200 },
    'GI Sape': { x: 1250, y: 450 }
  };

  // Multiply the blueprint by the user's screen scale
  const SITE_POSITIONS = {};
  Object.entries(BASE_SITES).forEach(([siteName, pos]) => {
    SITE_POSITIONS[siteName] = { x: pos.x * scaleX, y: pos.y * scaleY };
  });

  const GRID_LINES = [
    { from: 'GI Kertasari', to: 'GI Taliwang', type: 'double' },
    { from: 'GI Taliwang', to: 'GI Alas', type: 'double' },
    { from: 'GI Alas', to: 'GI Labuhan', type: 'double' },
    { from: 'GI Labuhan', to: 'GI Sumbawa', type: 'double' },
    { from: 'GI Labuhan', to: 'GI Empang', type: 'single' },
    { from: 'GI Labuhan', to: 'GI Plampang', type: 'single' },
    { from: 'GI Plampang', to: 'GI Empang', type: 'single' },
    { from: 'GI Empang', to: 'GI Dompu', type: 'double' },
    { from: 'GI Dompu', to: 'GI Bima', type: 'single' },
    { from: 'GI Dompu', to: 'GI Woha', type: 'single' },
    { from: 'GI Woha', to: 'GI Bima', type: 'single' },
    { from: 'GI Bima', to: 'GI Bonto', type: 'double' },
    { from: 'GI Bima', to: 'GI Sape', type: 'single' }
  ];

  // --- DRAG AND DROP LOGIC ---
  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId || !svgRef.current) return;
    
    // Get mouse position relative to the physical screen
    const CTM = svgRef.current.getScreenCTM();
    const rawX = (e.clientX - CTM.e) / CTM.a;
    const rawY = (e.clientY - CTM.f) / CTM.d;

    // Un-scale it back to the 1400x700 blueprint so the database values stay pure
    const dbX = rawX / scaleX;
    const dbY = rawY / scaleY;

    setLocalDevices(prev => prev.map(d => d.id === draggingId ? { ...d, x_pos: dbX, y_pos: dbY } : d));
  };

  const handleMouseUp = async () => {
    if (!draggingId) return;
    const draggedDevice = localDevices.find(d => d.id === draggingId);
    try {
      // Change this chunk to use a relative path
      await axios.put(`/api/devices/${draggingId}/position`, {
        x: draggedDevice.x_pos, 
        y: draggedDevice.y_pos
      });
    } catch (err) {
      console.error("Failed to save position");
    }
    setDraggingId(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#f43f5e';
      case 'recovering': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    // The container now fills 100% of available space perfectly
    <div ref={containerRef} className="w-full h-full bg-slate-950 overflow-hidden select-none">
      
      {/* viewBox dynamically updates to the exact pixel width/height of the container */}
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="block cursor-crosshair w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#334155" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* 1. DRAW THE MAIN TRANSMISSION GRID LINES */}
        {GRID_LINES.map((line, idx) => {
          const start = SITE_POSITIONS[line.from];
          const end = SITE_POSITIONS[line.to];
          if (!start || !end) return null;

          return (
            <g key={`grid-line-${idx}`}>
              {line.type === 'double' ? (
                <>
                  <line x1={start.x} y1={start.y - 4} x2={end.x} y2={end.y - 4} stroke="#475569" strokeWidth="2" opacity="0.6" />
                  <line x1={start.x} y1={start.y + 4} x2={end.x} y2={end.y + 4} stroke="#475569" strokeWidth="2" opacity="0.6" />
                </>
              ) : (
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#475569" strokeWidth="2" opacity="0.6" />
              )}
            </g>
          );
        })}

        {/* 2. DRAW LINES: Substations -> Draggable Devices */}
        {localDevices.map(device => {
          const sitePos = SITE_POSITIONS[device.site] || SITE_POSITIONS['GI Labuhan'];
          const color = getStatusColor(device.status);
          const isOffline = device.status === 'offline';

          // Scale the device coordinates for rendering ONLY
          const scaledDeviceX = device.x_pos * scaleX;
          const scaledDeviceY = device.y_pos * scaleY;

          return (
            <g key={`edge-${device.id}`}>
              <line 
                x1={sitePos.x} y1={sitePos.y} 
                x2={scaledDeviceX} y2={scaledDeviceY} 
                stroke={color} strokeWidth={isOffline ? 1 : 1.5} strokeDasharray="4,4" opacity={isOffline ? 0.3 : 0.7}
              />
              {!isOffline && (
                <circle r="2.5" fill={color}>
                  <animateMotion dur="2s" repeatCount="indefinite" path={`M ${sitePos.x} ${sitePos.y} L ${scaledDeviceX} ${scaledDeviceY}`} />
                </circle>
              )}
            </g>
          );
        })}

        {/* 3. RENDER SUBSTATION HUBS */}
        {Object.entries(SITE_POSITIONS).map(([siteName, pos]) => (
          <g key={`hub-${siteName}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
            <rect x="-40" y="16" width="80" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text y="29" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{siteName}</text>
          </g>
        ))}

        {/* 4. RENDER DRAGGABLE METERS */}
        {localDevices.map(device => {
          const color = getStatusColor(device.status);
          const isOffline = device.status === 'offline';
          
          // Scale the device coordinates for rendering ONLY
          const scaledDeviceX = device.x_pos * scaleX;
          const scaledDeviceY = device.y_pos * scaleY;

          return (
            <g 
              key={`node-${device.id}`} 
              transform={`translate(${scaledDeviceX}, ${scaledDeviceY})`}
              onMouseDown={(e) => handleMouseDown(e, device.id)}
              style={{ cursor: draggingId === device.id ? 'grabbing' : 'grab' }}
            >
              {isOffline && (
                <circle r="20" fill={color} opacity="0.2">
                  <animate attributeName="r" values="15;35;15" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r="10" fill="#0f172a" stroke={color} strokeWidth="2" />
              
              <foreignObject x="-50" y="12" width="100" height="40" style={{ pointerEvents: 'none' }}>
                <div className="flex flex-col items-center bg-slate-900/90 rounded border border-slate-700/80 px-1 py-0.5 shadow-lg backdrop-blur-sm">
                  <span className="text-[8px] font-bold text-slate-300 truncate w-full text-center">{device.name}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color }}>{device.ip_address}</span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default NetworkTopology;