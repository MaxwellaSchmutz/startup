import React from 'react';
import { loadScores } from './scores';
import { displayName } from '../login/authService';
import './leaderboard.css';

export function Leaderboard({ userName }) {
  const [scores, setScores] = React.useState([]);

  // Load once when the view opens. In the DB deliverable this becomes a fetch
  // to the backend, which is why it lives in an effect rather than in render.
  React.useEffect(() => {
    setScores(loadScores());
  }, []);

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
              <td colSpan="4">No games yet. Be the first to survive!</td>
            </tr>
          ) : (
            scores.map((score, i) => (
              <tr key={i} className={userName && score.name === userName ? 'own-score' : ''}>
                <td>{i + 1}</td>
                <td>{displayName(score.name)}</td>
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
