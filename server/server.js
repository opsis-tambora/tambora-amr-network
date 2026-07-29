const express = require('express');
const cors = require('cors');
const ping = require('ping');
const db = require('./database'); 
const waService = require('./waService'); 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. API ROUTES: AUTENTIKASI USER (user_auth.sqlite)
// ==========================================

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.validateUser(email, password);
        if (user) {
            res.json({ success: true, message: 'Login berhasil', user });
        } else {
            res.status(401).json({ success: false, error: 'Email atau Password salah!' });
        }
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan pada database user." });
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
    }
    const allowedRoles = ['Admin', 'User'];
    const finalRole = allowedRoles.includes(role) ? role : 'User';

    try {
        const newUser = await db.createUser(name, email, password, finalRole);
        res.status(201).json({ success: true, message: "User baru berhasil dibuat!", user: newUser });
    } catch (error) {
        res.status(400).json({ error: "Email sudah terdaftar atau terjadi kesalahan database." });
    }
});

app.put('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    const { name, password, role } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Nama dan password wajib diisi untuk pembaruan." });
    }

    const allowedRoles = ['Admin', 'User'];
    const finalRole = allowedRoles.includes(role) ? role : 'User';

    const path = require('path');
    const dbUserPath = path.resolve(__dirname, 'user_auth.sqlite');
    const sqlite3 = require('sqlite3').verbose();
    const dbUser = new sqlite3.Database(dbUserPath);

    dbUser.run(
        `UPDATE users SET name = ?, password = ?, role = ? WHERE email = ?`,
        [name, password, finalRole, username],
        function(err) {
            dbUser.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Username tidak ditemukan" });
            res.json({ success: true, message: `User ${username} berhasil diperbarui` });
        }
    );
});

app.delete('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    const path = require('path');
    const dbUserPath = path.resolve(__dirname, 'user_auth.sqlite');
    const sqlite3 = require('sqlite3').verbose();
    const dbUser = new sqlite3.Database(dbUserPath);

    dbUser.run(`DELETE FROM users WHERE email = ?`, [username], function(err) {
        dbUser.close();
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Username tidak ditemukan" });
        res.json({ success: true, message: `User ${username} berhasil dihapus` });
    });
});


// ==========================================
// 2. API ROUTES: MONITORING DEVICES (database.sqlite)
// ==========================================

app.get('/api/devices', async (req, res) => {
    try {
        const devices = await db.getAllDevices();
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: "Failed to load database" });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const events = await db.getEvents();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to load events" });
    }
});

app.post('/api/devices', async (req, res) => {
    const { name, site, serial_number, ip_address, category } = req.body;
    
    if (!name || !serial_number || !ip_address) {
        return res.status(400).json({ error: "Nama, Serial Number, dan IP wajib diisi." });
    }

    try {
        const newDevice = await db.addDevice(
            name, 
            site || 'Sumbawa', 
            serial_number, 
            ip_address, 
            category || 'Meter'
        );
        res.status(201).json(newDevice);
    } catch (error) {
        res.status(400).json({ error: "Gagal menyimpan. Serial Number mungkin sudah terdaftar." });
    }
});

app.put('/api/devices/:id/position', async (req, res) => {
    const { x, y } = req.body;
    try {
        await db.updatePosition(req.params.id, x, y);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save position" });
    }
});

app.post('/api/devices/bulk', async (req, res) => {
    const { devices } = req.body;
    
    if (!Array.isArray(devices) || devices.length === 0) {
        return res.status(400).json({ error: "No devices provided." });
    }

    let addedCount = 0;
    let errors = [];

    for (let d of devices) {
        if (!d.name || !d.serial_number || !d.ip_address) continue; 
        try {
            await db.addDevice(d.name, d.site || 'Sumbawa', d.serial_number, d.ip_address, d.category || 'Meter');
            addedCount++;
        } catch (err) {
            errors.push(`Skipped SN: ${d.serial_number} (${d.name}) - likely already exists.`);
        }
    }

    res.json({ message: `Successfully added ${addedCount} devices.`, errors });
});

