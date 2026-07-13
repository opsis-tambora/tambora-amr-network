const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Upgraded table with Site, Category, and X/Y coordinates
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        ip_address TEXT UNIQUE,
        site TEXT DEFAULT 'Sumbawa',
        category TEXT DEFAULT 'Meter',
        status TEXT DEFAULT 'unknown',
        x_pos REAL DEFAULT 0,
        y_pos REAL DEFAULT 0
    )`);
    // Create the Events history table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        previous_status TEXT,
        current_status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

const getAllDevices = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM devices", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const updateDeviceStatus = (id, status) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE devices SET status = ? WHERE id = ?", [status, id], (err) => resolve());
    });
};

// Updated to accept site and category
const addDevice = (name, ip_address, site, category) => {
    return new Promise((resolve, reject) => {
        // Randomize initial drop position slightly so they don't stack perfectly on top of each other
        const startX = 500 + (Math.random() * 100 - 50);
        const startY = 300 + (Math.random() * 100 - 50);

        db.run(
            "INSERT INTO devices (name, ip_address, site, category, x_pos, y_pos) VALUES (?, ?, ?, ?, ?, ?)", 
            [name, ip_address, site, category, startX, startY], 
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, ip_address, site, category, status: 'unknown', x_pos: startX, y_pos: startY });
            }
        );
    });
};

// NEW: Save coordinates when a user drags a node
const updatePosition = (id, x_pos, y_pos) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE devices SET x_pos = ?, y_pos = ? WHERE id = ?", [x_pos, y_pos, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// NEW: Log a status change to the history table
const logEvent = (device_id, previous_status, current_status) => {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO events (device_id, previous_status, current_status) VALUES (?, ?, ?)", 
            [device_id, previous_status, current_status], 
            (err) => resolve() // We ignore errors here so it doesn't crash the ping loop
        );
    });
};

// NEW: Fetch the latest 100 events, joined with the device details
const getEvents = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT e.id, e.previous_status, e.current_status, e.timestamp, 
                   d.name as device_name, d.ip_address, d.site
            FROM events e
            LEFT JOIN devices d ON e.device_id = d.id
            ORDER BY e.timestamp DESC
            LIMIT 100
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = { getAllDevices, updateDeviceStatus, addDevice, updatePosition, logEvent, getEvents };