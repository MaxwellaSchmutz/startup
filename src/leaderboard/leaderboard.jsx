import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatShortDate, loadScores } from './scores';
import { MyGames } from './myGames';
import { GameEvent, GameNotifier } from '../play/gameNotifier';
import { displayName } from '../login/authService';
import { useAuth } from '../login/authContext';
import { Icon } from '../icons';
import './leaderboard.css';

const medals = ['gold', 'silver', 'bronze'];

function Podium({ scores, myName }) {
  const top = scores.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top[i]);
  return (
    <ol className="podium" aria-label="Top three">
      {order.map((i) => (
        <li key={i} className={`podium-spot place-${i + 1} ${top[i].name === myName ? 'is-you' : ''}`}>
          <span className={`medal ${medals[i]}`} aria-hidden="true">
            {i + 1}
          </span>
          <span className="podium-name" title={top[i].name}>
            {top[i].name}
          </span>
          <span className="podium-moves">
            <strong>{top[i].moves}</strong> {top[i].moves === 1 ? 'move' : 'moves'}
          </span>
          <span className="podium-base" aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={i} className="skeleton-row" aria-hidden="true">
      <td>
        <span className="skeleton" style={{ width: '1.2rem' }} />
      </td>
      <td>
        <span className="skeleton" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
      </td>
      <td>
        <span className="skeleton" style={{ width: '2rem' }} />
      </td>
      <td>
        <span className="skeleton" style={{ width: '4.5rem' }} />
      </td>
    </tr>
  ));
}

export function Leaderboard() {
  const { userName, openAuth } = useAuth();
  const [scores, setScores] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [version, setVersion] = React.useState(0);

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

  const myName = userName ? displayName(userName) : null;

  return (
    <main className="leaderboard">
      <header className="page-header">
        <span className="eyebrow">
          <span className="live-dot-small" aria-hidden="true" />
          Updates live
        </span>
        <h1>Top survivors</h1>
        <p>The longest anyone has lasted against Stockfish. Best completed attempts, stored in the database.</p>
      </header>

      <div className="leaderboard-layout">
        <section className="board-card card-surface" aria-label="Leaderboard">
          {scores.length >= 3 && <Podium scores={scores} myName={myName} />}

          <div className="table-wrap">
            <table className="table score-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Player</th>
                  <th scope="col">Moves</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && scores.length === 0 ? (
                  <SkeletonRows />
                ) : scores.length === 0 ? (
                  <tr className="empty-state">
                    <td colSpan="4">
                      {error ? (
                        <span className="empty-message error">
                          {error}
                          <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setVersion((v) => v + 1)}>
                            Try again
                          </button>
                        </span>
                      ) : (
                        <span className="empty-message">
                          No games yet. Be the first to survive!
                          <Link className="btn btn-sm btn-primary" to="/">
                            Play now
                          </Link>
                        </span>
                      )}
                    </td>
                  </tr>
                ) : (
                  scores.map((score, i) => (
                    <tr key={i} className={`${myName && score.name === myName ? 'own-score' : ''} ${i < 3 ? `top-${i + 1}` : ''}`}>
                      <td className="rank">
                        {i < 3 ? <span className={`medal small ${medals[i]}`}>{i + 1}</span> : i + 1}
                      </td>
                      <td className="name">
                        {score.name}
                        {myName && score.name === myName && <span className="you-chip">You</span>}
                      </td>
                      <td className="moves">{score.moves}</td>
                      <td className="date" title={formatDate(score.createdAt)}>
                        {formatShortDate(score.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="leaderboard-side">
          {userName ? (
            <MyGames version={version} />
          ) : (
            <section className="cta-card card-surface">
              <img src="/pieces/wK.svg" alt="" aria-hidden="true" />
              <h2>Put your name up there</h2>
              <p>Create a free account and every game you finish lands on this board.</p>
              <p className="leaderboard-cta">
                <button type="button" className="btn btn-warning" onClick={() => openAuth({ kind: 'login' })}>
                  <Icon name="user" size={17} />
                  Log in to get on the leaderboard
                </button>
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
