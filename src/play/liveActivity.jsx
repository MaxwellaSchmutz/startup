import React from 'react';
import { GameEvent, GameNotifier } from './gameNotifier';
import { displayName } from '../login/authService';

const maxEvents = 8;

function describe(event) {
  if (event.type === GameEvent.Start) return 'started a new game';
  const { moves, result } = event.value;
  return `survived ${moves} move${moves === 1 ? '' : 's'} (${result})`;
}

export function LiveActivity({ userName }) {
  const [events, setEvents] = React.useState([]);

  // Subscribe to the (mocked) live feed while this component is on screen.
  React.useEffect(() => {
    function handleGameEvent(event) {
      setEvents((previous) => [event, ...previous].slice(0, maxEvents));
    }

    GameNotifier.addHandler(handleGameEvent);
    return () => GameNotifier.removeHandler(handleGameEvent);
  }, []);

  return (
    <div>
      <h2>Live activity</h2>
      <ul className="notification">
        {events.length === 0 && <li className="waiting">Waiting for other players...</li>}
        {events.map((event) => (
          <li key={event.id} className={event.from === displayName(userName) ? 'own-event' : ''}>
            <span className="player-name">{event.from}</span> {describe(event)}
          </li>
        ))}
      </ul>
    </div>
  );
}
