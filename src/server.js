require('dotenv').config();
const { initDb } = require('./config/db');

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statsRoutes = require('./routes/statsRoutes');
const blacklistRoutes = require('./routes/blacklistRoutes');
const eventRoutes = require('./routes/eventRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/ai', aiRoutes);
app.use('/stats', statsRoutes);
app.use('/blacklist', blacklistRoutes);
app.use('/events', eventRoutes);


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Restraint Protocol API is running',
    data: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', error: '' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
initDb();
// Listen on 0.0.0.0 so Android devices on the same Wi-Fi can reach this server

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        RESTRAINT PROTOCOL — BACKEND SERVER       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                  ║`);
  console.log(`║  Network:  Use your IPv4 address (see ipconfig)  ║`);
  console.log(`║  Health:   GET /health                           ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
