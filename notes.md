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
  to publish under `startup.beatstockfish.click` (already the DNS name pointed at by
  the AWS deliverable).
