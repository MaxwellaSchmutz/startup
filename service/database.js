const { MongoClient } = require('mongodb');
const config = require('./dbConfig.json');

const retryDelayMs = 5000;
const maxSessionsPerUser = 10;
const publicScoreFields = { _id: 0, name: 1, moves: 1, result: 1, createdAt: 1 };
const rankOrder = { moves: -1, createdAt: 1 };

let userCollection;
let scoreCollection;
let ready = false;

function connectionUrl() {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  const user = encodeURIComponent(config.userName);
  const password = encodeURIComponent(config.password);
  if (config.hostname.includes(':')) {
    return `mongodb://${user}:${password}@${config.hostname}/?authSource=admin`;
  }
  return `mongodb+srv://${user}:${password}@${config.hostname}`;
}

(async function connectWithRetries() {
  for (let attempt = 1; !ready; attempt++) {
    const client = new MongoClient(connectionUrl());
    try {
      const db = client.db('startup');
      userCollection = db.collection('user');
      scoreCollection = db.collection('score');

      await db.command({ ping: 1 });
      await userCollection.createIndex({ email: 1 }, { unique: true });
      await userCollection.createIndex({ tokens: 1 });
      await userCollection.createIndex({ token: 1 });
      await scoreCollection.createIndex(rankOrder);
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

function legacySingleSessionQuery(token) {
  return { token };
}

function getUser(email) {
  return userCollection.findOne({ email });
}

async function getUserByToken(token) {
  if (typeof token !== 'string' || !token) return null;
  return userCollection.findOne({ $or: [{ tokens: token }, legacySingleSessionQuery(token)] });
}

async function addUser(user) {
  await userCollection.insertOne(user);
}

async function addToken(user, token) {
  const carriedOverTokens = user.token ? [user.token, token] : [token];
  await userCollection.updateOne(
    { email: user.email },
    { $push: { tokens: { $each: carriedOverTokens, $slice: -maxSessionsPerUser } }, $unset: { token: '' } }
  );
}

async function removeToken(token) {
  await userCollection.updateOne({ tokens: token }, { $pull: { tokens: token } });
  await userCollection.updateOne(legacySingleSessionQuery(token), { $unset: { token: '' } });
}

async function addScore(score) {
  await scoreCollection.insertOne(score);
  return { name: score.name, moves: score.moves, result: score.result, createdAt: score.createdAt };
}

function getHighScores() {
  return scoreCollection
    .find({}, { sort: rankOrder, limit: 10, projection: publicScoreFields })
    .toArray();
}

async function getPlayerGames(email) {
  const recent = await scoreCollection
    .find({ email }, { sort: { createdAt: -1 }, limit: 10, projection: publicScoreFields })
    .toArray();
  const best = await scoreCollection.findOne(
    { email },
    { sort: rankOrder, projection: publicScoreFields }
  );
  const total = await scoreCollection.countDocuments({ email });
  return { best, recent, total };
}

async function getStats() {
  const totalGames = await scoreCollection.countDocuments();
  const totalPlayers = await userCollection.countDocuments();
  const best = await scoreCollection.findOne({}, { sort: rankOrder, projection: { _id: 0, moves: 1 } });
  return { totalGames, totalPlayers, bestMoves: best?.moves ?? 0 };
}

module.exports = {
  isReady,
  getUser,
  getUserByToken,
  addUser,
  addToken,
  removeToken,
  addScore,
  getHighScores,
  getPlayerGames,
  getStats,
};
