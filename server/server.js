const express = require('express');
const cors = require('cors');
const ping = require('ping');
const db = require('./database'); // Import our new database logic
const waService = require('./waService'); // <-- Add this line

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. API Route: Fetch real data from SQLite
app.get('/api/devices', async (req, res) => {
    try {
        const devices = await db.getAllDevices();
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: "Failed to load database" });
    }
});
// API Route: Get Event Logs
app.get('/api/events', async (req, res) => {
    try {
        const events = await db.getEvents();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to load events" });
    }
});
// API Route: Add a new device
app.post('/api/devices', async (req, res) => {
    const { name, ip_address, site, category } = req.body;
    if (!name || !ip_address) return res.status(400).json({ error: "Name and IP are required." });

    try {
        const newDevice = await db.addDevice(name, ip_address, site || 'Sumbawa', category || 'Meter');
        res.status(201).json(newDevice);
    } catch (error) {
        res.status(400).json({ error: "IP might already exist." });
    }
});

// API Route: Save dragged coordinates
app.put('/api/devices/:id/position', async (req, res) => {
    const { x, y } = req.body;
    try {
        await db.updatePosition(req.params.id, x, y);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save position" });
    }
});

// API Route: Bulk add devices from Excel
// API Route: Bulk add devices from Excel
app.post('/api/devices/bulk', async (req, res) => {
    const { devices } = req.body;
    
    if (!Array.isArray(devices) || devices.length === 0) {
        return res.status(400).json({ error: "No devices provided." });
    }

    let addedCount = 0;
    let errors = [];

    // Loop through the uploaded array and add each one to the database
    for (let d of devices) {
        if (!d.name || !d.ip_address) continue; // Skip invalid rows
        
        try {
            // Pass the site and category to the database function
            await db.addDevice(d.name, d.ip_address, d.site, d.category);
            addedCount++;
        } catch (err) {
            // This catches devices that already exist (duplicate IPs)
            errors.push(`Skipped ${d.ip_address} (${d.name}) - likely already exists.`);
        }
    }

    res.json({ message: `Successfully added ${addedCount} devices.`, errors });
});

// 2. The Monitoring Loop: Ping the real database IPs
// In-memory state tracker to count consecutive pings
const pingStates = {}; 
const OFFLINE_THRESHOLD = 8;
const RECOVERY_THRESHOLD = 5;

setInterval(async () => {
    try {
        const devices = await db.getAllDevices();
        
        for (let i = 0; i < devices.length; i++) {
            let device = devices[i];
            
            // Initialize state tracker for new devices
            if (!pingStates[device.id]) {
                pingStates[device.id] = { fails: 0, successes: 0 };
            }
            let state = pingStates[device.id];
            
            let res = await ping.promise.probe(device.ip_address, { timeout: 2 });
            
            if (!res.alive) {
                state.successes = 0; // Reset success count
                state.fails++;
                
                // If it fails 8 times in a row and isn't already marked offline
                if (state.fails >= OFFLINE_THRESHOLD && device.status !== 'offline') {
                    await db.updateDeviceStatus(device.id, 'offline');
                    await db.logEvent(device.id, device.status, 'offline'); // <-- ADD THIS
                    await waService.sendNotification(device, 'offline');
                    console.log(`[ALERT] ${device.name} went OFFLINE`);
                }
            } else {
                state.fails = 0; // Reset fail count
                
                // If it was offline, we need 5 successes to recover
                if (device.status === 'offline') {
                    state.successes++;
                    if (state.successes >= RECOVERY_THRESHOLD) {
                        await db.updateDeviceStatus(device.id, 'online');
                        await db.logEvent(device.id, 'offline', 'online'); // <-- ADD THIS
                        await waService.sendNotification(device, 'online');
                        console.log(`[RECOVERY] ${device.name} is back ONLINE`);
                    }
                } 
                // If it's just a new device or unknown, set it online immediately
                else if (device.status !== 'online') {
                    await db.updateDeviceStatus(device.id, 'online');
                    await db.logEvent(device.id, device.status, 'online'); // <-- ADD THIS
                    console.log(`[STATUS] ${device.name} is ONLINE`);
                }
            }
        }
    } catch (error) {
        console.error("Monitor loop error:", error);
    }
}, 5000); // 5-second interval

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
