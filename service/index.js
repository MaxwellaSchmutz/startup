const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const DB = require('./database.js');
const { peerProxy } = require('./peerProxy.js');

const app = express();

// Production runs this under PM2 as "startup" on 4000; Vite proxies /api here while debugging.
const port = process.argv.length > 2 ? process.argv[2] : 4000;

const authCookieName = 'token';
const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const gameResults = ['checkmate', 'resign', 'time', 'draw', 'win'];
// Enforced when registering. Login doesn't check the minimum, so older accounts still work.
const minPasswordLength = 8;
// bcrypt only looks at the first 72 bytes of a password, so anything longer is rejected
const maxPasswordBytes = 72;
const maxEmailLength = 254;
const dummyHash = bcrypt.hashSync('not-a-real-password', 10);

const siteUrl = 'https://startup.beatstockfish.click';
const pageMeta = {
  '/': {
    title: 'Stockfish Survival · Survive Stockfish as long as you can',
    description:
      'Stockfish Survival: play chess against Stockfish 19 right in your browser and see how many moves you can survive. Free, with a live global leaderboard.',
  },
  '/leaderboard': {
    title: 'Leaderboard · Stockfish Survival',
    description: 'The players who survived the longest against Stockfish 19, updated live as games finish.',
  },
  '/learn': {
    title: 'Learn to play · Stockfish Survival',
    description: 'Learn how every chess piece moves, special moves like castling and en passant, and how games end, with interactive boards.',
  },
  '/about': {
    title: 'About · Stockfish Survival',
    description: 'How Stockfish Survival works, who made it, and a live Chess.com player lookup.',
  },
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self' wss: ws: https://api.chess.com",
  "img-src 'self' data: blob: https://images.chesscomfiles.com https://*.chess.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Caddy terminates HTTPS on this box and forwards to us on localhost with
// X-Forwarded-Proto and X-Forwarded-For, so trust it for req.secure and req.ip
app.set('trust proxy', 'loopback');

// Security headers on every response. Caddy handles TLS, so HSTS stays modest
// (no preload). COEP stays off so the Chess.com avatar images still load.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: { maxAge: 180 * 24 * 60 * 60, includeSubDomains: false },
  })
);
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

app.use(compression({ filter: (req, res) => /wasm/.test(res.getHeader('Content-Type') || '') || compression.filter(req, res) }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// The bundled React frontend (deployService.sh copies Vite's dist here)
app.use(express.static('public'));

const apiRouter = express.Router();
app.use('/api', apiRouter);

// Until the database connection is up (it retries on startup), answer API calls
// with 503 instead of failing them one by one.
apiRouter.use((_req, res, next) => {
  if (DB.isReady()) {
    next();
  } else {
    res.status(503).send({ msg: 'The game server is still starting up. Try again in a few seconds.' });
  }
});

// Rate limits (kept in memory, which is fine for a single server process).
// Login only counts failed attempts, so a player who types the right password isn't slowed down.
const loginLimiter = limiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  msg: 'Too many failed login attempts. Wait a few minutes and try again.',
});
const createLimiter = limiter({
  name: 'create',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  msg: 'Too many accounts created from your network. Wait a few minutes and try again.',
});
// Scores are limited per player rather than per IP (verifyAuth runs first)
const scoreLimiter = limiter({
  name: 'score',
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.email,
  msg: "You've submitted a lot of games this hour. Take a short break and try again later.",
});

function limiter({ name, msg, ...options }) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...options,
    handler: (req, res, _next, opts) => {
      securityLog('rate_limited', { limiter: name, ip: req.ip, email: req.user?.email });
      res.status(opts.statusCode).send({ msg });
    },
  });
}

// CreateAuth: register a new user and log them in
apiRouter.post('/auth/create', createLimiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  if (!email || !password) {
    res.status(400).send({ msg: 'Enter a valid email address and a password.' });
  } else if (password.length < minPasswordLength) {
    res.status(400).send({ msg: `Choose a password with at least ${minPasswordLength} characters.` });
  } else if (Buffer.byteLength(password) > maxPasswordBytes) {
    res.status(400).send({ msg: `Choose a password with at most ${maxPasswordBytes} characters.` });
  } else {
    try {
      const user = await createUser(email, password);
      setAuthCookie(req, res, user.token);
      securityLog('register', { email, ip: req.ip });
      res.send({ email: user.email });
    } catch (err) {
      // The unique email index rejects a second account for the same address
      if (err.code !== 11000) throw err;
      securityLog('register_duplicate', { email, ip: req.ip });
      res.status(409).send({ msg: `An account for ${email} already exists. Try logging in instead.` });
    }
  }
});

// GetAuth: log in an existing user
apiRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  const passwordOk = password && Buffer.byteLength(password) <= maxPasswordBytes;
  const user = await findUser('email', email);
  const matches = await bcrypt.compare(passwordOk ? password : 'x', user?.password ?? dummyHash);
  if (user && passwordOk && matches) {
    if (!user.token) {
      user.token = uuid.v4();
      await DB.setToken(user.email, user.token);
    }
    setAuthCookie(req, res, user.token);
    securityLog('login_success', { email: user.email, ip: req.ip });
    res.send({ email: user.email });
    return;
  }
  securityLog('login_failure', { email: email || null, ip: req.ip });
  res.status(401).send({ msg: 'Incorrect email or password.' });
});

