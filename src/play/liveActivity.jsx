import React from 'react';
import { GameEvent, GameNotifier } from './gameNotifier';
import { displayName } from '../login/authService';

const maxEvents = 8;

const resultText = {
  checkmate: 'checkmate',
  resign: 'resigned',
  time: 'ran out of time',
  draw: 'draw',
  win: 'beat Stockfish!',
};

function describe(event) {
  if (event.type === GameEvent.Start) return 'started a new game';
  const { moves, result } = event;
  return `survived ${moves} move${moves === 1 ? '' : 's'} (${resultText[result] ?? result})`;
}

// Real-time feed of everyone's games, pushed by the server over WebSocket
export function LiveActivity({ userName }) {
  const [events, setEvents] = React.useState([]);
  const [connected, setConnected] = React.useState(GameNotifier.connected);
  const [online, setOnline] = React.useState(GameNotifier.online);

  // Listen to the shared connection while this component is on screen
  React.useEffect(() => {
    let nextId = 0;
    function handleEvent(event) {
      if (event.type === GameEvent.Status) {
        setConnected(event.connected);
      } else if (event.type === GameEvent.Presence) {
        setOnline(event.online);
      } else if (event.type === GameEvent.Start || event.type === GameEvent.End) {
        const entry = { ...event, id: nextId++ };
        setEvents((previous) => [entry, ...previous].slice(0, maxEvents));
      }
    }

    GameNotifier.addHandler(handleEvent);
    // The socket may have opened between the first render and now; catch up
    setConnected(GameNotifier.connected);
    setOnline(GameNotifier.online);
    return () => GameNotifier.removeHandler(handleEvent);
  }, []);

  const myName = userName ? displayName(userName) : null;
  const others = Math.max(online - 1, 0);

  return (
    <div className="live-activity">
      <h2>Live activity</h2>
      <p className={`live-status ${connected ? 'live' : 'offline'}`}>
        {connected
          ? `● Live · ${others === 0 ? 'no one else' : others === 1 ? '1 other person' : `${others} other people`} on the site`
          : '○ Reconnecting...'}
      </p>
      <ul className="notification">
        {events.length === 0 && (
          <li className="waiting">Games from everyone playing right now show up here as they happen.</li>
        )}
        {events.map((event) => (
          <li key={event.id} className={event.name === myName ? 'own-event' : ''}>
            <span className="player-name">{event.name === myName ? 'You' : event.name}</span> {describe(event)}
          </li>
        ))}
      </ul>
    </div>
  );
}
