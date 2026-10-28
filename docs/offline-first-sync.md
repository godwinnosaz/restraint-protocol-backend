# Offline-first sync endpoint

The Android client sends queued commitment metadata and intervention outcomes to POST /api/v1/sync/batch.

- Authentication: existing JWT bearer token via Authorization: Bearer <token>.
- Request schema: schemaVersion=1, with 1-50 events.
- Supported event types: commitment.updated and intervention.event.
- Each event is scoped to the authenticated user's UUID.
- Event IDs are unique per user; duplicate submissions are acknowledged idempotently.
- The server validates payload shape and size before insertion.
- The endpoint returns acceptedIds only after rows have been inserted or confirmed already present.
- MySQL table rp_sync_events stores the event metadata and JSON payload.

## Client configuration

Build the Android app with an HTTPS API base URL:

    gradle -PrpSyncBaseUrl=https://your-api.example.com test assembleDebug

The base URL must point to this backend deployment. The Android client reads the bearer token from the application's rp_auth SharedPreferences under access_token. The current prototype does not yet include an account/login screen that writes this token; wire the existing login flow to persist the returned token before enabling remote sync.

## Production requirements

- Set a strong, private JWT_SECRET and secure database credentials.
- Deploy only behind HTTPS.
- Configure CORS to known web origins rather than wildcard when browser clients are used.
- Add rate limits, monitoring, backups, retention controls, and database migrations.
- Do not store images, private messages, browser contents, or video-call contents in this sync stream.
