const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'restraint_protocol',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params) {
  const [rows, fields] = await pool.execute(sql, params);
  return rows;
}

async function initDb() {
  try {
    console.log('Initializing MySQL Database...');
    
    // Create Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(100) NOT NULL UNIQUE,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        wallet_address VARCHAR(150) NULL,
        focus_score INT DEFAULT 0,
        streak INT DEFAULT 0,
        total_focus_time INT DEFAULT 0,
        risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Durable, per-user idempotent event inbox for offline-first mobile sync.
    await query(`
      CREATE TABLE IF NOT EXISTS rp_sync_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_uuid VARCHAR(100) NOT NULL,
        client_event_id VARCHAR(80) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        client_created_at_ms BIGINT UNSIGNED NOT NULL,
        payload_json JSON NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rp_sync_user_event (user_uuid, client_event_id),
        KEY idx_rp_sync_user_received (user_uuid, received_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('MySQL Database initialized successfully.');
  } catch (err) {
    console.error('MySQL Database initialization failed:');
    console.error(err);
    throw err;
  }
}

module.exports = {
  query,
  pool,
  initDb
};
