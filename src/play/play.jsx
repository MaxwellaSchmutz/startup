import React from 'react';
import { Link } from 'react-router-dom';
import { ChessGame } from './chessGame';
import { LiveActivity } from './liveActivity';
import { GameEvent, GameNotifier } from './gameNotifier';
import { loadStats } from '../leaderboard/scores';
import { useAuth } from '../login/authContext';
import { Icon } from '../icons';
import { repoUrl } from '../site';
import './play.css';

function SiteStats() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    const refresh = () =>
      loadStats().then((latest) => {
        if (active) setStats(latest);
      });
    refresh();
    function handleEvent(event) {
      if (event.type === GameEvent.End) refresh();
    }
    GameNotifier.addHandler(handleEvent);
    return () => {
      active = false;
      GameNotifier.removeHandler(handleEvent);
    };
  }, []);

  if (!stats) return null;
  const formatCount = (value) => value.toLocaleString();
  return (
    <p className="site-stats">
      <span className="stat-chip">
        <strong>{formatCount(stats.totalGames)}</strong> {stats.totalGames === 1 ? 'game' : 'games'} played
      </span>
      <span className="stat-chip">
        <strong>{formatCount(stats.totalPlayers)}</strong> {stats.totalPlayers === 1 ? 'player' : 'players'}
      </span>
      {stats.bestMoves > 0 && (
        <span className="stat-chip">
          best <strong>{formatCount(stats.bestMoves)}</strong> moves
        </span>
      )}
    </p>
  );
}

export function Play() {
  const { userName } = useAuth();
  return (
    <main className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <h1 id="hero-title">Stockfish Survival</h1>
          <p className="hero-pitch">
            Nobody beats Stockfish. See how many moves <em>you</em> can survive.
          </p>
          <p className="hero-byline">
            By Maxwell Schmutz <span aria-hidden="true">&middot;</span>{' '}
            <Link to="/learn">
              New to chess? Learn how to play <Icon name="arrowRight" size={14} />
            </Link>
          </p>
        </div>
        <div className="hero-side">
          <SiteStats />
          <a className="btn btn-outline-light btn-sm github-link" href={repoUrl} aria-label="View on GitHub" target="_blank" rel="noreferrer">
            <Icon name="github" size={16} />
            GitHub
          </a>
        </div>
      </section>

      <section className="play-area" aria-label="Game">
        <ChessGame aside={<LiveActivity userName={userName} />} />
      </section>
    </main>
  );
}
