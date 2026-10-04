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

const client = new MongoClient(connectionUrl());
const db = client.db('startup');
const userCollection = db.collection('user');
const scoreCollection = db.collection('score');

// Leaderboard rows are public, so they never include the player's email
const publicScoreFields = { _id: 0, name: 1, moves: 1, result: 1, date: 1 };

// Fail fast on startup if the database is unreachable or the credentials are
// wrong, and make sure the indexes exist. The unique email index is what stops
// two simultaneous registrations for the same address.
(async function initialize() {
  try {
    await db.command({ ping: 1 });
    await userCollection.createIndex({ email: 1 }, { unique: true });
    await userCollection.createIndex({ token: 1 });
    await scoreCollection.createIndex({ moves: -1, createdAt: 1 });
    await scoreCollection.createIndex({ email: 1, createdAt: -1 });
    console.log(`Connected to database at ${process.env.MONGO_URL ? 'MONGO_URL' : config.hostname}`);
  } catch (ex) {
    console.log(`Unable to connect to database because ${ex.message}`);
    process.exit(1);
  }
})();

function getUser(email) {
  return userCollection.findOne({ email });
}

function getUserByToken(token) {
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

module.exports = {
  getUser,
  getUserByToken,
  addUser,
  setToken,
  removeToken,
  addScore,
  getHighScores,
  getPlayerGames,
};
