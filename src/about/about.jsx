import React from 'react';
import Button from 'react-bootstrap/Button';
import { getPlayerStats } from './chesscomService';
import './about.css';

const defaultPlayer = 'MagnusCarlsen';

export function About() {
  const [username, setUsername] = React.useState('');
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function lookUp(name) {
    setLoading(true);
    setError('');
    try {
      setStats(await getPlayerStats(name));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Show a well-known player when the page first opens.
  React.useEffect(() => {
    lookUp(defaultPlayer);
  }, []);

  const blitz = stats?.chess_blitz;

  return (
    <main className="bg-secondary">
      <div id="picture" className="picture-box">
        <img
          width="500"
          src="/stockfish-survival-wireframe.png"
          alt="Rough wireframe of the login, game, and leaderboard views"
        />
      </div>

      <p>
        Stockfish Survival is a competitive chess game where the goal is not to beat Stockfish, but to survive against
        it for as many moves as possible. Every player faces the same engine difficulty and move time limit, so scores
        are directly comparable. Completed games are saved and ranked on a global leaderboard.
      </p>

      <p>Every game ends the same three ways: checkmate, resignation, or running out of time on the move clock.</p>

      <p className="engine-credit">
        Your opponent is{' '}
        <a className="text-reset" href="https://github.com/official-stockfish/Stockfish">
          Stockfish 19
        </a>
        , running right in your browser as WebAssembly thanks to{' '}
        <a className="text-reset" href="https://github.com/nmrugg/stockfish.js">
          Stockfish.js
        </a>
        . Both are free software under the{' '}
        <a className="text-reset" href="/stockfish/COPYING.txt">
          GNU GPL v3
        </a>
        .
      </p>

      <div>
        {/* Third party service: Chess.com PubAPI lookup (mocked in chesscomService.js) */}
        <h2>Look up a Chess.com player</h2>
        <p>Enter a Chess.com username to see their public blitz stats, pulled from the Chess.com PubAPI.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookUp(username);
          }}
        >
          <div className="input-group mb-3">
            <label className="input-group-text" htmlFor="chesscomUsername">
              Username
            </label>
            <input
              className="form-control"
              type="text"
              id="chesscomUsername"
              name="chesscomUsername"
              placeholder="hikaru"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button variant="primary" type="submit" disabled={!username.trim() || loading}>
              {loading ? 'Looking up...' : 'Look up stats'}
            </Button>
          </div>
        </form>

        {error && <div className="stat-error">{error}</div>}

        {blitz && (
          <div id="chesscomStats" className={`stat-box bg-light text-dark ${loading ? 'stale' : ''}`}>
            <div>
              Username: <span className="stat-username">{stats.username}</span>
            </div>
            <div>
              Blitz rating: <span className="stat-rating">{blitz.last.rating}</span>
            </div>
            <div>
              Wins: <span className="stat-wins">{blitz.record.win}</span>
            </div>
            <div>
              Losses: <span className="stat-losses">{blitz.record.loss}</span>
            </div>
            <div>
              Draws: <span className="stat-draws">{blitz.record.draw}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
