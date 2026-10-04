import React from 'react';
import Button from 'react-bootstrap/Button';
import { Chess } from 'chess.js';
import { ChessBoard, PieceImg, pieceNames } from './chessBoard';
import { getEngineMove, preloadEngine } from './engine';
import { GameNotifier } from './gameNotifier';
import { loadMyGames, saveScore } from '../leaderboard/scores';
import { displayName } from '../login/authService';
import { useAuth } from '../login/authContext';
import { guestGameUsed, markGuestGameUsed, setPendingScore, getPendingScore } from './guestGate';
import { isMuted, playSound, setMuted } from './sounds';
import { plural, resultLabels, resultMessages } from './results';
import { boardThemes, getBoardTheme, setBoardTheme } from './boardTheme';
import { Icon } from '../icons';

const moveSeconds = 30;
const startCounts = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const pieceValues = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const promotionChoices = ['q', 'r', 'b', 'n'];

function formatClock(seconds) {
  const s = Math.max(seconds, 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function kingSquare(chess, color) {
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) return piece.square;
    }
  }
  return null;
}

function materialSummary(board) {
  const onBoard = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.type !== 'k') onBoard[piece.color][piece.type]++;
    }
  }
  const lost = (color) =>
    Object.keys(startCounts).flatMap((type) => Array(Math.max(startCounts[type] - onBoard[color][type], 0)).fill(type));
  const score = (color) => Object.keys(pieceValues).reduce((sum, t) => sum + pieceValues[t] * onBoard[color][t], 0);
  return { blackLost: lost('b'), whiteLost: lost('w'), balance: score('w') - score('b') };
}

function soundFor(chess, move) {
  if (chess.isGameOver()) return null;
  if (chess.inCheck()) return 'check';
  return move.captured ? 'capture' : 'move';
}

function CapturedRow({ label, pieces, color, advantage }) {
  const side = color === 'white' ? 'w' : 'b';
  return (
    <div className="captured-row">
      <span className="captured-label">{label}</span>
      <span
        className={`captured-pieces ${color}`}
        role="img"
        aria-label={pieces.length ? pieces.map((p) => pieceNames[p]).join(', ') : 'nothing yet'}
      >
        {pieces.map((p, i) => (
          <PieceImg key={i} color={side} type={p} className="captured-piece" />
        ))}
      </span>
      {advantage > 0 && <span className="material-advantage">+{advantage}</span>}
    </div>
  );
}

