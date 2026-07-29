const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. KONEKSI UTAMA: Data IP kWh Meter
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 2. KONEKSI BARU: Khusus untuk Data User Login
const dbUserPath = path.resolve(__dirname, 'user_auth.sqlite');
const dbUser = new sqlite3.Database(dbUserPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        site TEXT DEFAULT 'Sumbawa',
        serial_number TEXT UNIQUE,
        ip_address TEXT,
        category TEXT DEFAULT 'Meter',
        status TEXT DEFAULT 'unknown',
        x_pos REAL DEFAULT 0,
        y_pos REAL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        previous_status TEXT,
        current_status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT UNIQUE,
        type TEXT DEFAULT 'individual'
    )`);
});

dbUser.serialize(() => {
    dbUser.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'User'
    )`, () => {
        dbUser.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Admin Utama', 'admin', 'admin123', 'Admin')`);
        dbUser.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Operator Baru', 'operator', 'password123', 'User')`);
    });
});

const validateUser = (usernameInput, passwordInput) => {
    return new Promise((resolve, reject) => {
        if (!usernameInput || !passwordInput) return resolve(null);
        dbUser.run("DELETE FROM users WHERE email = '' OR email IS NULL");
        const query = "SELECT name, email, role FROM users WHERE email != '' AND LOWER(email) = LOWER(?) AND password = ?";
        dbUser.get(query, [usernameInput, passwordInput], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const createUser = (name, email, password, role) => {
    return new Promise((resolve, reject) => {
        const query = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
        dbUser.run(query, [name, email, password, role || 'User'], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, name, email, role });
        });
    });
};

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

const addDevice = (name, site, serial_number, ip_address, category) => {
    return new Promise((resolve, reject) => {
        const startX = 500 + (Math.random() * 100 - 50);
        const startY = 300 + (Math.random() * 100 - 50);
        db.run(
            "INSERT INTO devices (name, site, serial_number, ip_address, category, x_pos, y_pos) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, site, serial_number, ip_address, category, startX, startY],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, site, serial_number, ip_address, category, status: 'unknown', x_pos: startX, y_pos: startY });
            }
        );
    });
};

const updatePosition = (id, x_pos, y_pos) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE devices SET x_pos = ?, y_pos = ? WHERE id = ?", [x_pos, y_pos, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const logEvent = (device_id, previous_status, current_status) => {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO events (device_id, previous_status, current_status) VALUES (?, ?, ?)",
            [device_id, previous_status, current_status],
            (err) => resolve()
        );
    });
};

const getEvents = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT e.id, e.previous_status, e.current_status, e.timestamp,
                   d.name as device_name, d.ip_address, d.site, d.serial_number,
                   CASE
                       WHEN e.previous_status = 'offline' AND e.current_status = 'online' THEN
                           (SELECT timestamp FROM events e2
                            WHERE e2.device_id = e.device_id
                              AND e2.current_status = 'offline'
                              AND e2.timestamp < e.timestamp
                            ORDER BY e2.timestamp DESC LIMIT 1)
                       ELSE NULL
                   END as offline_timestamp,
                   CASE
                       WHEN e.previous_status = 'offline' AND e.current_status = 'online' THEN
                           strftime('%s', e.timestamp) - strftime('%s', (
                               SELECT timestamp FROM events e2
                               WHERE e2.device_id = e.device_id
                                 AND e2.current_status = 'offline'
                                 AND e2.timestamp < e.timestamp
                               ORDER BY e2.timestamp DESC LIMIT 1
                           ))
                       ELSE NULL
                   END as downtime_seconds
            FROM events e
            LEFT JOIN devices d ON e.device_id = d.id
            ORDER BY e.timestamp DESC
            LIMIT 100
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else {
                const formattedRows = rows.map(row => {
                    if (row.downtime_seconds != null) {
                        const total = Math.max(0, row.downtime_seconds);
                        const h = String(Math.floor(total / 3600)).padStart(2, '0');
                        const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
                        const s = String(total % 60).padStart(2, '0');
                        row.duration_text = `${h}.${m}.${s}`;
                    }
                    return row;
                });
                resolve(formattedRows);
            }
        });
    });
};

const getRecipients = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM recipients", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const addRecipient = (name, phone, type) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO recipients (name, phone, type) VALUES (?, ?, ?)", [name, phone, type], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, name, phone, type });
        });
    });
};

const deleteRecipient = (id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM recipients WHERE id = ?", [id], (err) => resolve());
    });
};

module.exports = {
    getAllDevices, updateDeviceStatus, addDevice, updatePosition,
    logEvent, getEvents,
    getRecipients, addRecipient, deleteRecipient,
    validateUser, createUser
};