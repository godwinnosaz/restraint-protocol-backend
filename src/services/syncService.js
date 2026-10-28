const { query } = require('../config/db');

const ALLOWED_TYPES = new Set([
  'commitment.updated',
  'intervention.event',
]);

function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw invalid('Each event must be an object.');
  }
  if (typeof event.id !== 'string' || event.id.length < 8 || event.id.length > 80) {
    throw invalid('Event ID is invalid.');
  }
  if (!ALLOWED_TYPES.has(event.type)) {
    throw invalid('Event type is not supported.');
  }
  if (!Number.isSafeInteger(event.createdAtEpochMillis) || event.createdAtEpochMillis <= 0) {
    throw invalid('Event timestamp is invalid.');
  }
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
    throw invalid('Event payload must be an object.');
  }
  const allowedDurations = new Set([5, 15, 30, 60, 180, 720, 1440, 4320]);
  const payload = event.payload;
  if (event.type === 'commitment.updated') {
    const keys = Object.keys(payload).sort().join(',');
    if (keys !== 'activeDeadlineEpochMillis,selectedDurationMinutes,updatedAtEpochMillis') {
      throw invalid('Commitment payload contains unsupported fields.');
    }
    if (!allowedDurations.has(payload.selectedDurationMinutes) ||
        !Number.isSafeInteger(payload.activeDeadlineEpochMillis) || payload.activeDeadlineEpochMillis < 0 ||
        !Number.isSafeInteger(payload.updatedAtEpochMillis) || payload.updatedAtEpochMillis <= 0) {
      throw invalid('Commitment payload values are invalid.');
    }
  } else if (event.type === 'intervention.event') {
    const keys = Object.keys(payload).sort().join(',');
    const allowedOutcomes = new Set([
      'warning_shown',
      'restriction_started',
      'restriction_completed',
      'user_returned_to_safety'
    ]);
    if (keys !== 'createdAtEpochMillis,durationMinutes,outcome') {
      throw invalid('Intervention payload contains unsupported fields.');
    }
    if (!allowedOutcomes.has(payload.outcome) ||
        !allowedDurations.has(payload.durationMinutes) ||
        !Number.isSafeInteger(payload.createdAtEpochMillis) || payload.createdAtEpochMillis <= 0) {
      throw invalid('Intervention payload values are invalid.');
    }
  }

  const payloadJson = JSON.stringify(payload);
  if (Buffer.byteLength(payloadJson, 'utf8') > 8192) {
    throw invalid('Event payload exceeds the 8 KB limit.');
  }
  return { id: event.id, type: event.type, createdAtEpochMillis: event.createdAtEpochMillis, payloadJson };
}

function invalid(message) {
  const err = new Error(message);
  err.code = 'INVALID_SYNC_EVENT';
  return err;
}

async function acceptEvents(userUuid, inputEvents) {
  if (typeof userUuid !== 'string' || userUuid.length < 1 || userUuid.length > 100) {
    throw new Error('Authenticated user identity is invalid.');
  }

  const events = inputEvents.map(validateEvent);
  const connection = await require('../config/db').pool.getConnection();
  try {
    await connection.beginTransaction();
    const acceptedIds = [];
    for (const event of events) {
      await connection.execute(
        `INSERT IGNORE INTO rp_sync_events
          (user_uuid, client_event_id, event_type, client_created_at_ms, payload_json)
         VALUES (?, ?, ?, ?, ?)`,
        [userUuid, event.id, event.type, event.createdAtEpochMillis, event.payloadJson]
      );
      // A duplicate ID for this user is already durably stored, so it is safe to acknowledge.
      const [rows] = await connection.execute(
        'SELECT client_event_id FROM rp_sync_events WHERE user_uuid = ? AND client_event_id = ? LIMIT 1',
        [userUuid, event.id]
      );
      if (rows.length === 1) acceptedIds.push(event.id);
    }
    await connection.commit();
    return { acceptedIds };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { acceptEvents, validateEvent };
