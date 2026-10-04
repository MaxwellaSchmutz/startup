import React from 'react';
import { Link } from 'react-router-dom';
import { BoardDemo, BoardDiagram } from './boardDemo';
import './learn.css';

const pieces = [
  {
    id: 'king',
    name: 'King',
    fen: '7k/8/8/8/3K4/8/8/8 w - - 0 1',
    square: 'd4',
    text: 'One square in any direction. The king can never move onto a square the enemy attacks, so it is the piece you must protect at all costs.',
  },
  {
    id: 'queen',
    name: 'Queen',
    fen: '8/7k/8/8/3Q4/8/8/K7 w - - 0 1',
    square: 'd4',
    text: 'Any number of squares in a straight line: along ranks, files and diagonals. The strongest piece (worth about 9 pawns).',
  },
  {
    id: 'rook',
    name: 'Rook',
    fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
    square: 'd4',
    text: 'Any number of squares along a rank or file. Worth about 5 pawns, and at its best on open files.',
  },
  {
    id: 'bishop',
    name: 'Bishop',
    fen: '8/7k/8/8/3B4/8/8/K7 w - - 0 1',
    square: 'd4',
    text: 'Any number of squares diagonally, so it stays on its starting color all game. Worth about 3 pawns.',
  },
  {
    id: 'knight',
    name: 'Knight',
    fen: '7k/8/8/8/3N4/8/8/K7 w - - 0 1',
    square: 'd4',
    text: 'An L shape: two squares one way, then one square to the side. It is the only piece that jumps over others. Worth about 3 pawns.',
  },
  {
    id: 'pawn',
    name: 'Pawn',
    fen: '7k/8/8/8/8/3p4/4P3/K7 w - - 0 1',
    square: 'e2',
    text: 'Forward one square, or two from its starting square. It captures one square diagonally forward, never straight ahead.',
  },
];

const specialMoves = [
  {
    id: 'castling',
    name: 'Castling',
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    square: 'e1',
    text: 'The king moves two squares toward a rook and the rook jumps to the other side of it. Allowed only if neither piece has moved, the squares between them are empty, and the king is not in check and does not pass through an attacked square. Tap the king.',
  },
  {
    id: 'en-passant',
    name: 'En passant',
    fen: '7k/8/8/3pP3/8/8/8/K7 w - d6 0 1',
    square: 'e5',
    text: 'If an enemy pawn jumps two squares and lands right beside your pawn, you may capture it as if it had moved only one, but only on the very next move. Black just played d7-d5: tap the e5 pawn.',
  },
  {
    id: 'promotion',
    name: 'Promotion',
    fen: '7k/4P3/8/8/8/8/8/K7 w - - 0 1',
    square: 'e7',
    text: 'A pawn that reaches the far rank turns into a queen, rook, bishop or knight (almost always a queen). In a real game you pick the piece. Tap the pawn and move it to e8.',
  },
];

const tips = [
  ['Castle early', 'Get your king out of the center and behind a wall of pawns in the first ten moves. Most quick losses are a king caught in the middle.'],
  ['Don’t leave pieces hanging', 'Before every move, ask what Stockfish can capture afterwards. An undefended piece is a free gift.'],
  ['Check every check and capture', 'Look at Stockfish’s checks, captures and threats first. It always does.'],
  ['Trade pieces when you are under attack', 'In a normal game you trade when ahead, but here the goal is to last. Every attacker you swap off is one less piece hunting your king, and long endgames take Stockfish many moves to finish.'],
  ['Don’t shuffle one piece around', 'Moving the same piece over and over wastes time while the engine develops everything. Bring out new pieces.'],
  ['Keep pawns in front of your king', 'Pushing the pawns around your castled king opens lines straight at it.'],
  ['Watch the clock', 'You have 30 seconds per move. A safe, decent move beats a perfect one played too late, because running out of time ends the game.'],
  ['Draws are survival too', 'Threefold repetition, stalemate and the fifty-move rule are legitimate draws. If you are lost, look for a way to repeat moves or leave the engine’s king nothing to do but stalemate you.'],
];

const sections = [
  { id: 'how-it-works', title: 'How Stockfish Survival works' },
  { id: 'pieces', title: 'How the pieces move' },
  { id: 'special-moves', title: 'Special moves' },
  { id: 'check', title: 'Check, checkmate and stalemate' },
  { id: 'tips', title: 'Survival tips' },
];

const rules = [
  ['The goal', 'Survive as many moves as you can. You will almost certainly lose; the question is how long you last.'],
  ['You play white', 'You move first. Your opponent is Stockfish 19, running right in your browser.'],
  ['30-second move clock', 'You get 30 seconds for every move. The clock resets after each of Stockfish’s replies.'],
  ['How it ends', 'Checkmate, resignation, running out of time, or a draw (stalemate, repetition, insufficient material, fifty-move rule).'],
  ['Scores are comparable', 'Stockfish does the same amount of thinking on every move on every device, so everyone faces exactly the same opponent. Your score is the number of moves you made.'],
  ['The leaderboard needs an account', 'Guests get one free game. After that, create a free account to keep playing and have every game count.'],
];

