# Stockfish Survival - Notes

Working notes for the Stockfish Survival startup. See [README.md](README.md) for the full project description.

## Specification Deliverable

- Wrote the elevator pitch, key features, technology usage, and design overview in the README.
- Added a Mermaid sequence diagram showing the move / score / leaderboard flow.
- Added a rough wireframe sketch (`stockfish-survival-wireframe.png`).

## Open questions

- Which client-side chess library to use for move validation and board rendering.
- How to run or bundle Stockfish in the browser (WASM build vs. server-side).
- Exact move-clock value that makes survival scores meaningfully comparable.

## Simon HTML deliverable

Cloned `webprogramming260/simon-html` into `School/simon`, reviewed the four pages
(`index`, `play`, `scores`, `about`) and their shared header/nav/footer, and
deployed it as its own service with `deployFiles.sh`.

- **Deployment**: `deployFiles.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s simon`
  does two things over SSH/SCP: (1) `rm -rf`/`mkdir -p`s `services/simon/public` on
  the EC2 box to clear any prior deploy, then (2) `scp -r`s every file in the
  current directory into that folder. It doesn't touch Caddy or DNS itself — it's
  purely a "sync my local project folder to a folder on the server" script.
- **Routing**: the EC2 box already serves `beatstockfish.click` and
  `startup.beatstockfish.click` from a single Caddy block rooted at
  `/usr/share/caddy`. Simon needed its own Caddy site block
  (`simon.beatstockfish.click { root * /home/ubuntu/services/simon/public; file_server }`)
  appended to `/etc/caddy/Caddyfile` (backed up first as `Caddyfile.bak-simon`),
  then `sudo caddy validate` and `sudo systemctl reload caddy`. DNS didn't need a
  new record since the wildcard `*.beatstockfish.click` A record already covers it.
- **Gotcha**: first load returned `403 Forbidden` even though the files were
  present with correct ownership/permissions. Cause: Caddy runs as its own
  unprivileged `caddy` user, and `/home/ubuntu` was `750` (owner/group only, no
  "other" execute bit), so `caddy` couldn't traverse into the directory to reach
  the files at all. Fixed with `chmod o+x /home/ubuntu` (adds traverse-only
  permission on the home dir; doesn't expose directory listing or files beyond
  what's already world-readable underneath). Worth remembering for the actual
  Stockfish Survival service directory too.
- Live at <https://simon.beatstockfish.click>.

## Simon CSS

Cloned `webprogramming260/simon-css` into `School/simon` (overwriting the
HTML-only version reviewed for the previous deliverable) and reviewed how the
example app layers CSS: one shared `main.css` (flex header/main/footer, the
`menu { flex-direction: row !important; }` Bootstrap override, the
`@media (max-height: 600px)` header/footer hide) plus a page-specific
stylesheet per view (`about.css`, `play.css`, `scores.css`). This is the exact
pattern I followed for my own `startup` CSS deliverable below, just with my
own page names/content instead of Simon's.

- Viewed it locally with the Live Server extension and inspected it with the
  Chrome dev tools Elements tab, per the deliverable instructions.
- Deployed the CSS version with
  `./deployFiles.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s simon`,
  replacing the previously-deployed HTML-only version. Confirmed live at
  <https://simon.beatstockfish.click> (`main.css` now returns `200` instead of
  the prior `404`). `deployFiles.sh` in `simon/` is byte-identical to the copy
  in this repo, so nothing needed to be pulled over for deployment itself.

### CSS techniques worth remembering from the example (in case the local clone goes away)

- **Absolutely-centered circular game board.** `.game` is a relatively-sized
  circle (`width/height: 80vw`, clamped with `max-width/height: min(80vmin,
  1000px)` and a `min-width/height` floor) that's `position: absolute` within
  its flex-centered parent. The center controls disc (`.controls`) and the
  score readout (`.score`) both use a `.center { top: 50%; left: 50%; transform:
  translateX(-50%) translateY(-50%); }` helper class to center themselves
  inside their positioned ancestor regardless of their own size - a cleaner
  alternative to hardcoding negative margins.
- **CSS Grid for the 2x2 button layout.** `.button-container { display: grid;
  grid-template-columns: 1fr 1fr; gap: 20px; }` is the one place in the whole
  example (and, so far, in my own CSS too) that actually uses `display: grid`
  instead of flexbox - worth reaching for next time a genuinely two-dimensional
  layout (not just a single row/column) comes up.
- **Quarter-circle buttons from plain `border-radius`.** Each of the four game
  buttons rounds only one corner to 100% (e.g. `.button-top-left { border-radius:
  100% 0 0 0; }`), turning four squares arranged in a grid into a circle - no
  SVG or clip-path needed.
- **`::before` pseudo-element for generated content.** `.author::before {
  content: " - "; }` prepends a literal string before the quote author's name
  without adding an extra HTML element - the pseudo-element type of selector
  the rubric asks for, distinct from the pseudo-*class* selectors
  (`:nth-child`, `:first-child`) I used in my own CSS.
- **Color-coded event log.** `.player-event`/`.system-event`/`.event` give
  different message types their own accent color in the same list, the same
  idea I reused for `.player-name` and the leaderboard's top-row highlight.
