// Mocked live game feed. In the WebSocket deliverable these events will be
// pushed from the server whenever another player starts or finishes a game.
// Until then a timer fabricates events from made-up players.

export const GameEvent = {
  Start: 'gameStart',
  End: 'gameEnd',
};

const fakePlayers = ['Ada', 'Tim', 'Priya', 'rookie_rook', 'Magnus_Fan_42', '도윤 이', 'KnightRider'];
const fakeResults = ['checkmate', 'resign', 'time'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class GameEventNotifier {
  handlers = [];
  timer = null;

  broadcastEvent(from, type, value = {}) {
    const event = { from, type, value, id: crypto.randomUUID() };
    this.handlers.forEach((handler) => handler(event));
  }

  addHandler(handler) {
    this.handlers.push(handler);
    // only simulate traffic while someone is listening
    if (!this.timer) {
      this.timer = setInterval(() => this.simulateOtherPlayer(), 4000);
    }
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
    if (this.handlers.length === 0) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  simulateOtherPlayer() {
    const name = pick(fakePlayers);
    if (Math.random() < 0.4) {
      this.broadcastEvent(name, GameEvent.Start);
    } else {
      this.broadcastEvent(name, GameEvent.End, { moves: 5 + Math.floor(Math.random() * 60), result: pick(fakeResults) });
    }
  }
}

export const GameNotifier = new GameEventNotifier();
