// Live game feed over a WebSocket to the service (service/peerProxy.js). The
// server pushes who's online, games starting, and saved games; this module keeps
// one shared connection for the whole app and hands each message to whichever
// components are listening.

export const GameEvent = {
  Start: 'gameStart', // { name }
  End: 'gameEnd', // { name, moves, result }
  Presence: 'presence', // { online }
  Status: 'status', // { connected } (local only: the socket opened or closed)
};

const reconnectDelayMs = 3000;

class LiveFeed {
  handlers = [];
  connected = false;
  online = 0;

  constructor() {
    this.connect();
  }

  connect() {
    // Same host as the page (Vite proxies /ws to the service while debugging);
    // wss when the page is served over https
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    this.socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    this.socket.onopen = () => {
      this.connected = true;
      this.notify({ type: GameEvent.Status, connected: true });
    };
    this.socket.onclose = () => {
      this.connected = false;
      this.notify({ type: GameEvent.Status, connected: false });
      // e.g. the service restarted during a deploy: keep trying
      setTimeout(() => this.connect(), reconnectDelayMs);
    };
    this.socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        if (event.type === GameEvent.Presence) this.online = event.online;
        this.notify(event);
      } catch {
        // ignore anything that isn't JSON
      }
    };
  }

  // The server reads the login cookie once, when the socket connects, so after
  // logging in or out the app reopens the connection to pick up the new cookie
  reconnect() {
    this.socket.onclose = null;
    this.socket.close();
    this.connected = false;
    this.connect();
  }

  // The server attaches the logged-in player's name; guests' announcements are ignored
  announceGameStart() {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: GameEvent.Start }));
    }
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  notify(event) {
    this.handlers.forEach((handler) => handler(event));
  }
}

export const GameNotifier = new LiveFeed();
