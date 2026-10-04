import React from 'react';
import { GameEvent, GameNotifier } from './gameNotifier';
import { displayName } from '../login/authService';
import { plural, resultText } from './results';

const maxEvents = 8;

function othersOnline(count) {
  if (count === 0) return 'no one else';
  return count === 1 ? '1 other person' : `${count} other people`;
}

function describe(event) {
  if (event.type === GameEvent.Start) return 'started a new game';
  return `survived ${plural(event.moves, 'move')} (${resultText[event.result] ?? event.result})`;
}

export function LiveActivity({ userName }) {
  const [events, setEvents] = React.useState([]);
  const [connected, setConnected] = React.useState(GameNotifier.connected);
  const [online, setOnline] = React.useState(GameNotifier.online);

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
    setConnected(GameNotifier.connected);
    setOnline(GameNotifier.online);
    return () => GameNotifier.removeHandler(handleEvent);
  }, []);

  const myName = userName ? displayName(userName) : null;
  const others = Math.max(online - 1, 0);

  return (
    <aside className="live-activity card-surface" aria-label="Live activity">
      <div className="live-head">
        <h2 className="panel-heading">Live activity</h2>
        <p className={`live-status ${connected ? 'live' : 'offline'}`}>
          <span className="live-dot" aria-hidden="true" />
          {connected
            ? `Live · ${othersOnline(others)} on the site`
            : 'Reconnecting...'}
        </p>
      </div>
      <ul className="notification">
        {events.length === 0 && (
          <li className="waiting">Games from everyone playing right now show up here as they happen.</li>
        )}
        {events.map((event) => (
          <li
            key={event.id}
            className={`${event.name === myName ? 'own-event' : ''} ${event.type === GameEvent.End ? 'ended' : 'started'}`}
          >
            <span className="player-name">{event.name === myName ? 'You' : event.name}</span> {describe(event)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
