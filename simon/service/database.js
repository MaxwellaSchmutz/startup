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
const db = client.db('simon');
const userCollection = db.collection('user');
const scoreCollection = db.collection('score');

// Fail fast on startup if the database is unreachable or the credentials are wrong
(async function testConnection() {
  try {
    await db.command({ ping: 1 });
    console.log(`Connected to database at ${process.env.MONGO_URL ? 'MONGO_URL' : config.hostname}`);
  } catch (ex) {
    console.log(`Unable to connect to database because ${ex.message}`);
    process.exit(1);
  }
})();

function getUser(email) {
  return userCollection.findOne({ email: email });
}

function getUserByToken(token) {
  return userCollection.findOne({ token: token });
}

async function addUser(user) {
  await userCollection.insertOne(user);
}

async function updateUser(user) {
  await userCollection.updateOne({ email: user.email }, { $set: user });
}

async function updateUserRemoveAuth(user) {
  await userCollection.updateOne({ email: user.email }, { $unset: { token: 1 } });
}

async function addScore(score) {
  return scoreCollection.insertOne(score);
}

function getHighScores() {
  const query = { score: { $gt: 0, $lt: 900 } };
  const options = {
    sort: { score: -1 },
    limit: 10,
    projection: { _id: 0 },
  };
  const cursor = scoreCollection.find(query, options);
  return cursor.toArray();
}

module.exports = {
  getUser,
  getUserByToken,
  addUser,
  updateUser,
  updateUserRemoveAuth,
  addScore,
  getHighScores,
};
