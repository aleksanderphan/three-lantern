# TODO

Upcoming features for the admin dashboard (`admin` branch).

## Upcoming

- [ ] **QR code generator for a site's link.** Sole purpose: sharing a site's URL from the admin CMS. It lives only in the dashboard (not on the public site). From a site's row, show a QR code for `https://<uuid>.<domain>` (the `?site=<uuid>` form on hosts without wildcard subdomains), with a download button (PNG, optionally SVG) so the admin can send it to the site's owner.
- [ ] **Search box for a site's uuid.** A text field in the dashboard that filters the sites list by uuid (and title), so a user can find their own site quickly.

## Ideas (not committed to)

- Copy-link button and "open site" button next to each uuid.
- Shareable QR card: QR + site title + short URL, as a downloadable image.
- Generate the QR client-side with a small dependency (e.g. `qrcode`) so nothing leaves the browser; lazy-load it in the admin chunk only.
- Search by title/caption as well as uuid, with highlight of the matched text.
- Debounced input, paste-a-full-URL support (extract the uuid from the pasted link), and a "no match" state.
- Deep-link the search (`/admin.html#q=<uuid>`) so a link can open the dashboard on one site.
- Show per-site stats in the list (lantern count, last updated).
