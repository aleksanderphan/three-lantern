# TODO

Upcoming features for the admin dashboard (`admin` branch).

## Upcoming

- [ ] **QR code generator for a site's link.** From a site's row in the dashboard, render a QR code for `https://<uuid>.<domain>` (the `?site=<uuid>` form on hosts without wildcard subdomains), with a download button (PNG, optionally SVG).
- [ ] **Search box for a site's uuid.** A text field in the dashboard that filters the sites list by uuid (and title), so a user can find their own site quickly.

## Ideas (not committed to)

- Copy-link button and "open site" button next to each uuid.
- Printable QR card: QR + site title + short URL, sized for print.
- Generate the QR client-side with a small dependency (e.g. `qrcode`) so nothing leaves the browser; lazy-load it in the admin chunk only.
- Search by title/caption as well as uuid, with highlight of the matched text.
- Debounced input, paste-a-full-URL support (extract the uuid from the pasted link), and a "no match" state.
- Deep-link the search (`/admin.html#q=<uuid>`) so a link can open the dashboard on one site.
- Add a logo or the lantern icon in the QR centre (use high error-correction level).
- Show per-site stats in the list (lantern count, last updated).
