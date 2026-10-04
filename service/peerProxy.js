const { WebSocketServer, WebSocket } = require('ws');
const DB = require('./database.js');

const authCookieName = 'token';
const pingIntervalMs = 10000;

// Pulls the auth token out of the cookie header sent with the WebSocket upgrade
// request (the same httpOnly cookie the REST endpoints use).
function tokenFromCookies(header = '') {
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === authCookieName) return decodeURIComponent(value.join('='));
  }
  return null;
}

// Live game feed over WebSocket at /ws. Unlike a plain relay, the server decides
// what gets sent and who it's from, so nobody can post activity as someone else:
//   server -> clients  { type: 'presence', online }               people connected
//                      { type: 'gameStart', name }                 a player started a game
//                      { type: 'gameEnd', name, moves, result }   a saved game (sent by index.js)
//   client -> server   { type: 'gameStart' }   only honored from a logged-in player
function peerProxy(httpServer) {
  const socketServer = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 1024 });

  function broadcast(message) {
    const data = JSON.stringify(message);
    socketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  }

  function broadcastPresence() {
    broadcast({ type: 'presence', online: socketServer.clients.size });
  }

  socketServer.on('connection', (socket, request) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('close', broadcastPresence);

    socket.on('message', async (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      if (message?.type !== 'gameStart' || !DB.isReady()) return;

      // Look the player up on every message, so a logged-out token stops working
      const token = tokenFromCookies(request.headers.cookie);
      const user = token && (await DB.getUserByToken(token));
      if (user) {
        broadcast({ type: 'gameStart', name: user.email.split('@')[0] });
      }
    });

    broadcastPresence();
  });

  // Ping every client; one that didn't answer the last ping is gone, so drop it
  setInterval(() => {
    socketServer.clients.forEach((client) => {
      if (client.isAlive === false) return client.terminate();
      client.isAlive = false;
      client.ping();
    });
  }, pingIntervalMs);

  return { broadcast };
}

module.exports = { peerProxy };
