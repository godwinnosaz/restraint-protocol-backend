const db = require('../utils/fileDb');
const { generateId } = require('../utils/idGenerator');

function logEvent(type, userId, sessionId, metadata = {}) {
  const event = {
    id: generateId('event'),
    type,
    user_id: userId,
    session_id: sessionId,
    metadata,
    timestamp: new Date().toISOString(),
  };
  return db.insert('events', event);
}

function getUserEvents(userId) {
  return db.findMany('events', (e) => e.user_id === userId);
}

module.exports = { logEvent, getUserEvents };