function MoveList({ history }) {
  const listRef = React.useRef(null);
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [history.length]);

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: history[i], black: history[i + 1] });
  }

  return (
    <section className="move-list-panel card-surface" aria-label="Moves">
      <h2 className="panel-heading">Moves</h2>
      {rows.length === 0 ? (
        <p className="move-list-empty">Your moves will appear here.</p>
      ) : (
        <ol className="move-list" ref={listRef}>
          {rows.map((row, i) => (
            <li key={row.number} className={i === rows.length - 1 ? 'latest' : ''}>
              <span className="move-number">{row.number}.</span>
              <span className="move-san">{row.white}</span>
              <span className="move-san">{row.black ?? ''}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PromotionPicker({ onPick, onCancel }) {
  const firstRef = React.useRef(null);
  React.useEffect(() => firstRef.current?.focus(), []);
  return (
    <div className="promotion-picker" role="dialog" aria-label="Choose a piece to promote to">
      <p>Promote to</p>
      <div className="promotion-options">
        {promotionChoices.map((type, i) => (
          <button
            key={type}
            ref={i === 0 ? firstRef : null}
            type="button"
            className="promotion-option"
            data-piece={type}
            aria-label={pieceNames[type]}
            onClick={() => onPick(type)}
          >
            <PieceImg color="w" type={type} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-link btn-sm promotion-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function GameSummary({ result, moves, isGuest, best, saving, onNewGame, onSave }) {
  const needsAccount = isGuest && guestGameUsed();
  const [copied, setCopied] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || isGuest) return;
    const box = el.getBoundingClientRect();
    if (box.bottom > window.innerHeight) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
    }
  }, []);
  const text = `I survived ${plural(moves, 'move')} against Stockfish (${(resultLabels[result] ?? result).toLowerCase()}) in Stockfish Survival. https://startup.beatstockfish.click/`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied!');
    } catch {
      setCopied('Could not copy');
    }
    setTimeout(() => setCopied(''), 2000);
  }

  const newBest = !isGuest && best !== null && moves >= best;

  return (
    <section ref={ref} className={`game-summary card-surface ${result === 'win' ? 'won' : ''}`} aria-label="Game over">
      <h2 className="panel-heading">Game over</h2>
      <div className="summary-moves">
        <span className="summary-number">{moves}</span>
        <span className="summary-unit">{moves === 1 ? 'move' : 'moves'} survived</span>
      </div>
      <p className="summary-result">{resultMessages[result]}</p>
      {!isGuest && best !== null && (
        <p className={`summary-best ${newBest ? 'is-new' : ''}`}>
          {newBest ? 'New personal best!' : `Personal best: ${plural(best, 'move')}`}
        </p>
      )}
      {!isGuest && saving && <p className="summary-saving">Saving to the leaderboard...</p>}
      <div className="summary-actions">
        <Button variant={needsAccount ? 'outline-light' : 'primary'} onClick={onNewGame}>
          <Icon name={needsAccount ? 'user' : 'refresh'} size={17} />
          {needsAccount ? 'Sign in to play again' : 'Play again'}
        </Button>
        <Button variant="outline-light" onClick={copy}>
          <Icon name={copied === 'Copied!' ? 'check' : 'copy'} size={17} />
          {copied || 'Copy result'}
        </Button>
        {isGuest && onSave && (
          <Button variant="warning" className="summary-save" onClick={onSave}>
            <Icon name="trophy" size={17} />
            Put it on the leaderboard
          </Button>
        )}
      </div>
    </section>
  );
}

function BoardThemePicker() {
  const [theme, setTheme] = React.useState(getBoardTheme());
  return (
    <div className="board-themes" role="group" aria-label="Board colors">
      <span className="board-themes-label">Board</span>
      {boardThemes.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
          aria-pressed={theme === t.id}
          aria-label={`${t.label} board`}
          title={t.label}
          style={{ '--swatch-light': t.light, '--swatch-dark': t.dark }}
          onClick={() => {
            setBoardTheme(t.id);
            setTheme(t.id);
          }}
        />
      ))}
    </div>
  );
}

export function ChessGame({ aside = null }) {
  const { userName, openAuth, notify, sessionExpired } = useAuth();
  const isGuest = !userName;
  const playerName = isGuest ? 'Guest' : displayName(userName);
  const guestRef = React.useRef(isGuest);
  guestRef.current = isGuest;

  const gameRef = React.useRef(null);
  if (!gameRef.current) gameRef.current = new Chess();
  const game = gameRef.current;

  const [fen, setFen] = React.useState(game.fen());
  const [status, setStatus] = React.useState('ready');
  const [movesSurvived, setMovesSurvived] = React.useState(0);
  const [secondsLeft, setSecondsLeft] = React.useState(moveSeconds);
  const [selected, setSelected] = React.useState(null);
  const [lastMove, setLastMove] = React.useState(null);
  const [result, setResult] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [best, setBest] = React.useState(null);
  const [promotion, setPromotion] = React.useState(null);
  const [muted, setMutedState] = React.useState(isMuted());
  const [engineSan, setEngineSan] = React.useState('');

  const playerTurn = game.turn() === 'w';
  const engineThinking = status === 'playing' && !playerTurn;
  const canMove = status !== 'over' && playerTurn && !promotion;
  const targets = selected ? game.moves({ square: selected, verbose: true }).map((m) => m.to) : [];
  const history = game.history();
  const material = materialSummary(game.board());

  function endGame(reason, moves) {
    setStatus('over');
    setResult(reason);
    setSelected(null);
    setPromotion(null);
    playSound('gameOver');

    if (guestRef.current) {
      setPendingScore({ moves, result: reason });
      openAuth({ kind: 'result', moves, result: reason });
      return;
    }
    setSaving(true);
    saveScore({ moves, result: reason })
      .then(() => {
        notify(`Saved to the leaderboard · ${plural(moves, 'move')}`);
        return loadMyGames().then((games) => setBest(games.best?.moves ?? null), () => {});
      })
      .catch((err) => {
        if (err.status === 401) {
          setPendingScore({ moves, result: reason });
          sessionExpired();
          openAuth({ kind: 'expired', moves, result: reason });
        } else {
          setSaveError(err.message);
        }
      })
      .finally(() => setSaving(false));
  }

  function gameOverReason() {
    if (game.isCheckmate()) return game.turn() === 'w' ? 'checkmate' : 'win';
    return 'draw';
  }

  function blockedByGate() {
    if (status === 'ready' && isGuest && guestGameUsed()) {
      openAuth({ kind: 'gate' });
      return true;
    }
    return false;
  }

  function playerMove(from, to, promotionPiece) {
    const move = game.move({ from, to, promotion: promotionPiece });
    const moves = movesSurvived + 1;
    setLastMove({ from: move.from, to: move.to });
    setSelected(null);
    setPromotion(null);
    setMovesSurvived(moves);
    setFen(game.fen());
    const sound = soundFor(game, move);
    if (sound) playSound(sound);

    if (status === 'ready') {
      setStatus('playing');
      if (isGuest) markGuestGameUsed();
      else GameNotifier.announceGameStart();
    }
    if (game.isGameOver()) {
      endGame(gameOverReason(), moves);
    }
  }

  function tryMove(from, to) {
    const legal = game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (legal.length === 0) return false;
    if (legal.some((m) => m.promotion)) {
      setSelected(null);
      setPromotion({ from, to });
    } else {
      playerMove(from, to);
    }
    return true;
  }

  function onSquareClick(square) {
    if (!canMove || blockedByGate()) return;
    if (selected && targets.includes(square)) {
      tryMove(selected, square);
    } else if (game.get(square)?.color === 'w' && square !== selected) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  function onDragStart(square) {
    if (!canMove || game.get(square)?.color !== 'w' || blockedByGate()) return false;
    setSelected(square);
    return true;
  }

  function onDrop(from, to) {
    if (to === from) return;
    if (!to || !tryMove(from, to)) setSelected(null);
  }

  function newGame() {
    if (isGuest && guestGameUsed()) {
      openAuth({ kind: 'gate' });
      return;
    }
    game.reset();
    setFen(game.fen());
    setStatus('ready');
    setMovesSurvived(0);
    setSecondsLeft(moveSeconds);
    setSelected(null);
    setLastMove(null);
    setResult('');
    setSaveError('');
    setBest(null);
    setPromotion(null);
    setEngineSan('');
  }

  function toggleSound() {
    setMuted(!muted);
    setMutedState(!muted);
    if (muted) playSound('move');
  }

  React.useEffect(() => {
    preloadEngine();
  }, []);

  React.useEffect(() => {
    if (status !== 'playing' || game.turn() !== 'b') return;

    let cancelled = false;
    getEngineMove(game.fen()).then((engineMove) => {
      if (cancelled) return;
      const move = game.move(engineMove);
      setLastMove({ from: move.from, to: move.to });
      setEngineSan(move.san);
      setSecondsLeft(moveSeconds);
      setFen(game.fen());
      const sound = soundFor(game, move);
      if (sound) playSound(sound);
      if (game.isGameOver()) {
        endGame(gameOverReason(), movesSurvived);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fen, status]);

  React.useEffect(() => {
    if (status !== 'playing' || game.turn() !== 'w') return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [fen, status]);

  React.useEffect(() => {
    if (status === 'playing' && secondsLeft <= 0) {
      endGame('time', movesSurvived);
    }
  }, [secondsLeft, status]);

  let statusText = 'Make your first move to start the clock. You are white.';
  if (status === 'over') statusText = resultMessages[result];
  else if (promotion) statusText = 'Pick a piece to promote your pawn to.';
  else if (engineThinking) statusText = 'Stockfish is thinking...';
  else if (status === 'playing') {
    const reply = engineSan ? `Stockfish played ${engineSan}. ` : '';
    statusText = reply + (game.inCheck() ? 'Check! Your move.' : 'Your move.');
  }
  if (status === 'ready' && isGuest && guestGameUsed()) {
    statusText = 'You have used your free game. Log in to keep playing.';
  }

  const lowTime = status === 'playing' && playerTurn && secondsLeft <= 10;
  const clockShare = Math.max(secondsLeft, 0) / moveSeconds;
  const tone = status === 'over' ? 'over' : game.inCheck() && playerTurn ? 'check' : engineThinking ? 'thinking' : 'idle';

  return (
    <div className={`chess-game status-${status}`}>
      <div className="board-column">
        <div className={`player-bar opponent ${engineThinking ? 'to-move' : ''}`}>
          <span className="player-label">
            <span className="player-avatar engine" aria-hidden="true">
              <PieceImg color="b" type="k" />
            </span>
            <span className="player-ident">
              <span className="player-title">Stockfish 19</span>
              {engineThinking ? (
                <span className="thinking" aria-hidden="true">
                  thinking<i />
                  <i />
                  <i />
                </span>
              ) : (
                <span className="player-sub">Full strength</span>
              )}
            </span>
          </span>
          <CapturedRow label="" pieces={material.whiteLost} color="white" advantage={-material.balance} />
        </div>

        <ChessBoard
          id="board"
          label="Chess board, you play white"
          board={game.board()}
          selected={selected}
          targets={targets}
          lastMove={lastMove}
          checkSquare={game.inCheck() ? kingSquare(game, game.turn()) : null}
          onSquareClick={onSquareClick}
          onDragStart={onDragStart}
          onDrop={onDrop}
          className="game-board"
        >
          {promotion && (
            <PromotionPicker
              onPick={(type) => playerMove(promotion.from, promotion.to, type)}
              onCancel={() => setPromotion(null)}
            />
          )}
        </ChessBoard>

        <div className={`player-bar you ${status === 'playing' && playerTurn ? 'to-move' : ''}`}>
          <span className="player-label">
            <span className="player-avatar" aria-hidden="true">
              {isGuest ? <PieceImg color="w" type="p" /> : playerName.charAt(0)}
            </span>
            <span className="player-ident">
              <span className="player-name player-title">{playerName}</span>
              <span className="player-sub">{isGuest ? 'Guest · not saved' : 'Playing white'}</span>
            </span>
          </span>
          <CapturedRow label="" pieces={material.blackLost} color="black" advantage={material.balance} />
        </div>
      </div>

      <div className="game-panel">
        <div className="game-status card-surface">
          <div className="stat stat-moves">
            <span className="stat-label" id="movesSurvivedLabel">
              Moves survived
            </span>
            <span className="stat-value" id="movesSurvived" aria-labelledby="movesSurvivedLabel" key={movesSurvived}>
              {movesSurvived}
            </span>
          </div>
          <div className={`stat stat-clock ${lowTime ? 'is-low' : ''}`}>
            <span className="stat-label" id="moveClockLabel">
              <Icon name="clock" size={14} />
              Move clock
            </span>
            <span
              className={`stat-value clock ${lowTime ? 'low-time' : ''}`}
              id="moveClock"
              aria-labelledby="moveClockLabel"
              role="timer"
            >
              {formatClock(secondsLeft)}
            </span>
            <span className="clock-track" aria-hidden="true">
              <span
                className={`clock-fill ${status === 'playing' && playerTurn ? 'running' : ''}`}
                style={{ transform: `scaleX(${clockShare})` }}
              />
            </span>
          </div>
        </div>

        <div className={`game-message tone-${tone} ${status === 'over' ? 'game-over' : ''}`} role="status" aria-live="polite">
          <span className="message-dot" aria-hidden="true" />
          <span>
            {statusText}
            {saveError && <span className="save-error">{saveError}</span>}
          </span>
        </div>

        <div className="game-controls">
          <Button
            variant="outline-danger"
            disabled={status !== 'playing'}
            onClick={() => endGame('resign', movesSurvived)}
          >
            <Icon name="flag" size={17} />
            Resign
          </Button>
          <Button variant={status === 'over' ? 'outline-light' : 'primary'} onClick={newGame}>
            <Icon name="refresh" size={17} />
            New Game
          </Button>
          <Button
            variant="outline-light"
            className="sound-toggle icon-button"
            onClick={toggleSound}
            aria-pressed={!muted}
            aria-label={muted ? 'Sound off, turn sound on' : 'Sound on, turn sound off'}
            title={muted ? 'Sound off' : 'Sound on'}
          >
            <Icon name={muted ? 'mute' : 'volume'} size={19} />
          </Button>
        </div>

        {status === 'over' && (
          <GameSummary
            result={result}
            moves={movesSurvived}
            isGuest={isGuest}
            best={best}
            saving={saving}
            onNewGame={newGame}
            onSave={
              isGuest && getPendingScore()
                ? () => openAuth({ kind: 'result', moves: movesSurvived, result })
                : null
            }
          />
        )}

        <MoveList history={history} />

        {isGuest && status !== 'over' && (
          <p className="guest-note">
            <Icon name="info" size={16} />
            <span>
              Playing as a guest: one free game.{' '}
              <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => openAuth({ kind: 'login' })}>
                Log in
              </button>{' '}
              to put your games on the leaderboard.
            </span>
          </p>
        )}

        <BoardThemePicker />

        {aside}
      </div>
    </div>
  );
}
