const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEvent } = require('./syncService');

test('accepts a valid commitment update event', () => {
  const event = validateEvent({
    id: '8a03c99e-7b0a-47f5-8f04-123456789abc',
    type: 'commitment.updated',
    createdAtEpochMillis: 1790000000000,
    payload: { selectedDurationMinutes: 15, activeDeadlineEpochMillis: 0, updatedAtEpochMillis: 1790000000000 }
  });
  assert.equal(event.type, 'commitment.updated');
  assert.equal(JSON.parse(event.payloadJson).selectedDurationMinutes, 15);
});

test('rejects unknown event types', () => {
  assert.throws(() => validateEvent({
    id: '8a03c99e-7b0a-47f5-8f04-123456789abc',
    type: 'private.browser.history',
    createdAtEpochMillis: 1790000000000,
    payload: {}
  }), { code: 'INVALID_SYNC_EVENT' });
});

test('rejects oversized payloads', () => {
  assert.throws(() => validateEvent({
    id: '8a03c99e-7b0a-47f5-8f04-123456789abc',
    type: 'intervention.event',
    createdAtEpochMillis: 1790000000000,
    payload: { text: 'x'.repeat(9000) }
  }), { code: 'INVALID_SYNC_EVENT' });
});

test('rejects malformed event IDs', () => {
  assert.throws(() => validateEvent({
    id: 'x',
    type: 'intervention.event',
    createdAtEpochMillis: 1790000000000,
    payload: {}
  }), { code: 'INVALID_SYNC_EVENT' });
});

test('rejects unexpected fields so private content cannot be smuggled in the sync payload', () => {
  assert.throws(() => validateEvent({
    id: '8a03c99e-7b0a-47f5-8f04-123456789abc',
    type: 'commitment.updated',
    createdAtEpochMillis: 1790000000000,
    payload: {
      selectedDurationMinutes: 15,
      activeDeadlineEpochMillis: 0,
      updatedAtEpochMillis: 1790000000000,
      messageText: 'not an allowed sync field'
    }
  }), { code: 'INVALID_SYNC_EVENT' });
});

test('accepts an allowlisted intervention outcome', () => {
  const event = validateEvent({
    id: '9a03c99e-7b0a-47f5-8f04-123456789abc',
    type: 'intervention.event',
    createdAtEpochMillis: 1790000000000,
    payload: {
      outcome: 'restriction_started',
      durationMinutes: 15,
      createdAtEpochMillis: 1790000000000
    }
  });
  assert.equal(event.type, 'intervention.event');
});
