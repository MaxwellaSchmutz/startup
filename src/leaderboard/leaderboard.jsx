import React from 'react';
import { formatDate, loadScores } from './scores';
import { MyGames } from './myGames';
import { GameEvent, GameNotifier } from '../play/gameNotifier';
import { displayName } from '../login/authService';
import './leaderboard.css';

export function Leaderboard({ userName }) {
  const [scores, setScores] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  // Bumped whenever the server pushes a newly saved game over WebSocket
  const [version, setVersion] = React.useState(0);

  // Fetch the leaderboard when the view opens and again after every live update
  React.useEffect(() => {
    loadScores()
      .then((latest) => {
        setScores(latest);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [version]);

  React.useEffect(() => {
    function handleEvent(event) {
      if (event.type === GameEvent.End) setVersion((v) => v + 1);
    }
    GameNotifier.addHandler(handleEvent);
    return () => GameNotifier.removeHandler(handleEvent);
  }, []);

  let emptyMessage = 'No games yet. Be the first to survive!';
  if (loading) emptyMessage = 'Loading the leaderboard...';
  if (error) emptyMessage = error;

  return (
    <main className="container-fluid bg-secondary text-center">
      <h2>Top survivors</h2>
      <p>Best completed attempts, stored in the database.</p>

      <table className="table table-warning table-striped-columns">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Moves survived</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {scores.length === 0 ? (
            <tr className="empty-state">
              <td colSpan="4">{emptyMessage}</td>
            </tr>
          ) : (
            scores.map((score, i) => (
              <tr key={i} className={userName && score.name === displayName(userName) ? 'own-score' : ''}>
                <td>{i + 1}</td>
                <td>{score.name}</td>
                <td>{score.moves}</td>
                <td>{formatDate(score.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {userName && <MyGames version={version} />}
    </main>
  );
}
