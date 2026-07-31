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
    // Memberikan waktu tunggu (timeout) 10 detik jika DB sedang dipakai oleh Python
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
  db.all(`SELECT * FROM events ORDER BY timestamp DESC LIMIT 150`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 4. API Billing kWh (REVISI JOIN GANDA: PRIORITAS NAMA DEVICE)
app.get('/api/billing', (req, res) => {
  const { tgl } = req.query; // '01' atau '25'
  
  const query = `
    SELECT 
      COALESCE(d.site, 'Site Tidak Terdaftar') AS Site, 
      COALESCE(d.name, l.Bay) AS Device, 
      COALESCE(d.serial_number, l."Serial Number", '-') AS SerialNumber, 
      l.Time AS DateTime, 
      l."kWh Delivery" AS kWhDelivery, 
      l."kWh Received" AS kWhReceived
    FROM db2.log_kwh_meter_v2 l
    LEFT JOIN devices d 
      ON TRIM(UPPER(l.Bay)) = TRIM(UPPER(d.name)) 
      OR (l."Serial Number" IS NOT NULL AND TRIM(l."Serial Number") != '' AND TRIM(l."Serial Number") = TRIM(d.serial_number))
    WHERE l.Time LIKE ? OR l.Time LIKE ?
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