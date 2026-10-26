# TODO

Upcoming features for the admin dashboard (`admin` branch).

## Done

- [x] QR code, stylized card (PNG), and copy link on each site's page (`src/admin/share.js`).
- [x] Site expiration: date per site, shown in the dashboard; expired sites show only an "expired / no longer valid" notice (scene never loaded) (RLS in `supabase/schema.sql`).

## Upcoming

_Nothing queued._

## Dropped

- Search box on the sites list (not needed).

## Ideas (not committed to)

- Copy-link button and "open site" button next to each uuid.
- Stylized QR card: QR + site title + short URL on a lantern-themed night background (moon, stars, glowing lantern), exported as a downloadable PNG for sharing. Draw it on a canvas client-side; keep the QR itself dark-on-light with a quiet zone so it still scans.
- Generate the QR client-side with a small dependency (e.g. `qrcode`) so nothing leaves the browser; lazy-load it in the admin chunk only.
- Show per-site stats in the list (lantern count, last updated).
