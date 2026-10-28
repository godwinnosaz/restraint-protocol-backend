const syncService = require('../services/syncService');
const { success, error } = require('../utils/response');

async function syncBatch(req, res) {
  try {
    const { schemaVersion, events } = req.body || {};
    if (schemaVersion !== 1 || !Array.isArray(events) || events.length < 1 || events.length > 50) {
      return error(res, 'Invalid sync batch. Expected schemaVersion 1 and 1-50 events.', '', 400);
    }
    const result = await syncService.acceptEvents(req.user.id, events);
    return success(res, 'Sync batch accepted', result);
  } catch (err) {
    if (err.code === 'INVALID_SYNC_EVENT') {
      return error(res, err.message, '', 400);
    }
    console.error('Sync batch failed:', err);
    return error(res, 'Failed to process sync batch', '', 500);
  }
}

module.exports = { syncBatch };
