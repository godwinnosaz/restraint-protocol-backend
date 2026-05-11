const db = require('../utils/fileDb');
const { generateId } = require('../utils/idGenerator');
const eventService = require('./eventService');

function getSessionById(id) {
  return db.findById('sessions', id);
}

function getActiveSession(userId) {
  return db.findOne('sessions', (s) => s.user_id === userId && s.status === 'active');
}

function getSessionHistory(userId) {
  return db.findMany('sessions', (s) => s.user_id === userId).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

function createSession(data) {
  const now = new Date().toISOString();
  const session = {
    id: generateId('session'),
    user_id: data.userId,
    status: 'active',
    duration: data.duration || 1500,
    remaining_time: data.duration || 1500,
    start_time: now,
    end_time: null,
    blocked_apps: data.blocked_apps || [],
    blocked_sites: data.blocked_sites || [],
    stake_amount: data.stake_amount || 0,
    currency: data.currency || 'NGN',
    ai_risk_score: data.ai_risk_score || 0,
    stake_mode: data.stake_mode || 'simulated',
    wallet_address: data.wallet_address || null,
    stake_tx_signature: data.stake_tx_signature || null,
    resolve_tx_signature: null,
    chain_status: data.stake_mode === 'solana' ? 'locked' : 'pending',
    strict_mode: data.strict_mode !== undefined ? data.strict_mode : true,
    state_history: [{ state: 'active', timestamp: now }],
    created_at: now,
  };
  const saved = db.insert('sessions', session);
  eventService.logEvent('SESSION_START', data.userId, saved.id, { duration: session.duration, mode: session.stake_mode });
  return saved;
}

function completeSession(sessionId, resolveSignature = null) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  const now = new Date().toISOString();
  
  const updates = {
    status: 'completed',
    end_time: now,
    remaining_time: 0,
    state_history: [...(session.state_history || []), { state: 'completed', timestamp: now }],
  };

  if (session.stake_mode === 'solana') {
    updates.chain_status = 'released';
    if (resolveSignature) updates.resolve_tx_signature = resolveSignature;
  }

  const updated = db.updateById('sessions', sessionId, updates);
  eventService.logEvent('SESSION_COMPLETE', session.user_id, sessionId, { resolveSignature });
  return updated;
}

function failSession(sessionId, resolveSignature = null) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  const now = new Date().toISOString();
  
  const updates = {
    status: 'failed',
    end_time: now,
    state_history: [...(session.state_history || []), { state: 'failed', timestamp: now }],
  };

  if (session.stake_mode === 'solana') {
    updates.chain_status = 'slashed';
    if (resolveSignature) updates.resolve_tx_signature = resolveSignature;
  }

  const updated = db.updateById('sessions', sessionId, updates);
  eventService.logEvent('SESSION_FAIL', session.user_id, sessionId, { resolveSignature });
  return updated;
}

module.exports = {
  getSessionById,
  getActiveSession,
  getSessionHistory,
  createSession,
  completeSession,
  failSession,
};