- **Table cell truncation.** `td { max-width: 40vw; overflow: hidden;
  white-space: nowrap; text-overflow: ellipsis; }` on the scores table is
  exactly the pattern I copied into my own `leaderboard.css` (I additionally
  added `table-layout: fixed` on the `<table>` itself after the rubric review
  flagged that `max-width` on auto-layout table cells is unreliable without it).

## Startup HTML deliverable

- Built the actual HTML structure for Stockfish Survival (not the Simon tutorial):
  `index.html` (home/login), `play.html` (game + live activity feed), `leaderboard.html`
  (top scores table), `about.html` (description, wireframe image, Chess.com lookup).
- No CSS yet, so the board and layout use plain tables/`bgcolor`, matching the class's
  "structure and placeholders only" phase.
- Placeholders line up 1:1 with technologies still to come: the login form has nowhere
  to submit yet (Service/DB-Login), the leaderboard table has hardcoded rows (DB), the
  play page's activity list is static (WebSocket), and the Chess.com stats box on the
  about page is hardcoded (3rd party service call).
- Copied `deployFiles.sh` over from the `simon` project per the deliverable
  instructions; deploy with
  `./deployFiles.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s startup`
  to publish under `startup.beatstockfish.click`.
- **Gotcha**: `deployFiles.sh` only ever copies files into `services/<service>/public`
  on the box - it doesn't touch Caddy. The AWS deliverable's Caddyfile had
  `startup.beatstockfish.click` grouped with the bare domain and rooted at
  `/usr/share/caddy` (the placeholder landing page), so deploying didn't actually
  change what visitors saw. Fixed by giving `startup.beatstockfish.click` its own
  Caddy block rooted at `/home/ubuntu/services/startup/public` (same pattern as the
  `simon` block), then `sudo caddy validate` + `sudo systemctl reload caddy`. Old
  Caddyfile backed up as `~/Caddyfile.bak-startup` on the server. Confirmed live at
  <https://startup.beatstockfish.click>.

## CSS deliverable

Applied the same layout techniques used in the `simon` tutorial project, but to
Stockfish Survival's actual pages/content rather than duplicating the tutorial:

- One shared `main.css` (flex header/main/footer, the `menu { flex-direction: row
  !important; }` override to stop Bootstrap's navbar from stacking on narrow
  screens, and the `@media (max-height: 600px)` rule that hides the header/footer
  on short screens) plus one page-specific stylesheet each: `about.css`,
  `play.css`, `leaderboard.css`.
- Added the Bootstrap 5.3.3 CDN link to all four pages for the navbar, buttons,
  form controls, and table styling, same version/integrity hash as `simon`.
- Replaced the `play.html` chessboard's per-cell `bgcolor` attributes with a pure
  CSS checkerboard: `#board tr:nth-child(odd) td:nth-child(odd)` +
  `tr:nth-child(even) td:nth-child(even)` for the light squares, and the inverse
  pairing for dark squares. Board width is `min(90vw, 500px)` with
  `aspect-ratio: 1/1` so it stays square and never overflows on mobile.
  `.game-status` (moves survived / move clock / buttons) switches from a row to a
  column in `@media (orientation: portrait)`.
- Removed the old `border`/`cellspacing`/`cellpadding` table attributes in favor of
  CSS (`border-collapse`, padding on `td`), consistent with the class's push to
  move presentational HTML into CSS.
- Imported Google Fonts' `Cinzel` in `main.css` (`@import url(...)`) and applied it
  to `h2`/`.navbar-brand` for a chess-appropriate display face, satisfying the
  "imported font" rubric item.

### Gotchas found by re-reading the CSS deliverable against the rubric

- **Stylesheet load order matters.** All four pages linked the page-specific
  stylesheet(s) *before* the Bootstrap CDN link. Since same-specificity CSS rules
  resolve by source order, Bootstrap's `.navbar-brand { font-size: 1.25rem }` was
  silently winning over my own `.navbar-brand` font-size override — my CSS wasn't
  doing nothing, it was just losing a tie every time. Fixed by always linking
  Bootstrap first, then local stylesheets, in every page's `<head>`.
- **A `position: fixed` nav doesn't participate in flex sizing.** `header { flex: 0
  80px; }` only reserves 80px of space in normal document flow; it does nothing to
  guarantee the actual `nav.fixed-top` (which is removed from flow) is 80px tall.
  If the nav's content is wider than the viewport and Bootstrap's default
  `flex-wrap: wrap` kicks in, the nav grows to two lines and the second line
  overlaps whatever the 80px spacer assumed was clear. My original `menu {
  flex-direction: row !important; }` only stopped the *inner* list from stacking
  into a column — it didn't stop the *outer* `.navbar` from wrapping. Measuring it
  out, the brand text + all four nav links (particularly "Leaderboard") need well
  over 500px at their natural size, which doesn't fit in the 375px floor `body`
  claims to support. Fixed with `flex-wrap: nowrap` on `.navbar`/`menu`, an
  `overflow-x: auto` fallback so an overly narrow viewport scrolls the nav bar
  itself instead of covering page content, and a `max-width: 480px` media query
  that shrinks the brand/link font size and padding so real phone widths fit
  without needing to scroll at all.
- **A shared class needs its rule in a shared stylesheet.** `.player-name` was only
  defined in `play.css`, but the same class is also used on `index.html`, which
  doesn't link `play.css` — so the "Playing as: Guest" text was silently unstyled
  on the home page. Moved the rule into `main.css`.
- Deployed with `./deployFiles.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s startup`.
