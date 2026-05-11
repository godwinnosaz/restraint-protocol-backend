const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const stakeService = require('../services/stakeService');
const { success, error } = require('../utils/response');

async function getUserStats(req, res) {
  try {
    const { userId } = req.params;
    const user = userService.getUserById(userId);
    if (!user) return error(res, 'User not found', '', 404);

    const sessions = sessionService.getSessionHistory(userId);
    const stakes = stakeService.getUserStakes(userId);

    const completed = sessions.filter((s) => s.status === 'completed');
    const failed = sessions.filter((s) => s.status === 'failed');
    const totalStaked = stakes.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalSlashed = stakes
      .filter((s) => s.status === 'slashed')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const successRate =
      sessions.length > 0 ? parseFloat(((completed.length / sessions.length) * 100).toFixed(1)) : 0;

    return success(res, 'Stats fetched', {
      stats: {
        focus_score: user.focus_score || 0,
        streak: user.streak || 0,
        total_focus_time: user.total_focus_time || 0,
        total_sessions: sessions.length,
        completed_sessions: completed.length,
        failed_sessions: failed.length,
        success_rate: successRate,
        total_staked: totalStaked,
        total_slashed: totalSlashed,
        recent_sessions: sessions.slice(0, 10),
      },
    });
  } catch (err) {
    return error(res, 'Failed to get stats', err, 500);
  }
}

module.exports = { getUserStats };
