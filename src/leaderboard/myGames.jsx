import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatShortDate, loadMyGames } from './scores';
import { plural, resultLabels } from '../play/results';
import { useAuth } from '../login/authContext';

export function MyGames({ version }) {
  const [games, setGames] = React.useState(null);
  const [error, setError] = React.useState('');
  const { sessionExpired } = useAuth();

  React.useEffect(() => {
    loadMyGames()
      .then(setGames)
      .catch((err) => {
        if (err.status === 401) sessionExpired();
        else setError(err.message);
      });
  }, [version]);

  if (error) {
    return (
      <section className="my-games card-surface">
        <h2>Your games</h2>
        <p className="my-games-note">{error}</p>
      </section>
    );
  }
  if (!games) {
    return (
      <section className="my-games card-surface" aria-busy="true">
        <h2>Your games</h2>
        <p className="my-games-note">Loading your games...</p>
      </section>
    );
  }
  if (games.total === 0) {
    return (
      <section className="my-games card-surface">
        <h2>Your games</h2>
        <p className="my-games-note">You haven't finished a game yet. Your games will show up here.</p>
        <Link className="btn btn-primary" to="/">
          Play your first game
        </Link>
      </section>
    );
  }

  return (
    <section className="my-games card-surface">
      <h2>Your games</h2>
      <div className="my-stats">
        <div className="my-stat">
          <span className="my-stat-label">Personal best</span>
          <span className="personal-best">{plural(games.best.moves, 'move')}</span>
          <span className="my-stat-sub">{formatDate(games.best.createdAt)}</span>
        </div>
        <div className="my-stat">
          <span className="my-stat-label">Played</span>
          <span className="my-stat-value">{games.total}</span>
          <span className="my-stat-sub">game{games.total === 1 ? '' : 's'}</span>
        </div>
      </div>
      <table className="table table-sm my-games-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Moves</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {games.recent.map((game, i) => (
            <tr key={i}>
              <td title={formatDate(game.createdAt)}>{formatShortDate(game.createdAt)}</td>
              <td className="moves">{game.moves}</td>
              <td>
                <span className={`result-pill ${game.result}`}>{resultLabels[game.result] ?? game.result}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