// WHATSAPP RECIPIENT ROUTES
app.get('/api/recipients', async (req, res) => {
    try {
        const recipients = await db.getRecipients();
        res.json(recipients);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch recipients" });
    }
});

app.post('/api/recipients', async (req, res) => {
    const { name, phone, type } = req.body; 
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });
    try {
        const newRecipient = await db.addRecipient(name, phone, type || 'individual');
        res.status(201).json(newRecipient);
    } catch (error) {
        res.status(400).json({ error: "Phone number already exists" });
    }
});

app.delete('/api/recipients/:id', async (req, res) => {
    try {
        await db.deleteRecipient(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete recipient" });
    }
});


// ==========================================
// 3. THE MONITORING LOOP (PING SYSTEM OPTIMIZED)
// ==========================================
const pingStates = {}; 
const OFFLINE_THRESHOLD = 8;
const RECOVERY_THRESHOLD = 5;

// Tambahkan variabel pengunci (lock)
let isMonitoring = false; 

const startMonitoring = async () => {
    if (isMonitoring) return;
    isMonitoring = true;
    
    try {
        const devices = await db.getAllDevices();
        
        const devicesByIp = {};
        devices.forEach(d => {
            if (!devicesByIp[d.ip_address]) devicesByIp[d.ip_address] = [];
            devicesByIp[d.ip_address].push(d);
        });

        for (const ip in devicesByIp) {
            const groupedDevices = devicesByIp[ip];
            let res = await ping.promise.probe(ip, { timeout: 2 });
            
            // PENGUNCI WA: Agar IP yang sama tidak mengirim pesan berulang-ulang
            let waOfflineSentForThisIP = false;
            let waOnlineSentForThisIP = false;
            
            for (let device of groupedDevices) {
                if (!pingStates[device.id]) {
                    pingStates[device.id] = { 
                        fails: 0, 
                        successes: 0,
                        lockedStatus: device.status,
                        offlineTime: null 
                    };
                }
                let state = pingStates[device.id];
                
                if (!res.alive) {
                    state.successes = 0; 
                    state.fails++;
                    
                    if (state.fails >= OFFLINE_THRESHOLD && state.lockedStatus !== 'offline') {
                        state.lockedStatus = 'offline';
                        state.offlineTime = Date.now(); 
                        
                        await db.updateDeviceStatus(device.id, 'offline');
                        await db.logEvent(device.id, 'online', 'offline'); 
                        
                        // Cek apakah notifikasi offline untuk IP ini sudah dikirim
                        if (!waOfflineSentForThisIP) {
                            await waService.sendNotification(device, 'offline');
                            waOfflineSentForThisIP = true; // Kunci agar device selanjutnya di IP ini tidak kirim WA
                        }
                        console.log(`[ALERT] ${device.name} (SN: ${device.serial_number}) went OFFLINE`);
                    }
                } else {
                    state.fails = 0; 
                    
                    if (state.lockedStatus === 'offline') {
                        state.successes++;
                        if (state.successes >= RECOVERY_THRESHOLD) {
                            state.lockedStatus = 'online';
                            
                            await db.updateDeviceStatus(device.id, 'online');
                            await db.logEvent(device.id, 'offline', 'online'); 
                            
                            // Cek apakah notifikasi online untuk IP ini sudah dikirim
                            if (!waOnlineSentForThisIP) {
                                await waService.sendNotification(device, 'online', state.offlineTime);
                                waOnlineSentForThisIP = true; // Kunci agar device selanjutnya di IP ini tidak kirim WA
                            }
                            state.offlineTime = null; 
                            
                            console.log(`[RECOVERY] ${device.name} (SN: ${device.serial_number}) is back ONLINE`);
                        }
                    } 
                    else if (state.lockedStatus !== 'online') {
                        state.lockedStatus = 'online';
                        await db.updateDeviceStatus(device.id, 'online');
                        await db.logEvent(device.id, 'unknown', 'online');
                        console.log(`[STATUS] ${device.name} (SN: ${device.serial_number}) is ONLINE`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Monitor loop error:", error);
    } finally {
        isMonitoring = false;
        setTimeout(startMonitoring, 2500); 
    }
};

// Mulai putaran pertama
startMonitoring();

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});