export function Learn() {
  const [active, setActive] = React.useState(sections[0].id);

  React.useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting));
        const current = sections.find((s) => visible.get(s.id));
        if (current) setActive(current.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => {
      const element = document.getElementById(s.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="learn">
      <header className="page-header learn-header">
        <span className="eyebrow">Guide</span>
        <h1>Learn how to play</h1>
        <p>Everything you need to last longer against the strongest chess engine in the world.</p>
      </header>

      <div className="learn-layout">
        <nav className="learn-toc" aria-label="On this page">
          <h2 className="panel-heading">On this page</h2>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? 'active' : ''} aria-current={active === s.id ? 'location' : undefined}>
                  <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="learn-content">
          <section id="how-it-works" className="learn-section">
            <span className="section-num">01</span>
            <h2>How Stockfish Survival works</h2>
            <ul className="rules-list">
              {rules.map(([title, text]) => (
                <li key={title} className="card-surface">
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <p>
              <Link className="btn btn-primary" to="/">
                Start a game
              </Link>
            </p>
          </section>

          <section id="pieces" className="learn-section">
            <span className="section-num">02</span>
            <h2>How the pieces move</h2>
            <p className="section-intro">Tap a piece to see every square it can reach. Tap a dot to move there.</p>
            <div className="demo-grid">
              {pieces.map((p) => (
                <article key={p.id} id={p.id} className="demo-card card-surface">
                  <h3>
                    <img src={`/pieces/w${p.id === 'knight' ? 'N' : p.name[0]}.svg`} alt="" aria-hidden="true" />
                    {p.name}
                  </h3>
                  <p>{p.text}</p>
                  <BoardDemo fen={p.fen} label={`${p.name} practice board`} hint={`Tap the ${p.name.toLowerCase()}.`} />
                </article>
              ))}
            </div>
          </section>

          <section id="special-moves" className="learn-section">
            <span className="section-num">03</span>
            <h2>Special moves</h2>
            <div className="demo-grid">
              {specialMoves.map((m) => (
                <article key={m.id} id={m.id} className="demo-card card-surface">
                  <h3>{m.name}</h3>
                  <p>{m.text}</p>
                  <BoardDemo fen={m.fen} label={`${m.name} practice board`} hint={`Tap the piece on ${m.square}.`} />
                </article>
              ))}
            </div>
          </section>

          <section id="check" className="learn-section">
            <span className="section-num">04</span>
            <h2>Check, checkmate and stalemate</h2>
            <div className="demo-grid">
              <article className="demo-card card-surface">
                <h3>Check</h3>
                <p>
                  A king that is attacked is in <strong>check</strong>. You must get out of it right away: move the king,
                  block the attack, or capture the attacker.
                </p>
                <BoardDiagram
                  fen="4k3/8/8/8/8/8/8/4R1K1 b - - 0 1"
                  highlight="e8"
                  label="Check diagram"
                  caption="The rook on e1 checks the black king."
                />
              </article>
              <article className="demo-card card-surface">
                <h3>Checkmate</h3>
                <p>
                  Check with no way out is <strong>checkmate</strong>, and the game is over. Against Stockfish this is how
                  most games end: the classic &ldquo;back-rank mate&rdquo; below catches a king boxed in by its own pawns.
                </p>
                <BoardDiagram
                  fen="4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1"
                  highlight="g8"
                  label="Checkmate diagram"
                  caption="Back-rank mate: the king's own pawns block its escape."
                />
              </article>
              <article className="demo-card card-surface">
                <h3>Stalemate</h3>
                <p>
                  If the side to move is <strong>not</strong> in check but has no legal move, it is{' '}
                  <strong>stalemate</strong> and the game is a draw, even if one side is far ahead.
                </p>
                <BoardDiagram
                  fen="7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"
                  label="Stalemate diagram"
                  caption="Black to move: not in check, but every square is covered. Draw."
                />
              </article>
            </div>
          </section>

          <section id="tips" className="learn-section">
            <span className="section-num">05</span>
            <h2>Survival tips</h2>
            <ol className="tips-list">
              {tips.map(([title, text]) => (
                <li key={title} className="card-surface">
                  <strong>{title}.</strong> {text}
                </li>
              ))}
            </ol>
            <div className="learn-finale card-surface">
              <div>
                <h3>Ready?</h3>
                <p>Stockfish is waiting. See how long you can hold on.</p>
              </div>
              <Link className="btn btn-primary" to="/">
                Put it into practice
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
