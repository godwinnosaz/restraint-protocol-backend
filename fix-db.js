require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDb() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restraint_protocol',
    multipleStatements: true,
  });

  console.log('Connected to MySQL.');

  try {
    // Handle orphaned InnoDB tablespace
    console.log('Fixing orphaned InnoDB tablespace...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Step 1: create a minimal placeholder so we can DISCARD its tablespace
    try {
      await conn.query('CREATE TABLE IF NOT EXISTS users_fix_placeholder (id INT PRIMARY KEY) ENGINE=InnoDB;');
      await conn.query('RENAME TABLE users_fix_placeholder TO users;');
    } catch (e) {
      // users table already exists in dict, that's fine
      console.log('  (table already in dict, proceeding to DISCARD)');
    }

    // Step 2: DISCARD tablespace to detach the orphaned .ibd file
    try {
      await conn.query('ALTER TABLE users DISCARD TABLESPACE;');
      console.log('  Tablespace discarded.');
    } catch (e) {
      console.log('  DISCARD skipped:', e.message);
    }

    // Step 3: Now DROP cleanly
    await conn.query('DROP TABLE IF EXISTS users;');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Dropped cleanly.');

    // Recreate cleanly
    console.log('Recreating users table...');
    await conn.query(`
      CREATE TABLE users (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Users table recreated successfully.');

    // Verify
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM users;');
    console.log('Verification — row count:', rows[0].count);
    console.log('\n✅ Database fixed. Restart the backend server now.');
  } catch (err) {
    console.error('Fix failed:', err.message);
  } finally {
    await conn.end();
  }
}

fixDb();
