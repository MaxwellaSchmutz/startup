export const GameEvent = {
  Start: 'gameStart',
  End: 'gameEnd',
  Presence: 'presence',
  Status: 'status',
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
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    this.socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    this.socket.onopen = () => {
      this.connected = true;
      this.notify({ type: GameEvent.Status, connected: true });
    };
    this.socket.onclose = () => {
      this.connected = false;
      this.notify({ type: GameEvent.Status, connected: false });
      setTimeout(() => this.connect(), reconnectDelayMs);
    };
    this.socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        if (event.type === GameEvent.Presence) this.online = event.online;
        this.notify(event);
      } catch {}
    };
  }

  reconnect() {
    const old = this.socket;
    old.onclose = null;
    old.onmessage = null;
    if (old.readyState === WebSocket.CONNECTING) {
      old.onopen = () => old.close();
    } else {
      old.onopen = null;
      old.close();
    }
    this.connected = false;
    this.connect();
  }

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