// DeleteAuth: log out, invalidating the token on the server too
apiRouter.delete('/auth/logout', async (req, res) => {
  const user = await findUser('token', req.cookies[authCookieName]);
  if (user) {
    await DB.removeToken(user.email);
    securityLog('logout', { email: user.email, ip: req.ip });
  }
  res.clearCookie(authCookieName);
  res.status(204).end();
});

// Middleware: only let requests with a valid auth cookie through
const verifyAuth = async (req, res, next) => {
  const user = await findUser('token', req.cookies[authCookieName]);
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).send({ msg: 'Unauthorized' });
  }
};

// GetMe: who the auth cookie belongs to (the frontend checks this on load)
apiRouter.get('/user/me', verifyAuth, (req, res) => {
  res.send({ email: req.user.email });
});

// GetScores: the public leaderboard
apiRouter.get('/scores', async (_req, res) => {
  res.send(await DB.getHighScores());
});

// GetStats: public totals for the landing page
apiRouter.get('/stats', async (_req, res) => {
  res.send(await DB.getStats());
});

// GetMyGames: the logged-in player's recent games and personal best
apiRouter.get('/user/games', verifyAuth, async (req, res) => {
  res.send(await DB.getPlayerGames(req.user.email));
});

// SubmitScore: record a finished game for the logged-in player. The name and
// timestamp come from the server, not the request, so nobody can post as someone else.
// The leaderboard only ever returns the part of the email before the @.
apiRouter.post('/score', verifyAuth, scoreLimiter, async (req, res) => {
  const moves = req.body?.moves;
  const result = req.body?.result;
  if (!Number.isInteger(moves) || moves < 0 || moves > 1000 || !gameResults.includes(result)) {
    res.status(400).send({ msg: 'A score needs a whole number of moves and a valid result.' });
    return;
  }

  // Only the timestamp is stored; the browser formats it for the player's locale.
  // Responds with just the new score; the frontend fetches the leaderboard when it needs it.
  const email = req.user.email;
  const score = await DB.addScore({ email, name: email.split('@')[0], moves, result, createdAt: new Date() });
  // Tell everyone connected over WebSocket; their live feed and leaderboard update
  liveFeed?.broadcast({ type: 'gameEnd', name: score.name, moves, result });
  res.status(201).send(score);
});

// Default error handler. Bad requests get a short explanation; anything else is
// logged here with an id and the client only sees a generic message.
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).send({ msg: 'Malformed request body' });
  } else if (err.type === 'entity.too.large') {
    res.status(413).send({ msg: 'Request body is too large' });
  } else if (err.status >= 400 && err.status < 500) {
    res.status(err.status).send({ msg: err.expose ? err.message : 'Bad request' });
  } else {
    const id = uuid.v4().slice(0, 8);
    securityLog('server_error', { id, method: req.method, path: req.path, ip: req.ip, error: err.message });
    console.error(err);
    res.status(500).send({ msg: 'Something went wrong', id });
  }
});

// Any other path is a client-side route (/play, /leaderboard, ...): serve the
// app. A missing file like /logo.png is a real 404, not the app's HTML.
app.use((req, res) => {
  if (/\.\w+$/.test(req.path)) {
    res.status(404).send({ msg: 'Not found' });
  } else {
    sendIndex(req, res);
  }
});

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendIndex(req, res) {
  const meta = pageMeta[req.path];
  let indexHtml;
  try {
    indexHtml = meta && (await fs.promises.readFile(path.resolve('public', 'index.html'), 'utf8'));
  } catch {
    indexHtml = null;
  }
  if (!indexHtml) {
    res.sendFile('index.html', { root: 'public' });
    return;
  }
  const url = siteUrl + req.path;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const html = indexHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, `$1${description}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, `$1${description}"`);
  res.type('html').set('Cache-Control', 'no-cache').send(html);
}

// Trims and normalizes the email so " Max@BYU.edu" and "max@byu.edu" are one account
function credentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const validEmail = email.includes('@') && email.length <= maxEmailLength;
  return { email: validEmail ? email : '', password };
}

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { email, password: passwordHash, token: uuid.v4() };
  await DB.addUser(user);
  return user;
}

async function findUser(field, value) {
  if (typeof value !== 'string' || !value) return null;
  return field === 'token' ? DB.getUserByToken(value) : DB.getUser(value);
}

// secure (HTTPS-only) whenever the request came over HTTPS, which is always the
// case in production. On plain-http localhost while debugging the cookie can't be
// secure, or the browser won't send it on the ws:// live feed connection.
function setAuthCookie(req, res, authToken) {
  res.cookie(authCookieName, authToken, {
    secure: req.secure,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: sessionMaxAgeMs,
  });
}

// One JSON line per security event (never passwords or tokens)
function securityLog(event, fields) {
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...fields }));
}

const httpService = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// WebSocket live feed (/ws) on the same HTTP server
const liveFeed = peerProxy(httpService);
