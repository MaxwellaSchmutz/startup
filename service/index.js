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
const { authCookieName, displayName } = require('./auth.js');

const app = express();

const port = process.argv.length > 2 ? process.argv[2] : 4000;

const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const gameResults = ['checkmate', 'resign', 'time', 'draw', 'win'];
const minPasswordLength = 8;
const maxPasswordBytes = 72;
const maxEmailLength = 254;
const timingSafeDummyHash =bcrypt.hashSync('not-a-real-password', 10);

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

app.set('trust proxy', 'loopback');

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
app.use(express.static('public'));

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.use((_req, res, next) => {
  if (DB.isReady()) {
    next();
  } else {
    res.status(503).send({ msg: 'The game server is still starting up. Try again in a few seconds.' });
  }
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
const scoreLimiter = limiter({
  name: 'score',
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.email,
  msg: "You've submitted a lot of games this hour. Take a short break and try again later.",
});

apiRouter.post('/auth/create', createLimiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  if (!email || !password) {
    res.status(400).send({ msg: 'Enter a valid email address and a password.' });
  } else if (password.length < minPasswordLength) {
    res.status(400).send({ msg: `Choose a password with at least ${minPasswordLength} characters.` });
  } else if (Buffer.byteLength(password) > maxPasswordBytes) {
    res.status(400).send({ msg: `Choose a password with at most ${maxPasswordBytes} characters.` });
  } else {
    const token = uuid.v4();
    try {
      await DB.addUser({ email, password: await bcrypt.hash(password, 10), tokens: [token] });
    } catch (err) {
      const isDuplicateEmail = err.code === 11000;
      if (!isDuplicateEmail) throw err;
      securityLog('register_duplicate', { email, ip: req.ip });
      res.status(409).send({ msg: `An account for ${email} already exists. Try logging in instead.` });
      return;
    }
    setAuthCookie(req, res, token);
    securityLog('register', { email, ip: req.ip });
    res.send({ email });
  }
});

apiRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  const user = email ? await DB.getUser(email) : null;
  if (await passwordMatches(user, password)) {
    const token = uuid.v4();
    await DB.addToken(user, token);
    setAuthCookie(req, res, token);
    securityLog('login_success', { email: user.email, ip: req.ip });
    res.send({ email: user.email });
    return;
  }
  securityLog('login_failure', { email: email || null, ip: req.ip });
  res.status(401).send({ msg: 'Incorrect email or password.' });
});

apiRouter.delete('/auth/logout', async (req, res) => {
  const token = req.cookies[authCookieName];
  const user = await DB.getUserByToken(token);
  if (user) {
    await DB.removeToken(token);
    securityLog('logout', { email: user.email, ip: req.ip });
  }
  res.clearCookie(authCookieName);
  res.status(204).end();
});

async function verifyAuth(req, res, next) {
  const user = await DB.getUserByToken(req.cookies[authCookieName]);
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).send({ msg: 'Unauthorized' });
  }
}

apiRouter.get('/user/me', verifyAuth, (req, res) => {
  res.send({ email: req.user.email });
});

apiRouter.get('/scores', async (_req, res) => {
  res.send(await DB.getHighScores());
});

apiRouter.get('/stats', async (_req, res) => {
  res.send(await DB.getStats());
});

apiRouter.get('/user/games', verifyAuth, async (req, res) => {
  res.send(await DB.getPlayerGames(req.user.email));
});

apiRouter.post('/score', verifyAuth, scoreLimiter, async (req, res) => {
  const moves = req.body?.moves;
  const result = req.body?.result;
  if (!Number.isInteger(moves) || moves < 0 || moves > 1000 || !gameResults.includes(result)) {
    res.status(400).send({ msg: 'A score needs a whole number of moves and a valid result.' });
    return;
  }

  const email = req.user.email;
  const score = await DB.addScore({ email, name: displayName(email), moves, result, createdAt: new Date() });
  liveFeed.broadcast({ type: 'gameEnd', name: score.name, moves, result });
  res.status(201).send(score);
});

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

app.use((req, res) => {
  const looksLikeFile = /\.\w+$/.test(req.path);
  if (looksLikeFile) {
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
  const indexHtml = meta && (await fs.promises.readFile(path.resolve('public', 'index.html'), 'utf8').catch(() => null));
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

function credentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const validEmail = email.includes('@') && email.length <= maxEmailLength;
  return { email: validEmail ? email : '', password };
}

async function passwordMatches(user, password) {
  const candidate = password && Buffer.byteLength(password) <= maxPasswordBytes ? password : '';
  const matches = await bcrypt.compare(candidate, user?.password ?? timingSafeDummyHash);
  return Boolean(user && candidate && matches);
}

function setAuthCookie(req, res, token) {
  res.cookie(authCookieName, token, {
    secure: req.secure,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: sessionMaxAgeMs,
  });
}

function securityLog(event, fields) {
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...fields }));
}

const httpService = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const liveFeed = peerProxy(httpService);
