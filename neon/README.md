# Les Délices de CANA — Neon

Production backend: Neon project **Les Délices de CANA**.

- PostgreSQL: Neon branch `production`
- Data API: PostgREST-compatible endpoint configured for the public `cana_api` RPC.
- Admin authentication: `admin_users` + `admin_sessions` with bcrypt password hashes.
- Push worker: Neon Function `canapush`, scheduled every minute.
- Notification events are idempotent through the unique `event_key`.

The VAPID private key is intentionally not stored in Git. It is stored only in the production Neon database settings table and read by the Neon Function at runtime.