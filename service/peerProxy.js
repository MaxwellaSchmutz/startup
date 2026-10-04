const { WebSocketServer, WebSocket } = require('ws');
const DB = require('./database.js');
const { authCookieName, displayName } = require('./auth.js');

const pingIntervalMs = 10000;
const gameStartCooldownMs = 5000;

function tokenFromCookies(header = '') {
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === authCookieName) return decodeURIComponent(value.join('='));
  }
  return null;
}

function peerProxy(httpServer) {
  const socketServer = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 1024 });

  socketServer.on('error', () => {});

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
    socket.on('error', () => socket.terminate());

    socket.on('message', async (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      if (message?.type !== 'gameStart' || !DB.isReady()) return;
      if (Date.now() - (socket.lastStart || 0) < gameStartCooldownMs) return;
      socket.lastStart = Date.now();

      try {
        const user = await DB.getUserByToken(tokenFromCookies(request.headers.cookie));
        if (user) {
          broadcast({ type: 'gameStart', name: displayName(user.email) });
        }
      } catch {}
    });

    broadcastPresence();
  });

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
