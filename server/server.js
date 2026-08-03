const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/public')));

// --- KONEKSI DATABASE UTAMA ---
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Gagal terhubung ke database utama:', err.message);
  } else {
    console.log('Berhasil terhubung ke database utama SQLite Tambora.');
    
    // --- KONFIGURASI MENCEGAH DATABASE LOCKED ---
    // Memberikan waktu tunggu (timeout) 10 detik jika DB sedang dipakai oleh script lain
    db.run('PRAGMA busy_timeout = 10000;');
    db.run('PRAGMA journal_mode = DELETE;');
    
    // --- ATTACH DATABASE KEDUA (DB_TTLOPS2.db) ---
    const db2Path = 'Z:/AMR Meter/DB_TTLOPS2/DB_TTLOPS2.db';
    
    db.run(`ATTACH DATABASE '${db2Path}' AS db2`, (attachErr) => {
      if (attachErr) {
        console.error('Gagal attach DB_TTLOPS2.db. Pastikan Drive Z: terhubung.', attachErr.message);
      } else {
        console.log('Berhasil attach DB_TTLOPS2.db sebagai db2.');
        
        // Terapkan juga mode jurnal DELETE ke database Z: agar seragam dan aman di jaringan
        db.run('PRAGMA db2.journal_mode = DELETE;');
      }
    });
  }
});

// --- API ENDPOINTS ---

// 1. API Autentikasi (Login)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  db.get(query, [email, password], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (row) res.json({ success: true, user: { name: row.name, role: row.role } });
    else res.json({ success: false, message: 'Username atau Password salah!' });
  });
});

// 2. API Status Devices (Meter Kesehatan)
app.get('/api/devices', (req, res) => {
  db.all(`SELECT * FROM devices`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. API Event History (Log Perubahan Status)
app.get('/api/events', (req, res) => {
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
    LIMIT 150
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Kalkulasi format durasi HH.MM.SS
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
    
    res.json(formattedRows);
  });
});

// 4. API Billing kWh (REVISI FINAL: Hapus UNKNOWN & Mapping Khusus NIU/WOHA)
app.get('/api/billing', (req, res) => {
  const { tgl } = req.query; 
  
  const query = `
    SELECT 
      COALESCE(d.site, l.site, '-') AS Site, 
      COALESCE(d.name, l.name, '-') AS Device, 
      COALESCE(d.serial_number, l.serial_number, '-') AS SerialNumber, 
      l.Time AS DateTime, 
      l."kWh Delivery" AS kWhDelivery, 
      l."kWh Received" AS kWhReceived
    FROM db2.log_kwh_meter_v2 l
    LEFT JOIN devices d 
      ON (l.serial_number = d.serial_number AND l.serial_number IS NOT NULL AND l.serial_number != '')
      OR (TRIM(UPPER(l.name)) = TRIM(UPPER(d.name)))
      -- Mapping khusus untuk menyambungkan histori nama yang terbalik
      OR (TRIM(UPPER(l.name)) = 'ND NIU SEWA 1' AND TRIM(UPPER(d.name)) = 'ND NIU 1 SEWA')
      OR (TRIM(UPPER(l.name)) = 'ND NIU SEWA 2' AND TRIM(UPPER(d.name)) = 'ND NIU 2 SEWA')
      OR (TRIM(UPPER(l.name)) = 'INC TRAFO 1 WOHA' AND TRIM(UPPER(d.name)) = 'INC TRAFO 1' AND TRIM(UPPER(d.site)) LIKE '%WOHA%')
      -- Logika standar untuk nama lainnya
      OR (
           TRIM(UPPER(l.name)) LIKE TRIM(UPPER(d.name)) || '%' 
           AND TRIM(UPPER(l.name)) LIKE '%' || REPLACE(REPLACE(TRIM(UPPER(d.site)), 'GI ', ''), 'PLTD ', '') || '%'
         )
    WHERE (l.Time LIKE ? OR l.Time LIKE ?)
      AND TRIM(UPPER(l.name)) NOT LIKE '%UNKNOWN%' -- Perintah untuk membuang data UNKNOWN
    ORDER BY l.Time DESC
    LIMIT 2000
  `;
  
  const targetWaktu1 = `%-${tgl} 10:00:%`; 
  const targetWaktu2 = `%/${tgl} 10:00:%`; 

  db.all(query, [targetWaktu1, targetWaktu2], (err, rows) => {
    if (err) {
      console.error("[ERROR API BILLING]:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`[API BILLING] Filter Tgl ${tgl} | Data berhasil ditarik: ${rows.length} baris.`);
    res.json(rows);
  });
});

// --- JALANKAN SERVER ---
app.listen(PORT, () => {
  console.log(`[SERVER] Tambora AMR Backend berjalan pada port ${PORT}`);
});