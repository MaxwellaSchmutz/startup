const GameEvent = {
  System: 'system',
  End: 'gameEnd',
  Start: 'gameStart',
};

class EventMessage {
  constructor(from, type, value) {
    this.from = from;
    this.type = type;
    this.value = value;
  }
}

const reconnectDelayMs = 3000;

// Game events travel over a WebSocket to the service's peerProxy, which
// forwards each message to every other connected player.
class GameEventNotifier {
  events = [];
  handlers = [];

  constructor() {
    this.connect();
  }

  connect() {
    // Same host and port as the page; wss when the page is served over https
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    this.socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    this.socket.onopen = () => {
      this.receiveEvent(new EventMessage('Simon', GameEvent.System, { msg: 'connected' }));
    };
    this.socket.onclose = () => {
      this.receiveEvent(new EventMessage('Simon', GameEvent.System, { msg: 'disconnected' }));
      // Try again, e.g. after the service restarts on a deploy
      setTimeout(() => this.connect(), reconnectDelayMs);
    };
    this.socket.onmessage = async (msg) => {
      try {
        const event = JSON.parse(await msg.data.text());
        this.receiveEvent(event);
      } catch {}
    };
  }

  broadcastEvent(from, type, value) {
    const event = new EventMessage(from, type, value);
    // The server only forwards to the other players, so show our own event here
    this.receiveEvent(event);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  // Hand each handler only the new event (the course version replayed the whole
  // history to every handler on each message, duplicating entries)
  receiveEvent(event) {
    this.events.push(event);
    this.handlers.forEach((handler) => handler(event));
  }
}

const GameNotifier = new GameEventNotifier();
export { GameEvent, GameNotifier };
