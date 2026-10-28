# Backend deployment notes

## Prerequisites

- Supported Node.js release (Node 22 recommended).
- MySQL or compatible MariaDB server.
- HTTPS termination at a reverse proxy or managed platform.
- A private environment configuration; never commit the real .env file.

## First deployment

1. Create a database named restraint_protocol and a database user with privileges limited to that database.
2. Copy .env.example to .env and set DB credentials plus a strong random JWT_SECRET.
3. Install dependencies with npm ci.
4. Start the backend with npm start. Startup initializes the required tables before the HTTP listener is opened.
5. Put the service behind HTTPS and confirm GET /health.
6. Build the Android client with the HTTPS base URL, for example:

       gradle -PrpSyncBaseUrl=https://api.example.com test assembleDebug

7. Install the APK, create an account or sign in, and test one queued event with network disabled and then re-enabled.

## Offline sync endpoint

POST /api/v1/sync/batch requires the existing JWT bearer token. The service accepts only commitment.updated and intervention.event records, scopes rows to the authenticated user UUID, enforces a bounded batch/payload size, and acknowledges stable client event IDs after durable insertion.

The sync table is created by the normal database initialization. Repeated submissions of the same client event ID for the same user are idempotently acknowledged.

## Before production use

- Use a long, random JWT_SECRET and secure database credentials.
- Configure TLS, rate limiting, monitoring, database backups, and retention/deletion policies.
- Replace wildcard CORS with explicit origins for browser-based clients.
- Review account recovery, token expiry/rotation, and privacy policy.
- Do not expose database credentials or service secrets in the Android APK.
