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

## Simon React Phase 1: Routing

Ported `webprogramming260/simon-css` (snapshot `03dbd4c`) to Vite + React in
this repo's `simon/` folder, so all course work stays in one repo. Each porting
step from the instructions is its own commit (Install Vite → Reorganize →
React Bootstrap → Enable React → App component → view stubs → router → one
commit per converted page → deployReact.sh), which is the same commit-per-step
rhythm to use when porting the startup.

- **MPA → SPA**: one `index.html` with `<div id="root">` + root `index.jsx`
  that renders `src/app.jsx`. The old `index.html` became `login.html`, then
  was converted into `src/login/login.jsx` and deleted, same for each page.
- **Router**: `BrowserRouter` wraps the app, `<a href="play.html">` became
  `<NavLink to="play">`, and `<Routes>` replaced `<main>`, with a `*` route
  rendering `NotFound` ("404: Return to sender...").
- **JSX gotchas hit**: `class` → `className`; `body` selector → `.body` since
  React renders inside a `<div>`; JSX drops whitespace between inline elements
  (Login/Create buttons, "Player:" label) so it needs explicit `{' '}`; images
  live in `public/` and are referenced as `/placeholder.jpg` so they work on
  any route.
- **Windows gotcha**: `deployReact.sh` must have LF line endings or bash on the
  server/Git Bash chokes, so `simon/.gitattributes` forces `*.sh eol=lf`.
- **Deploy**: from `simon/`, run
  `./deployReact.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s simon`
  (it runs `npm install` + `npm run build` and ships `dist/`). Because
  `BrowserRouter` uses real paths, opening `/play` directly needs Caddy to fall
  back to `index.html`: add `try_files {path} /index.html` to the
  `simon.beatstockfish.click` block (done 2026-10-01; backup at
  `/etc/caddy/Caddyfile.bak-simon-react`).
- Live at <https://simon.beatstockfish.click> (deep links like `/play` work).

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

### Response to a second round of CSS review feedback

Got five more suggestions on the CSS deliverable. Verified each against the spec
before touching anything - two held up, one was worth a smaller fix than what
was suggested, and two were technically wrong, so I left the code as-is on those.

Accepted:

