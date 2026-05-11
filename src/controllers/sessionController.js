const sessionService = require('../services/sessionService');
const stakeService = require('../services/stakeService');
const userService = require('../services/userService');
const aiService = require('../services/aiService');
const solanaService = require('../services/solanaService');
const { success, error } = require('../utils/response');

async function startSession(req, res) {
  try {
    const { userId, duration, blocked_apps, blocked_sites, stake_amount, currency, ai_risk_score, stake_mode, wallet_address, tx_signature } = req.body;
    if (!userId) return error(res, 'userId is required', '', 400);

    if (stake_mode === 'solana') {
      if (!wallet_address || !tx_signature) {
         return error(res, 'Solana mode requires wallet_address and tx_signature', '', 400);
      }

      // Prevent signature reuse
      const existingTx = stakeService.getStakeByTx(tx_signature);
      if (existingTx) {
         return error(res, 'Transaction signature already used', '', 400);
      }

      if (tx_signature !== 'demo_mode_bypass') {
        const verifyResult = await solanaService.verifyLockTransaction(tx_signature, wallet_address, stake_amount);
        if (!verifyResult.success) {
           return error(res, 'Transaction verification failed: ' + verifyResult.error, '', 400);
        }
      }
    }

    const session = sessionService.createSession({
      userId,
      duration: duration || 1500,
      blocked_apps: blocked_apps || [],
      blocked_sites: blocked_sites || [],
      stake_amount: stake_amount || 0,
      currency: currency || 'NGN',
      ai_risk_score: ai_risk_score || 0,
      stake_mode: stake_mode || 'simulated',
      wallet_address,
      stake_tx_signature: tx_signature
    });

    // Lock stake if specified
    let stake = null;
    if (stake_amount && stake_amount > 0) {
      stake = stakeService.createStake(userId, session.id, stake_amount, currency || 'NGN', {
         wallet_address,
         tx_signature
      });
    }

    return success(res, 'Session started', { session, stake });
  } catch (err) {
    return error(res, 'Failed to start session', err, 500);
  }
}

async function getActiveSession(req, res) {
  try {
    const { userId } = req.params;
    const session = sessionService.getActiveSession(userId);
    if (!session) return success(res, 'No active session', { session: null });
    const stake = stakeService.getStakeBySession(session.id);
    return success(res, 'Active session fetched', { session, stake });
  } catch (err) {
    return error(res, 'Failed to get active session', err, 500);
  }
}

async function completeSession(req, res) {
  try {
    const { sessionId } = req.params;
    let session = sessionService.getSessionById(sessionId);
    if (!session) return error(res, 'Session not found', '', 404);
    if (session.status !== 'active') return error(res, 'Session is not active', '', 400);

    let resolveSignature = null;
    let stake = stakeService.getStakeBySession(sessionId);

    // If Solana mode, process refund
    if (session.stake_mode === 'solana' && session.wallet_address && stake && stake.amount > 0) {
       if (session.stake_tx_signature === 'demo_mode_bypass') {
          resolveSignature = 'demo_refund_bypass';
       } else {
          const refundResult = await solanaService.sendRefund(session.wallet_address, stake.amount);
          if (refundResult.success) {
             resolveSignature = refundResult.signature;
          } else {
             console.error('Failed to send refund on chain:', refundResult.error);
             // We still complete the session logically, but admin intervention is needed for refund.
          }
       }
    }

    session = sessionService.completeSession(sessionId, resolveSignature);

    // Release stake
    if (stake && stake.status === 'locked') {
      stakeService.releaseStake(stake.id, session.user_id, sessionId, resolveSignature);
      stake = stakeService.getStakeBySession(sessionId); // reload
    }

    // Update user stats
    const focusPoints = Math.floor(session.duration / 60) * 2;
    userService.incrementFocusScore(session.user_id, focusPoints);
    userService.incrementStreak(session.user_id);
    userService.addFocusTime(session.user_id, session.duration);

    // Generate post-session AI insight
    const insight = await aiService.generatePostSessionInsight(session);
    aiService.saveInsight(session.user_id, sessionId, 'summary', insight.message, 0, 0.9);

    const updatedUser = userService.getUserById(session.user_id);

    return success(res, 'Session completed', {
      session,
      insight,
      user: updatedUser,
      stake,
    });
  } catch (err) {
    return error(res, 'Failed to complete session', err, 500);
  }
}

async function failSession(req, res) {
  try {
    const { sessionId } = req.params;
    let session = sessionService.getSessionById(sessionId);
    if (!session) return error(res, 'Session not found', '', 404);
    if (session.status !== 'active') return error(res, 'Session is not active', '', 400);

    // In solana MVP, failing means we just keep the funds in the treasury. No TX needed right now unless we move from PDA.
    // So resolveSignature is just "slashed_in_treasury"
    let resolveSignature = session.stake_mode === 'solana' ? 'treasury_retained' : null;

    session = sessionService.failSession(sessionId, resolveSignature);

    // Slash stake
    let stake = stakeService.getStakeBySession(sessionId);
    if (stake && stake.status === 'locked') {
      stakeService.slashStake(stake.id, session.user_id, sessionId, resolveSignature);
      stake = stakeService.getStakeBySession(sessionId);
    }

    // Reset streak
    userService.resetStreak(session.user_id);

    // Generate failure AI insight
    const insight = await aiService.generatePostSessionInsight(session);
    aiService.saveInsight(session.user_id, sessionId, 'advice', insight.message, 0.7, 0.8);

    const updatedUser = userService.getUserById(session.user_id);

    return success(res, 'Session failed', {
      session,
      insight,
      user: updatedUser,
      stake,
    });
  } catch (err) {
    return error(res, 'Failed to record session failure', err, 500);
  }
}

async function getSessionHistory(req, res) {
  try {
    const { userId } = req.params;
    const sessions = sessionService.getSessionHistory(userId);
    return success(res, 'Session history fetched', { sessions });
  } catch (err) {
    return error(res, 'Failed to get session history', err, 500);
  }
}

async function logEvent(req, res) {
  try {
    const { sessionId, eventType, data } = req.body;
    if (!sessionId || !eventType) return error(res, 'sessionId and eventType are required', '', 400);
    console.log(`[EVENT] Session ${sessionId}: ${eventType}`, data);
    // In a real DB we'd store this in a logs collection/table
    return success(res, 'Event logged');
  } catch (err) {
    return error(res, 'Failed to log event', err, 500);
  }
}

module.exports = {
  startSession,
  getActiveSession,
  completeSession,
  failSession,
  getSessionHistory,
  logEvent,
};
