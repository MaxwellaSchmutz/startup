const { MongoClient } = require('mongodb');
const config = require('./dbConfig.json');

// MongoDB runs on the same EC2 box as the service, so dbConfig.json's hostname is
// "127.0.0.1:27017" and the users live in the admin database. An Atlas hostname
// (no port) would use the mongodb+srv:// form instead. MONGO_URL overrides both,
// which is handy for pointing a local debug session at a throwaway database.
function connectionUrl() {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  const user = encodeURIComponent(config.userName);
  const password = encodeURIComponent(config.password);
  if (config.hostname.includes(':')) {
    return `mongodb://${user}:${password}@${config.hostname}/?authSource=admin`;
  }
  return `mongodb+srv://${user}:${password}@${config.hostname}`;
}

// Reassigned on each connection attempt: after a failed connect the driver
// closes the client ("Topology is closed"), so a retry needs a fresh one.
let client;
let userCollection;
let scoreCollection;

// Leaderboard rows are public, so they never include the player's email. Only
// the timestamp is stored; each browser formats it in the player's own locale.
const publicScoreFields = { _id: 0, name: 1, moves: 1, result: 1, createdAt: 1 };

const retryDelayMs = 5000;
let ready = false;

// Connect and make sure the indexes exist (the unique email index is what stops
// two simultaneous registrations for the same address). If MongoDB isn't up yet,
// e.g. the server just rebooted and mongod is still starting, keep retrying
// instead of crashing; until then the API answers 503 (see isReady).
(async function initialize() {
  for (let attempt = 1; !ready; attempt++) {
    try {
      client = new MongoClient(connectionUrl());
      const db = client.db('startup');
      userCollection = db.collection('user');
      scoreCollection = db.collection('score');

      await db.command({ ping: 1 });
      await userCollection.createIndex({ email: 1 }, { unique: true });
      await userCollection.createIndex({ token: 1 });
      await scoreCollection.createIndex({ moves: -1, createdAt: 1 });
      await scoreCollection.createIndex({ email: 1, createdAt: -1 });
      ready = true;
      console.log(`Connected to database at ${process.env.MONGO_URL ? 'MONGO_URL' : config.hostname}`);
    } catch (ex) {
      console.log(`Database not available (attempt ${attempt}): ${ex.message}. Retrying in ${retryDelayMs / 1000}s`);
      await client.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
})();

function isReady() {
  return ready;
}

function getUser(email) {
  if (typeof email !== 'string') return Promise.resolve(null);
  return userCollection.findOne({ email });
}

function getUserByToken(token) {
  if (typeof token !== 'string') return Promise.resolve(null);
  return userCollection.findOne({ token });
}

// Throws a duplicate key error (code 11000) if the email is already registered
async function addUser(user) {
  await userCollection.insertOne(user);
}

async function setToken(email, token) {
  await userCollection.updateOne({ email }, { $set: { token } });
}

async function removeToken(email) {
  await userCollection.updateOne({ email }, { $unset: { token: 1 } });
}

async function addScore(score) {
  await scoreCollection.insertOne({ ...score });
  return { name: score.name, moves: score.moves, result: score.result, createdAt: score.createdAt };
}

// Top ten by moves survived; on a tie the earlier game ranks higher
function getHighScores() {
  return scoreCollection
    .find({}, { sort: { moves: -1, createdAt: 1 }, limit: 10, projection: publicScoreFields })
    .toArray();
}

// A player's ten most recent games plus their all-time best
async function getPlayerGames(email) {
  const recent = await scoreCollection
    .find({ email }, { sort: { createdAt: -1 }, limit: 10, projection: publicScoreFields })
    .toArray();
  const best = await scoreCollection.findOne(
    { email },
    { sort: { moves: -1, createdAt: 1 }, projection: publicScoreFields }
  );
  const total = await scoreCollection.countDocuments({ email });
  return { best, recent, total };
}

// Public totals: games played, registered players, and the best game ever
async function getStats() {
  const totalGames = await scoreCollection.countDocuments();
  const totalPlayers = await userCollection.countDocuments();
  const best = await scoreCollection.findOne({}, { sort: { moves: -1, createdAt: 1 }, projection: { _id: 0, moves: 1 } });
  return { totalGames, totalPlayers, bestMoves: best?.moves ?? 0 };
}

module.exports = {
  isReady,
  getUser,
  getUserByToken,
  addUser,
  setToken,
  removeToken,
  addScore,
  getHighScores,
  getPlayerGames,
  getStats,
};
