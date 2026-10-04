import React from 'react';
import { formatDate, loadMyGames } from './scores';

const resultLabels = {
  checkmate: 'Checkmated',
  resign: 'Resigned',
  time: 'Out of time',
  draw: 'Draw',
  win: 'Won!',
};

// The logged-in player's personal best and recent games, read from the database
export function MyGames() {
  const [games, setGames] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadMyGames()
      .then(setGames)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="my-games-note">{error}</p>;
  if (!games) return <p className="my-games-note">Loading your games...</p>;
  if (games.total === 0) {
    return <p className="my-games-note">You haven't finished a game yet. Your games will show up here.</p>;
  }

  return (
    <section className="my-games">
      <h2>Your games</h2>
      <p>
        Personal best: <span className="personal-best">{games.best.moves} moves</span> ({formatDate(games.best.createdAt)}) &middot;{' '}
        {games.total} game{games.total === 1 ? '' : 's'} played
      </p>
      <table className="table table-sm table-dark table-striped">
        <thead>
          <tr>
            <th>Date</th>
            <th>Moves survived</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {games.recent.map((game, i) => (
            <tr key={i}>
              <td>{formatDate(game.createdAt)}</td>
              <td>{game.moves}</td>
              <td>{resultLabels[game.result] ?? game.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
