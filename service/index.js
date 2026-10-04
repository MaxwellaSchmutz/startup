const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const DB = require('./database.js');

const app = express();

// Production runs this under PM2 as "startup" on 4000; Vite proxies /api here while debugging.
const port = process.argv.length > 2 ? process.argv[2] : 4000;

const authCookieName = 'token';
const gameResults = ['checkmate', 'resign', 'time', 'draw', 'win'];

app.use(express.json());
app.use(cookieParser());

// The bundled React frontend (deployService.sh copies Vite's dist here)
app.use(express.static('public'));

const apiRouter = express.Router();
app.use('/api', apiRouter);

// CreateAuth: register a new user and log them in
apiRouter.post('/auth/create', async (req, res) => {
  const { email, password } = credentials(req.body);
  if (!email || !password) {
    res.status(400).send({ msg: 'Enter a valid email address and a password.' });
  } else {
    try {
      const user = await createUser(email, password);
      setAuthCookie(res, user.token);
      res.send({ email: user.email });
    } catch (err) {
      // The unique email index rejects a second account for the same address
      if (err.code !== 11000) throw err;
      res.status(409).send({ msg: `An account for ${email} already exists. Try logging in instead.` });
    }
  }
});

// GetAuth: log in an existing user
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = credentials(req.body);
  const user = await findUser('email', email);
  if (user && password && (await bcrypt.compare(password, user.password))) {
    user.token = uuid.v4();
    await DB.setToken(user.email, user.token);
    setAuthCookie(res, user.token);
    res.send({ email: user.email });
    return;
  }
  res.status(401).send({ msg: 'Incorrect email or password.' });
});

// DeleteAuth: log out, invalidating the token on the server too
apiRouter.delete('/auth/logout', async (req, res) => {
  const user = await findUser('token', req.cookies[authCookieName]);
  if (user) {
    await DB.removeToken(user.email);
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

// GetMyGames: the logged-in player's recent games and personal best
apiRouter.get('/user/games', verifyAuth, async (req, res) => {
  res.send(await DB.getPlayerGames(req.user.email));
});

// SubmitScore: record a finished game for the logged-in player. The name and
// date come from the server, not the request, so nobody can post as someone else.
// The leaderboard only ever returns the part of the email before the @.
apiRouter.post('/score', verifyAuth, async (req, res) => {
  const moves = Number(req.body?.moves);
  const result = req.body?.result;
  if (!Number.isInteger(moves) || moves < 0 || moves > 1000 || !gameResults.includes(result)) {
    res.status(400).send({ msg: 'A score needs a whole number of moves and a valid result.' });
    return;
  }

  const createdAt = new Date();
  const date = createdAt.toLocaleDateString('en-US', { timeZone: 'America/Denver' });
  const email = req.user.email;
  await DB.addScore({ email, name: email.split('@')[0], moves, result, date, createdAt });
  res.send(await DB.getHighScores());
});

// Default error handler, including malformed JSON bodies
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).send({ type: err.name, msg: err.message });
});

// Any other path is a client-side route (/play, /leaderboard, ...): serve the
// app. A missing file like /logo.png is a real 404, not the app's HTML.
app.use((req, res) => {
  if (/\.\w+$/.test(req.path)) {
    res.status(404).send({ msg: 'Not found' });
  } else {
    res.sendFile('index.html', { root: 'public' });
  }
});

// Trims and normalizes the email so " Max@BYU.edu" and "max@byu.edu" are one account
function credentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { email: email.includes('@') ? email : '', password };
}

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { email, password: passwordHash, token: uuid.v4() };
  await DB.addUser(user);
  return user;
}

async function findUser(field, value) {
  if (!value) return null;
  return field === 'token' ? DB.getUserByToken(value) : DB.getUser(value);
}

function setAuthCookie(res, authToken) {
  res.cookie(authCookieName, authToken, {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  });
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
