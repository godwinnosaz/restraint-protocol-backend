const aiService = require('../services/aiService');
const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const { success, error } = require('../utils/response');

async function preSessionAnalysis(req, res) {
  try {
    const { userId, duration, blocked_apps, blocked_sites, stake_amount, currency } = req.body;
    if (!userId) return error(res, 'userId is required', '', 400);

    const user = userService.getUserById(userId);
    if (!user) return error(res, 'User not found', '', 404);

    const sessionPlan = { duration, blocked_apps, blocked_sites, stake_amount, currency };
    const analysis = await aiService.analyzePreSession(user, sessionPlan);

    // Persist as AI insight (no session yet)
    aiService.saveInsight(userId, 'pre_session', 'risk', analysis.message, analysis.risk_score, 0.85);

    return success(res, 'Pre-session analysis complete', { analysis });
  } catch (err) {
    return error(res, 'AI analysis failed', err, 500);
  }
}

async function getSessionInsight(req, res) {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSessionById(sessionId);
    if (!session) return error(res, 'Session not found', '', 404);

    const focusMessage = await aiService.generateFocusMessage(session);
    const insights = aiService.getSessionInsight(sessionId);

    return success(res, 'Session insight fetched', { focusMessage, insights });
  } catch (err) {
    return error(res, 'Failed to get session insight', err, 500);
  }
}

async function postSessionInsight(req, res) {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSessionById(sessionId);
    if (!session) return error(res, 'Session not found', '', 404);

    const insightData = await aiService.generatePostSessionInsight(session);
    aiService.saveInsight(session.user_id, sessionId, 'post_session', insightData.message, 0, 0.9);

    return success(res, 'Post-session insight generated', { insight: insightData });
  } catch (err) {
    return error(res, 'Failed to generate post-session insight', err, 500);
  }
}


async function getUserSummary(req, res) {
  try {
    const { userId } = req.params;
    const user = userService.getUserById(userId);
    if (!user) return error(res, 'User not found', '', 404);

    const summary = await aiService.generateUserSummary(user);
    const insights = aiService.getUserInsights(userId);

    return success(res, 'User AI summary generated', { summary, insights });
  } catch (err) {
    return error(res, 'Failed to generate user summary', err, 500);
  }
}

module.exports = { preSessionAnalysis, getSessionInsight, postSessionInsight, getUserSummary };
