const { query } = require('../config/db');
const { generateId } = require('../utils/idGenerator');

async function getUserByEmail(email) {
  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  return users[0] || null;
}

async function getUserById(uuid) {
  const users = await query('SELECT * FROM users WHERE uuid = ?', [uuid]);
  return users[0] || null;
}

async function getDemoUser() {
  return await getUserByEmail('demo@restraint.app');
}

async function createUser({ username, email, password_hash, wallet_address }) {
  const uuid = generateId('user');
  await query(
    'INSERT INTO users (uuid, username, email, password_hash, wallet_address) VALUES (?, ?, ?, ?, ?)',
    [uuid, username, email, password_hash, wallet_address || null]
  );
  
  return await getUserById(uuid);
}

async function incrementFocusScore(userId, points) {
  await query(
    'UPDATE users SET focus_score = focus_score + ? WHERE uuid = ?',
    [points, userId]
  );
  return await getUserById(userId);
}

async function incrementStreak(userId) {
  await query(
    'UPDATE users SET streak = streak + 1 WHERE uuid = ?',
    [userId]
  );
  return await getUserById(userId);
}

async function resetStreak(userId) {
  await query(
    'UPDATE users SET streak = 0 WHERE uuid = ?',
    [userId]
  );
  return await getUserById(userId);
}

async function addFocusTime(userId, seconds) {
  await query(
    'UPDATE users SET total_focus_time = total_focus_time + ? WHERE uuid = ?',
    [seconds, userId]
  );
  return await getUserById(userId);
}

module.exports = {
  getUserByEmail,
  getUserById,
  getDemoUser,
  createUser,
  incrementFocusScore,
  incrementStreak,
  resetStreak,
  addFocusTime,
};
