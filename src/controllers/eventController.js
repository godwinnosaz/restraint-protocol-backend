const eventService = require('../services/eventService');
const { success, error } = require('../utils/response');

async function logViolation(req, res) {
  try {
    const { sessionId, userId, type, data, category, severity, timestamp, actionTaken } = req.body;
    
    if (!sessionId || !userId) {
      return error(res, 'Session ID and User ID are required', '', 400);
    }

    const event = eventService.logEvent('VIOLATION_DETECTED', userId, sessionId, {
      violation_type: type,
      violation_data: data,
      category,
      severity,
      detected_at: timestamp || new Date().toISOString(),
      action_taken: actionTaken || 'none'
    });

    return success(res, 'Violation logged', { event });
  } catch (err) {
    return error(res, 'Failed to log violation', err, 500);
  }
}

module.exports = {
  logViolation
};
