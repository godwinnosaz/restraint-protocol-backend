const db = require('../utils/fileDb');
const { generateId } = require('../utils/idGenerator');
const eventService = require('./eventService');

function createStake(userId, sessionId, amount, currency = 'NGN', options = {}) {
  const stake = {
    id: generateId('stake'),
    user_id: userId,
    session_id: sessionId,
    amount,
    currency,
    status: 'locked',
    created_at: new Date().toISOString(),
    wallet_address: options.wallet_address || null,
    tx_signature: options.tx_signature || null,
    chain_status: options.wallet_address ? 'locked' : null
  };
  const saved = db.insert('stakes', stake);
  eventService.logEvent('STAKE_LOCKED', userId, sessionId, { amount, currency, tx: stake.tx_signature });
  return saved;
}

function releaseStake(stakeId, userId, sessionId, txSignature = null) {
  const updates = { status: 'released' };
  if (txSignature) {
    updates.chain_status = 'released';
    updates.release_tx_signature = txSignature;
  }
  const updated = db.updateById('stakes', stakeId, updates);
  eventService.logEvent('STAKE_RELEASED', userId, sessionId, { txSignature });
  return updated;
}

function slashStake(stakeId, userId, sessionId, txSignature = null) {
  const updates = { status: 'slashed' };
  if (txSignature) {
    updates.chain_status = 'slashed';
    updates.slash_tx_signature = txSignature;
  }
  const updated = db.updateById('stakes', stakeId, updates);
  eventService.logEvent('STAKE_SLASHED', userId, sessionId, { txSignature });
  return updated;
}

function getStakeBySession(sessionId) {
  return db.findOne('stakes', (s) => s.session_id === sessionId);
}

function getStakeByTx(txSignature) {
  return db.findOne('stakes', (s) => s.tx_signature === txSignature);
}

function getUserStakes(userId) {
  return db.findMany('stakes', (s) => s.user_id === userId);
}

module.exports = {
  createStake,
  releaseStake,
  slashStake,
  getStakeBySession,
  getStakeByTx,
  getUserStakes,
};
