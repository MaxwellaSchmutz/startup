import React from 'react';
import { Link } from 'react-router-dom';
import { ChessGame } from '../play/chessGame';
import { levels, saveLevel, savedLevel } from './levels';
import '../play/play.css';
import './practice.css';

export function Practice() {
  const [level, setLevel] = React.useState(savedLevel);

  function choose(next) {
    setLevel(next);
    saveLevel(next);
  }

  return (
    <main className="home practice">
      <section className="hero practice-hero" aria-labelledby="practice-title">
        <div className="hero-text">
          <h1 id="practice-title">Practice</h1>
          <p className="hero-pitch">Pick how strong Stockfish plays and learn with a coach at your side.</p>
          <p className="hero-meta">
            Practice games are not ranked. Ready for the real thing? <Link to="/">Play ranked</Link> ·{' '}
            <Link to="/learn">Learn the rules</Link>
          </p>
        </div>
      </section>

      <div className="level-picker" role="radiogroup" aria-label="Stockfish difficulty">
        {levels.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === level.id}
            className={`level-option ${option.id === level.id ? 'active' : ''}`}
            onClick={() => choose(option)}
          >
            <span className="level-name">{option.label}</span>
            <span className="level-rating">{option.rating}</span>
          </button>
        ))}
      </div>

      <ChessGame key={level.id} practice={level} />
    </main>
  );
}
