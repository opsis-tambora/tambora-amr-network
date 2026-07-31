const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Mengizinkan Express menyajikan file statis dari folder public React 
// (Penting agar file JSON yang digenerate oleh script Python bisa dibaca oleh Axios di Frontend)
app.use(express.static(path.join(__dirname, '../client/public')));

// --- KONEKSI DATABASE ---
// Pastikan nama file database SQLite Anda sesuai (contoh: database.sqlite)
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Gagal terhubung ke database:', err.message);
  } else {
    console.log('Berhasil terhubung ke database SQLite Tambora.');
  }
});

// --- API ENDPOINTS ---

// 1. API Autentikasi (Login)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Asumsi tabel Anda bernama 'users'. Sesuaikan jika berbeda.
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  db.get(query, [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (row) {
      res.json({
        success: true,
        user: {
          name: row.name,
          role: row.role
        }
      });
    } else {
      res.json({ success: false, message: 'Username atau Password salah!' });
    }
  });
});

// 2. API Status Devices (Meter Kesehatan)
app.get('/api/devices', (req, res) => {
  // Asumsi tabel Anda bernama 'devices'.
  const query = `SELECT * FROM devices`;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 3. API Event History (Log Perubahan Status)
app.get('/api/events', (req, res) => {
  // PERBAIKAN PENTING: 
  // Menambahkan ORDER BY timestamp DESC agar log terbaru muncul di atas.
  // Menambahkan LIMIT 150 agar hanya 150 data terakhir yang dikirim ke Frontend.
  // Ini adalah kunci utama untuk mencegah Memory Leak dan beban API berlebih.
  const query = `SELECT * FROM events ORDER BY timestamp DESC LIMIT 150`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// --- JALANKAN SERVER ---
app.listen(PORT, () => {
  console.log(`[SERVER] Tambora AMR Backend berjalan pada port ${PORT}`);
});