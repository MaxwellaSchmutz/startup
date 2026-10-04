import React from 'react';
import { loadScores } from './scores';
import { displayName } from '../login/authService';
import './leaderboard.css';

export function Leaderboard({ userName }) {
  const [scores, setScores] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Fetch the leaderboard from the service when the view opens.
  React.useEffect(() => {
    loadScores()
      .then(setScores)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
                <td>{score.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
