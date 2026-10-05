import React from 'react';
import Button from 'react-bootstrap/Button';
import { Chess } from 'chess.js';
import { ChessBoard } from '../play/chessBoard';
import { Icon } from '../icons';
import { barShare, formatScore, grades } from './coach';
import { askTutor, tutorAvailable } from './tutor';

function pawns(loss) {
  const value = (loss / 100).toFixed(1);
  return `${value} ${value === '1.0' ? 'pawn' : 'pawns'}`;
}

function verdict(review) {
  const best = review.bestSan;
  if (review.grade === 'best') return 'That is the move Stockfish would play.';
  if (review.grade === 'good') return `Solid. Stockfish slightly preferred ${best}.`;
  if (review.grade === 'inaccuracy') return `Playable, but ${best} was better. You gave up about ${pawns(review.loss)}.`;
  return `This cost you about ${pawns(review.loss)}. Stockfish recommends ${best}.`;
}

function EvalBar({ score }) {
  const share = barShare(score);
  return (
    <div className="eval-bar" role="img" aria-label={`Evaluation ${formatScore(score)} from white's point of view`}>
      <span className="eval-white" style={{ width: `${share * 100}%` }} />
      <span className={`eval-label ${share >= 0.5 ? 'on-white' : 'on-black'}`}>{formatScore(score)}</span>
    </div>
  );
}

function MoveReview({ review, signedIn, onLogin }) {
  const [tutor, setTutor] = React.useState({ state: 'idle', text: '' });
  const [tutorReady, setTutorReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    tutorAvailable().then((available) => active && setTutorReady(available));
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => setTutor({ state: 'idle', text: '' }), [review]);

  if (review.pending) {
    return <p className="review-pending">Checking {review.san}...</p>;
  }

  const grade = grades[review.grade];
  const showBoard = ['inaccuracy', 'mistake', 'blunder'].includes(review.grade) && review.bestMove;
  const arrows = showBoard
    ? [
        { ...review.playedMove, kind: 'threat' },
        { ...review.bestMove, kind: 'best' },
      ]
    : [];

  async function explain() {
    setTutor({ state: 'loading', text: '' });
    try {
      setTutor({ state: 'done', text: await askTutor(review) });
    } catch (err) {
      setTutor({ state: 'error', text: err.message });
    }
  }

  return (
    <div className="move-review">
      <p className="review-head">
        <span className={`grade-badge tone-${grade.tone}`}>{grade.label}</span>
        <span className="review-san">{review.san}</span>
      </p>
      <p className="review-text">{verdict(review)}</p>
      {showBoard && (
        <>
          <ChessBoard
            board={new Chess(review.fenBefore).board()}
            arrows={arrows}
            label={`Before your move: you played ${review.san}, Stockfish recommends ${review.bestSan}`}
            className="small review-board"
          />
          <p className="review-legend">
            <span className="legend played">your move</span>
            <span className="legend best">better: {review.bestLine.slice(0, 4).join(' ')}</span>
          </p>
        </>
      )}
      {!tutorReady ? null : signedIn ? (
        <Button variant="outline-light" size="sm" className="tutor-button" onClick={explain} disabled={tutor.state === 'loading'}>
          <Icon name="sparkle" size={16} />
          {tutor.state === 'loading' ? 'Thinking...' : 'Ask the tutor why'}
        </Button>
      ) : (
        <button type="button" className="btn btn-link btn-sm tutor-login" onClick={onLogin}>
          Log in to ask the AI tutor about your moves
        </button>
      )}
      {tutor.text && (
        <p className={`tutor-answer ${tutor.state === 'error' ? 'is-error' : ''}`} aria-live="polite">
          {tutor.text}
        </p>
      )}
    </div>
  );
}

export function CoachPanel({ coach, status, signedIn, onLogin }) {
  const lastScore = React.useRef(null);
  if (coach.current?.score !== undefined && coach.current?.score !== null) lastScore.current = coach.current.score;
  const playing = status !== 'over';

  return (
    <section className="coach-panel card-surface" aria-label="Coach">
      <div className="coach-head">
        <h2 className="panel-heading">
          <Icon name="school" size={16} />
          Coach
        </h2>
        <EvalBar score={lastScore.current} />
      </div>

      {coach.review ? (
        <MoveReview review={coach.review} signedIn={signedIn} onLogin={onLogin} />
      ) : (
        <p className="coach-intro">Make a move and the coach will grade it, show better ideas, and warn you about threats.</p>
      )}

      {playing && coach.threat && (
        <div className="coach-alert">
          <Icon name="alert" size={17} />
          <span>{coach.threat.text}</span>
          <button type="button" className="btn btn-link btn-sm" onClick={() => coach.setShowThreat(!coach.showThreat)}>
            {coach.showThreat ? 'Hide' : 'Show'}
          </button>
        </div>
      )}

      {playing && coach.tips.length > 0 && (
        <ul className="coach-tips">
          {coach.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}

      {playing && (
        <div className="coach-hint">
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => coach.setShowHint(!coach.showHint)}
            disabled={!coach.current?.bestMove}
            aria-pressed={coach.showHint}
          >
            <Icon name="bulb" size={16} />
            {coach.showHint ? 'Hide hint' : 'Hint'}
          </Button>
          {coach.showHint && coach.current?.bestSan && (
            <span className="hint-text">
              Try <strong>{coach.current.bestSan}</strong>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