- **Contrast + DRY, combined.** `about.css`'s `.stat-rating` and `leaderboard.css`'s
  top-row highlight both used the same `rgb(221, 148, 40)` gold, and both display it
  on light backgrounds (`bg-light` and Bootstrap's `.table-warning`). Computed
  contrast against those backgrounds is only ~2.3:1 - well under the 4.5:1 WCAG AA
  minimum for normal-sized text. Defined a single `--accent-gold: rgb(133, 89, 24)`
  custom property on `:root` in `main.css` (same hue, darkened enough for ~5.5:1
  and ~5.8:1 contrast against those two backgrounds) and pointed both files at
  `var(--accent-gold)` instead of repeating the literal RGB value.
- **Dropped `!important` on the navbar override.** `menu { flex-direction: row
  !important; }` needed `!important` because Bootstrap's `.navbar-nav` sets
  `flex-direction: column` via a class selector, which beats a bare `menu` element
  selector on specificity regardless of source order. Changed the selector to the
  compound `menu.navbar-nav` (element + class), which outranks Bootstrap's
  single-class selector on its own, so the `!important` could come off.

Rejected, with reasoning:

- **`<menu>` → `<ul>`.** The claim was that Bootstrap's CSS is "optimized for
  `<ul>`," but Bootstrap styles navbars entirely by class (`.navbar-nav`), never by
  tag name, and the HTML standard defines `<menu>` to have the same default
  rendering and ARIA role as `<ul>`. There's no behavioral difference. It's also
  literally what the course's own `simon-css` example uses
  (`<menu class="navbar-nav">`), so switching away from it would be inconsistent
  with the class's own reference implementation. Left as `<menu>`.
- **`flex: 1 calc(100vh - 110px)` "ambiguity."** The suggestion assumed the
  calc() was being parsed as the *shrink* factor and proposed `flex: 1 0
  calc(...)`. Per the CSS flexbox spec, a two-value `flex: <number> <length>`
  shorthand is unambiguous: the second value can only be `flex-basis` (a
  `<number>` there would mean shrink; a length/calc can't), so this was already
  being parsed as grow=1, basis=calc(...), shrink=1 (default) - exactly what
  the suggestion wanted, just implicit. Their proposed value would have actually
  *changed* behavior by setting shrink to 0, which risks reintroducing overflow
  at borderline viewport heights - the opposite of what we want. Instead, wrote
  all three flex values out explicitly (`flex: 1 1 calc(100vh - 110px)`, and
  `flex: 0 1 80px`/`flex: 0 1 30px` on header/footer) so the existing behavior is
  spelled out instead of relying on shorthand disambiguation, with no behavior
  change.

## Startup React Phase 1: Routing

Ported Stockfish Survival to Vite + React at the repo root using the same steps
(and one commit per step) as the Simon port in `simon/`.

- `index.html` became `login.html`, then `src/login/login.jsx`; `play.html`,
  `leaderboard.html`, `about.html` became `src/play`, `src/leaderboard`,
  `src/about` components, each importing its own CSS. `src/notfound/notfound.jsx`
  handles unknown routes. Header/nav/footer now exist once in `src/app.jsx`.
- **SPA CSS gotcha**: Vite bundles every component's CSS into one global
  stylesheet, so page-specific bare selectors leak across views. The leaderboard's
  `td { white-space: nowrap; max-width: 40vw }` would have hit the chessboard, so
  it's now scoped to `.table td`.
- **Board fix**: the empty middle ranks collapsed to thin strips (true of the old
  `play.html` too) and `text-light` made the black pieces look white. Fixed with a
  `height: calc(min(90vw, 500px) / 8)` and `color: #111` on `#board td`.
- **React details**: `for` → `htmlFor`, `readonly` → `readOnly`, `<tr>` needs a
  `<tbody>` parent, and React Bootstrap `Button`s default to `type="button"`, so the
  login/Chess.com `<form>`s don't submit until Phase 2 adds handlers.
- **Grader feedback applied to Simon**: dropped `exact` (React Router v6+ doesn't
  use it) and moved `NotFound` into `simon/src/notfound/notfound.jsx`.
- Deployed with `./deployReact.sh -k ~/.ssh/beatstockfish-key.pem -h beatstockfish.click -s startup`,
  and added `try_files {path} /index.html` to the `startup.beatstockfish.click`
  Caddy block (backup at `/etc/caddy/Caddyfile.bak-startup-react`) so deep links
  work. Live at <https://startup.beatstockfish.click>.

## Simon React Phase 2: Reactivity

Brought the final `webprogramming260/simon-react` code into `simon/` over my
Phase 1 port (keeping the Phase 1 grader fixes and the newer React 19 / React
Router 7 deps, which it runs on unchanged), ran it, and stepped through it.

- **Lifting state up**: `App` owns `userName`/`authState` and hands `Login` an
  `onAuthChange` callback. Login changes it, App re-renders, and the nav shows
  Play/Scores only when authenticated. Child → parent communication is just a
  function prop.
- **Refs to drive children**: `SimonButton` uses `forwardRef` +
  `useImperativeHandle` to expose `press()`, so `SimonGame` can "push" buttons
  to play back the sequence. That's the escape hatch when a parent needs to
  call into a child instead of passing props down.
- **Effects run after state actually changes**: `setSequence` is async, so the
  sequence playback lives in `useEffect(..., [sequence])` instead of right after
  the setter call.
- **Bugs I found while studying it** (each fixed in its own commit):
  - `removeHandler` called `filter` without assigning the result, so every
    visit to Play leaked a handler.
  - `Players` prepended the new event and then kept `slice(1, 10)`, which
    dropped the newest event instead of the oldest.
  - The scores table showed zero-based ranks.
  - `Modal show` was given a string instead of a boolean.
- **Functional updates**: `setEvent(prev => [event, ...prev])` matters inside a
  handler registered once in `useEffect(..., [])`. A plain `events` reference
  there is the stale value from the first render.
- Redeployed with `deployReact.sh -s simon`. The game, sounds, scores, and
  login/logout work live at <https://simon.beatstockfish.click>.

## Startup React Phase 2: Reactivity

Made Stockfish Survival actually playable: a real chess game against a mock
engine, with login, a live feed, a leaderboard, and the Chess.com lookup, all
mocked where a later deliverable will supply the real thing.

- **Rules from a library, UI from React**: `chess.js` (in a `useRef`, so the
  same instance survives re-renders) owns legality, check, mate, and draws.
  React state only holds what's on screen. Setting `fen` after each move is
  what triggers the re-render and re-runs the effects.
- **Effects as the game loop**: one effect asks the engine to move when it's
  black's turn, one ticks the clock on white's turn, and one ends the game when
  the clock hits zero. Each effect returns a cleanup, so `clearInterval` (or a
  `cancelled` flag for the engine's promise) means a reset or navigating away
  never lets a stale timer or engine reply touch the new game.
- **Stale closures**: `endGame` takes the move count as an argument rather than
  reading `movesSurvived`, because when the player's own move ends the game the
  state setter hasn't applied yet.
- **Mocks with the real interface**: `getEngineMove()`, `getPlayerStats()`,
  `login()`/`createAccount()`, and `loadScores()`/`saveScore()` are async or
  shaped like the eventual service calls, so the later deliverables swap their
  bodies instead of the components. The Chess.com mock returns the same JSON
  shape as `/pub/player/{user}/stats`.
- **Mock engine**: 2-ply minimax with alpha-beta, material plus a
  centralization bonus, and a random choice among near-best moves. It's about
  0.2s per move in the browser and beat a random-move player in every test game.
- **Windows glyph gotcha**: `♟` (U+265F) has an emoji presentation, so it
  rendered as a purple emoji pawn. Appending U+FE0E (the text variation
  selector) forces the plain glyph.
- **Highlight trick**: the squares' colors come from high-specificity
  `#board tr:nth-child td:nth-child` rules, so the selection/check/last-move
  tints use `box-shadow: inset 0 0 0 100px rgba(...)` instead of fighting them
  with `background-color`.
- **Don't store passwords in localStorage**, even in a mock. The fake account
  store only remembers which emails registered.
- Tested end to end with playwright-core driving Edge: login errors, account
  creation, a full game to checkmate, a clock timeout, the leaderboard, the
  Chess.com lookup, reload persistence, and logout.

### Guest play and real Stockfish (WebAssembly)

- **Guest play**: anyone can play, but only logged-in players' games are saved
  to the leaderboard and broadcast to the live feed. That keeps something
  meaningful behind authentication (the Login deliverable grades restricting
  functionality by auth state), and it's the part that should need an account
  anyway, since the leaderboard is the competitive part.
- **Stockfish in the browser**: the `stockfish` npm package (Stockfish.js) ships
  several builds. The full NNUE build is about 99 MB, and the multi-threaded
  builds need `SharedArrayBuffer`, which means cross-origin isolation headers
  (COOP/COEP) from the server. The **lite single-threaded** build is a 1.8 MB
  `.wasm` plus a 21 KB loader and needs no special headers, and it's still far
  stronger than any human. I copied just those two files (and the GPL license)
  into `public/stockfish/` instead of adding the whole 200 MB package as a
  dependency.
- **UCI over a Web Worker**: `new Worker('/stockfish/stockfish-19-lite-single.js')`,
  then `postMessage('uci')` → wait for `uciok`, `isready` → `readyok`, then
  `position fen <fen>` + `go nodes 60000` → `bestmove e7e5 ...`. The loader finds
  its `.wasm` next to itself.
- **Nodes, not time**: `go movetime` would make it weaker on slow phones.
  `go nodes` is the same work everywhere, so every player faces the same
  opponent. Measured in Edge: about 0.2 s to load, about 400k nodes/s, so a
  60k-node move takes about 0.15 s.
- **One search at a time**: if New Game is pressed mid-search, the old
  `bestmove` still arrives later. Chaining searches on a promise queue means a
  new request can't mistake the old answer for its own.
- **Graceful fallback**: if the worker fails (blocked, old browser), the old
  minimax in `fallbackEngine.js` plays instead. I tested this by blocking
  `/stockfish/**` in Playwright.
- **GPL**: Stockfish is GPLv3, so the license ships alongside it and the About
  page credits it with source links.

## PM2 on the production server

The course's prebuilt server image comes with Node + PM2, but I built my own
Ubuntu 24.04 EC2 box, so until now Caddy served each site's files straight from
disk and `pm2 ls` returned `command not found`. Set it up the course way:

- Installed nvm (v0.40.3) → Node 24 LTS → `npm install -g pm2` (PM2 7.0.4), all
  as the `ubuntu` user. nvm only loads in interactive shells, so
  `ssh host 'pm2 ls'` fails. Use `ssh host 'bash -ic "pm2 ls"'` or source
  `~/.nvm/nvm.sh` first.
- Each site is now a Node process: `deploy/staticServer.cjs` (built-in modules
  only, listens on 127.0.0.1) copied to `~/services/<service>/` and started with
  `pm2 start staticServer.cjs --name simon -- 3000` / `--name startup -- 4000`.
  It serves `public/` with the SPA fallback to `index.html`, a proper
  `application/wasm` type for Stockfish, and long-lived caching for Vite's hashed
  `/assets`. `deployReact.sh` only replaces `public/`, so redeploys don't touch
  it, and the Service deliverable will swap it for an Express `index.js`.
- Caddy's `simon` and `startup` blocks became `reverse_proxy localhost:3000` /
  `localhost:4000` (backup at `/etc/caddy/Caddyfile.bak-pm2`). Caddy still does
  HTTPS, and the bare domain still serves `/usr/share/caddy`.
- `pm2 startup systemd` + `pm2 save` make the processes come back after a reboot.
  Verified by `pm2 kill` → `systemctl start pm2-ubuntu`, which brought both
  apps back from the saved dump.

`pm2 ls` columns: **id/name** of each app; **mode** `fork` (one process, vs
`cluster`); **pid**; **uptime**; **↺** restart count (PM2 restarts crashed apps
automatically); **status** `online`; **cpu/mem** usage; **user** it runs as;
**watching** whether it auto-restarts on file changes.

## Simon Service

Brought `webprogramming260/simon-service` into `simon/`: an Express 5 backend in
`simon/service` (port 3000) with cookie auth and in-memory users/scores, the
frontend calling it with `fetch`, and About fetching a picsum image and a
quote from quote.cs260.click. My earlier Simon fixes were kept.

- **Two npm projects in one repo**: the frontend's `package.json` at the root
  (bundled by Vite) and the backend's in `service/`. Backend dependencies must be
  installed *in `service/`*, or the deployed service crashes with missing modules
  and Caddy returns 502.
- **Bugs found while studying it** (each fixed in its own commit):
  - A missing email or password crashed bcrypt and returned 500 with the
    internal error text. It now returns 400.
  - `POST /api/score` stored any JSON, including another player's name. It now
    takes the name from the auth token and validates the score.
  - Malformed JSON gave a 500; the error handler now passes through `err.status`.
  - Leaving Play mid-sequence threw on a null ref (`ref.current?.press`).
- **deployService.sh** `rm -rf`s `~/services/simon`, copies `index.js`,
  `package*.json`, and the Vite build as `public/`, runs `npm install` on the
  server, then `pm2 restart simon`. Because PM2 remembered the old
  `staticServer.cjs` path, the first deploy needed a one-time
  `pm2 delete simon && pm2 start index.js --name simon -- 3000 && pm2 save`
  from inside `~/services/simon`. The cwd matters, since `express.static('public')`
  is relative to it.

## Startup Service

- **Endpoints**: `POST /api/auth/create`, `POST /api/auth/login`,
  `DELETE /api/auth/logout`, `GET /api/user/me` (auth), `GET /api/scores`
  (public), and `POST /api/score` (auth). `verifyAuth` middleware looks up the
  user by the `token` cookie and attaches `req.user`, so handlers never trust a
  name sent in the body.
- **Don't leak emails**: the leaderboard is public, so scores store only the part
  of the email before the @.
- **Cookie auth**: the token is a random UUID in an `httpOnly` (JS can't read
  it), `secure` (HTTPS only; browsers treat `localhost` as secure), and
  `sameSite=strict` cookie. localStorage just remembers *which* email was logged
  in for an instant first render, and `GET /api/user/me` on load catches a stale
  one. That matters because in-memory sessions vanish whenever the service
  restarts or redeploys.
- **Vite proxy**: `vite.config.js` forwards `/api` to `localhost:4000` during
  `npm run dev`, so the frontend uses the same relative URLs in dev and prod.
- **Express 5 fallback**: `app.use((req, res) => res.sendFile('index.html', { root: 'public' }))`
  after the routes lets the React router handle `/play` and `/leaderboard`. A
  path with a file extension gets a 404 instead, so a broken image link doesn't
  silently receive HTML.
- **Real third-party call**: the Chess.com PubAPI allows CORS and needs no key,
  so the browser fetches `/pub/player/{u}` and `/pub/player/{u}/stats` directly.
  Plain `curl` gets a Cloudflare 403 challenge; a real browser `fetch` works.
- **Mobile**: replaced the fixed-top nav with a sticky React Bootstrap `Navbar`
  that collapses into a hamburger below 768px. The fixed header used to rely on
  a guessed 80px gap. Dropped `.body { min-width: 375px }`, which caused
  sideways scroll on 320-360px phones. One `--board-size` CSS variable drives the
  board width, square height, and piece size. `touch-action: manipulation`
  removes the double-tap-zoom delay on squares and buttons. Testing tip:
  Playwright's `isMobile` widens `innerWidth` to fit overflowing content, so
  check `scrollWidth` against the configured viewport width, not `innerWidth`.

## Self-hosted MongoDB (instead of Atlas)

- Installed MongoDB on the EC2 box rather than making an Atlas account. **8.0
  wouldn't start**: "Linux kernel versions 6.19 and newer has a known
  incompatibility" (SERVER-121912, a TCMalloc rseq bug; the box runs kernel 7.0).
  MongoDB 7.0 isn't packaged for Ubuntu 24.04, but the 22.04 (jammy) `.deb`
  installs fine (`apt-get install -s` showed every dependency resolving), so I
  installed 7.0.43 and ran `apt-mark hold mongodb-org-server` so an upgrade can't
  pull 8.0 back in.
- Locked down: `bindIp: 127.0.0.1`, `security.authorization: enabled`, an `admin`
  root user plus a `webapp` user with `readWrite` on only `simon` and `startup`.
  Passwords were generated on the server with `openssl rand` and only exist in
  mode-600 files (`~/dbConfig.json`, `~/.mongo-admin.json`).
- Small box: `wiredTiger.engineConfig.cacheSizeGB: 0.25` (the default takes
  about half of RAM) and a 1 GB `/swapfile` in `/etc/fstab` as an OOM safety net.
- `dbConfig.json` is git-ignored, and `deployService.sh` copies `service/*.json`,
  so it rides along to the server on every deploy without ever reaching GitHub.
- **Connection string**: Atlas uses `mongodb+srv://user:pw@cluster.xxx.mongodb.net`.
  A plain host with a port uses `mongodb://user:pw@127.0.0.1:27017/?authSource=admin`
  (the users were created in the `admin` db). `database.js` picks based on whether
  the hostname has a port, and `MONGO_URL` overrides it for local debugging.
- **Local testing** without the server: `mongodb-memory-server` starts a
  throwaway `mongod` (`MongoMemoryServer.create()`), then run the service with
  `MONGO_URL=mongodb://127.0.0.1:<port>/ node index.js`.
- mongosh over ssh: `node` and `pm2` come from nvm, so source `~/.nvm/nvm.sh`
  first. Long one-line `--eval` scripts through ssh are a quoting nightmare, so
  `scp` a `.js` file and run `mongosh <url> file.js` instead.

## Simon DB

- `database.js` wraps the collections (`getUser`, `getUserByToken`, `addUser`,
  `updateUser`, `updateUserRemoveAuth`, `addScore`, `getHighScores`), and
  `index.js` just awaits them instead of touching arrays. `getHighScores` is a
  query with `sort` + `limit`, so the database does the ranking.
- Sessions are stored on the user document, so a restart no longer logs
  everyone out. `getHighScores` deliberately skips a score of 0 (`$gt: 0`).

## Startup DB

- `user` collection: `{ email, password: <bcrypt hash>, token }`. `score`
  collection: `{ email, name, moves, result, date, createdAt }`.
- **Indexes** are created on startup: `email` unique (a duplicate insert throws
  error code 11000, which becomes a 409; three simultaneous sign-ups for one
  email gave 200/409/409), `token` for the per-request auth lookup, and
  `{ moves: -1, createdAt: 1 }` and `{ email: 1, createdAt: -1 }` for the
  leaderboard and "your games" queries.
- **Projection** keeps emails out of public responses:
  `{ _id: 0, name: 1, moves: 1, result: 1, date: 1 }`.
- New `GET /api/user/games` (auth required) returns the best, the ten most
  recent, and a count, shown in "Your games" on the leaderboard.
- **CSS specificity gotcha**: the public table's gold first-row rule
  (`.table tbody tr:first-child:not(.empty-state) td`) is (0,3,3), so
  `.my-games .table td` lost. Matching it with
  `.my-games .table tbody tr:first-child td` and placing it later fixed it.

## Simon WebSocket

- `service/peerProxy.js` attaches `new WebSocketServer({ server: httpServer })`
  to the HTTP server that `app.listen` returns, so HTTP and WebSocket share port
  3000. It relays each message to every *other* client and uses ping/pong
  (`isAlive` flag, ping every 10s, `terminate()` anyone who didn't pong) to drop
  dead connections.
- Caddy's `reverse_proxy` passes WebSocket upgrades through with no extra
  config. The page uses `wss://` when served over https.
- Vite needs `'/ws': { target: 'ws://localhost:3000', ws: true }` in its proxy
  to debug locally.
- **Bugs in the course version** (avoided in mine):
  - Logout did `delete user.token; DB.updateUser(user)`, but `updateUser` uses
    `$set`, which can't remove a field, so the token stayed valid after logout.
    Use `$unset`.
  - `receiveEvent` re-sent the *whole* event history to every handler on each
    new message, so the feed filled with duplicates.
  - `removeHandler` dropped the `filter` result again.
  - No reconnect, and `send()` while the socket is still connecting throws. I
    added a reconnect and a `readyState === OPEN` check.
- The "connected" system event fires at page load, before the Play view
  subscribes, so it never shows up there. That's harmless.

## Startup WebSocket

- **The server is the source of truth**: instead of blindly relaying whatever
  a client sends (like Simon), the server builds every message. `gameEnd`
  comes from `POST /api/score` after the game is saved. A client's `gameStart`
  is only honored if the socket's auth cookie maps to a user in MongoDB, and
  the server attaches the name. A raw client sending a fake name gets nothing.
- **Cookies on WebSocket**: the browser sends cookies with the upgrade request,
  and the server parses `request.headers.cookie` then. That's *once per
  connection*, so a socket opened before login stays anonymous. Fix: reconnect
  the socket in `onAuthChange`.
- **Secure cookies vs `ws://localhost`**: Chrome sends `Secure` cookies to
  `http://localhost` but not on the `ws://localhost` upgrade, so the live feed
  couldn't see the login while debugging. Fix: `secure: req.secure` with
  `app.set('trust proxy', 'loopback')`, so the cookie is `Secure` behind
  Caddy (which sets `X-Forwarded-Proto: https`) and plain on local http.
  Verified the live `Set-Cookie` still says `HttpOnly; Secure; SameSite=Strict`.
- **Race on mount**: the socket can open between a component's first render and
  its `useEffect` subscribing, which loses the "connected" event. Re-read
  `GameNotifier.connected` and `online` right after `addHandler`.
- Closing a socket that's still `CONNECTING` logs a browser error ("closed
  before the connection is established"), so `reconnect()` closes it in its
  `onopen` instead.
- **Live leaderboard**: a `version` counter in state, bumped on every `gameEnd`
  message, is a `useEffect` dependency for the fetch, so the table and "Your
  games" reload whenever anyone saves a game.
- Testing: Playwright with several browser contexts (each its own cookie jar)
  plus a raw `ws` client, all against the live `wss://` endpoint.

## Practice, coach, and tutor

- The Stockfish lite WASM build supports `Skill Level` 0-20, `UCI_LimitStrength` +
  `UCI_Elo` (1320-3190), and `MultiPV`. Send `setoption` before `go`, and only
  when the settings change, since the same worker also plays ranked games at full
  strength.
- **Two workers**: one plays and one analyzes, each with its own promise queue,
  so the coach never delays the opponent's move. Analysis results are cached per
  FEN, so the "before" analysis from while you were thinking gets reused when
  grading your move.
- **Grading**: compare the eval of the position before your move (best play)
  with the eval after it, both from White's point of view. Stockfish reports
  scores from the side to move, so flip the sign when Black is to move. A mate in
  N becomes about ±(10000 - 10N) so mates compare sensibly with centipawns.
- **Threat detection** = a null move: flip the side to move in the FEN (and clear
  en passant), ask Stockfish for Black's best move, and report it if it mates or
  wins a piece.
- chess.js `attackers(square, color)` finds hanging pieces: attacked and
  undefended, or attacked by a cheaper piece.
- **AI tutor**: never let an LLM do chess analysis itself. It hallucinates moves.
  Feed it Stockfish's facts and only ask it to explain them. Bedrock's `Converse`
  API works the same for any model. Load the AWS SDK only when a model is
  configured (it slowed service startup and costs memory on a t3.micro). Without
  credentials the SDK throws `CredentialsProviderError`, which becomes a friendly
  503.
