import React from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { getPlayerStats } from './chesscomService';
import { Icon } from '../icons';
import { repoUrl } from '../site';
import './about.css';

const defaultPlayer = 'MagnusCarlsen';

export function About() {
  const [username, setUsername] = React.useState('');
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const latestRequest = React.useRef(0);

  async function lookUp(name) {
    const id = ++latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const result = await getPlayerStats(name);
      if (id === latestRequest.current) setStats(result);
    } catch (err) {
      if (id === latestRequest.current) {
        setStats(null);
        setError(err.message);
      }
    } finally {
      if (id === latestRequest.current) setLoading(false);
    }
  }

  React.useEffect(() => {
    lookUp(defaultPlayer);
  }, []);

  return (
    <main className="about">
      <header className="page-header">
        <span className="eyebrow">About</span>
        <h1>About Stockfish Survival</h1>
        <p className="about-pitch">
          Most people are not going to beat Stockfish, but that does not mean playing it cannot be competitive. Stockfish
          Survival turns losing to one of the strongest chess engines in the world into the game itself. Register, take on
          the engine, and see how many moves you can survive before the leaderboard remembers your name.
        </p>
      </header>

      <div className="about-grid">
        <section className="about-card card-surface about-story">
          <h2>How it works</h2>
          <p>
            Stockfish Survival is a competitive chess game where the goal is not to beat Stockfish, but to survive against
            it for as many moves as possible. Every player faces the same engine difficulty and move time limit, so scores
            are directly comparable. Completed games are saved and ranked on a global leaderboard.
          </p>
          <p>A game ends by checkmate, resignation, running out of time on the move clock, or a draw.</p>
          <p className="about-meta">
            This is the startup application for CS 260 by Maxwell Schmutz.
            <a className="btn btn-outline-light btn-sm repo-link" href={repoUrl}>
              <Icon name="github" size={15} />
              View the code on GitHub
            </a>
          </p>
        </section>

        <figure id="picture" className="picture-box card-surface">
          <img
            width="500"
            src="/stockfish-survival-wireframe.png"
            alt="Rough wireframe of the login, game, and leaderboard views"
          />
          <figcaption>The original wireframe</figcaption>
        </figure>

        <section className="about-card card-surface chesscom-card">
          <h2>Look up a Chess.com player</h2>
          <p>Enter a Chess.com username to see their public stats, pulled live from the Chess.com PubAPI.</p>
          <form
            className="lookup-form"
            onSubmit={(e) => {
              e.preventDefault();
              lookUp(username);
            }}
          >
            <label className="visually-hidden" htmlFor="chesscomUsername">
              Username
            </label>
            <div className="lookup-field">
              <Icon name="search" size={18} />
              <input
                className="form-control"
                type="text"
                id="chesscomUsername"
                name="chesscomUsername"
                placeholder="hikaru"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <Button variant="primary" type="submit" disabled={!username.trim()}>
              {loading && <Spinner as="span" animation="border" size="sm" aria-hidden="true" />}
              {loading ? 'Looking up...' : 'Look up stats'}
            </Button>
          </form>

          {error && (
            <div className="stat-error" role="alert">
              {error}
            </div>
          )}

          {stats && (
            <div id="chesscomStats" className={`stat-box ${loading ? 'stale' : ''}`} aria-live="polite">
              <div className="stat-head">
                {stats.avatar ? (
                  <img className="stat-avatar" src={stats.avatar} alt={`${stats.username}'s Chess.com avatar`} />
                ) : (
                  <span className="stat-avatar placeholder" aria-hidden="true">
                    <img src="/pieces/wP.svg" alt="" />
                  </span>
                )}
                <div>
                  <a className="stat-username" href={stats.url}>
                    {stats.username}
                  </a>
                  {stats.timeClass && (
                    <div className="stat-class">
                      {stats.timeClass} rating <span className="stat-rating">{stats.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              {stats.timeClass ? (
                <dl className="stat-tiles">
                  <div>
                    <dt>Wins</dt>
                    <dd className="stat-wins">{stats.win}</dd>
                  </div>
                  <div>
                    <dt>Losses</dt>
                    <dd className="stat-losses">{stats.loss}</dd>
                  </div>
                  <div>
                    <dt>Draws</dt>
                    <dd className="stat-draws">{stats.draw}</dd>
                  </div>
                </dl>
              ) : (
                <div className="stat-none">No rated games yet.</div>
              )}
            </div>
          )}
        </section>

        <section className="about-card card-surface credits">
          <h2>Credits</h2>
          <p className="engine-credit">
            Your opponent is{' '}
            <a href="https://github.com/official-stockfish/Stockfish">Stockfish 19</a>, running right in your browser as
            WebAssembly thanks to <a href="https://github.com/nmrugg/stockfish.js">Stockfish.js</a>. Both are free
            software under the <a href="/stockfish/COPYING.txt">GNU GPL v3</a>.
          </p>
          <p className="pieces-credit">
            Chess pieces: the &ldquo;cburnett&rdquo; set by{' '}
            <a href="https://en.wikipedia.org/wiki/User:Cburnett">Colin M.L. Burnett</a>, used under the{' '}
            <a href="https://www.gnu.org/licenses/gpl-2.0.txt">GNU GPL v2 or later</a> (
            <a href="/pieces/LICENSE.txt">details</a>).
          </p>
          <p>
            Typefaces: Fraunces and Inter, from Google Fonts under the SIL Open Font License. Rules by{' '}
            <a href="https://github.com/jhlywa/chess.js">chess.js</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
