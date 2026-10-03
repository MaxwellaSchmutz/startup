import React from 'react';
import Button from 'react-bootstrap/Button';
import { Chess } from 'chess.js';
import { ChessBoard } from './chessBoard';
import { getEngineMove } from './engine';
import { GameEvent, GameNotifier } from './gameNotifier';
import { saveScore } from '../leaderboard/scores';
import { displayName } from '../login/authService';

const moveSeconds = 30;

const resultMessages = {
  checkmate: 'Checkmate. Stockfish got you.',
  resign: 'You resigned.',
  time: 'Out of time on the move clock.',
  draw: 'Draw. Stockfish could not finish you off.',
  win: 'You checkmated Stockfish?! Legendary.',
};

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

export function ChessGame({ userName }) {
  // The chess.js instance holds the rules and move history; React state holds
  // everything the UI renders. fen changes after every move, which re-renders
  // the board and re-runs the effects below.
  const gameRef = React.useRef(null);
  if (!gameRef.current) gameRef.current = new Chess();
  const game = gameRef.current;

  const [fen, setFen] = React.useState(game.fen());
  const [status, setStatus] = React.useState('ready'); // ready | playing | over
  const [movesSurvived, setMovesSurvived] = React.useState(0);
  const [secondsLeft, setSecondsLeft] = React.useState(moveSeconds);
  const [selected, setSelected] = React.useState(null);
  const [lastMove, setLastMove] = React.useState(null);
  const [result, setResult] = React.useState('');

  const playerTurn = game.turn() === 'w';
  const engineThinking = status === 'playing' && !playerTurn;
  const targets = selected ? game.moves({ square: selected, verbose: true }).map((m) => m.to) : [];

  function endGame(reason, moves) {
    setStatus('over');
    setResult(reason);
    setSelected(null);
    const score = { name: userName, moves, result: reason, date: new Date().toLocaleDateString() };
    saveScore(score);
    GameNotifier.broadcastEvent(displayName(userName), GameEvent.End, score);
  }

  function gameOverReason() {
    if (game.isCheckmate()) return game.turn() === 'w' ? 'checkmate' : 'win';
    return 'draw';
  }

  function playerMove(from, to) {
    const move = game.move({ from, to, promotion: 'q' });
    const moves = movesSurvived + 1;
    setLastMove({ from: move.from, to: move.to });
    setSelected(null);
    setMovesSurvived(moves);
    setFen(game.fen());

    if (status === 'ready') {
      setStatus('playing');
      GameNotifier.broadcastEvent(displayName(userName), GameEvent.Start);
    }
    if (game.isGameOver()) {
      endGame(gameOverReason(), moves);
    }
  }

  function onSquareClick(square) {
    if (status === 'over' || !playerTurn) return;

    if (selected && targets.includes(square)) {
      playerMove(selected, square);
    } else if (game.get(square)?.color === 'w' && square !== selected) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  function newGame() {
    game.reset();
    setFen(game.fen());
    setStatus('ready');
    setMovesSurvived(0);
    setSecondsLeft(moveSeconds);
    setSelected(null);
    setLastMove(null);
    setResult('');
  }

  // Engine's turn: ask the (mock) engine for a move. If the game is reset or
  // the component unmounts while it "thinks", the stale answer is ignored.
  React.useEffect(() => {
    if (status !== 'playing' || game.turn() !== 'b') return;

    let cancelled = false;
    getEngineMove(game.fen()).then((engineMove) => {
      if (cancelled) return;
      const move = game.move(engineMove);
      setLastMove({ from: move.from, to: move.to });
      setSecondsLeft(moveSeconds);
      setFen(game.fen());
      if (game.isGameOver()) {
        endGame(gameOverReason(), movesSurvived);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fen, status]);

  // Player's turn: tick the move clock once a second.
  React.useEffect(() => {
    if (status !== 'playing' || game.turn() !== 'w') return;

    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [fen, status]);

  // Running out of time ends the game.
  React.useEffect(() => {
    if (status === 'playing' && secondsLeft <= 0) {
      endGame('time', movesSurvived);
    }
  }, [secondsLeft, status]);

  let statusText = 'Make your first move to start the clock. You are white.';
  if (status === 'over') statusText = resultMessages[result];
  else if (engineThinking) statusText = 'Stockfish is thinking...';
  else if (status === 'playing') statusText = game.inCheck() ? 'Check! Your move.' : 'Your move.';

  return (
    <>
      <div className="players">
        Player: <span className="player-name">{displayName(userName)}</span>
      </div>

      <div className="game-status">
        <div className="stat">
          <label htmlFor="movesSurvived">Moves survived</label>
          <input type="text" id="movesSurvived" value={movesSurvived} readOnly />
        </div>

        <div className="stat">
          <label htmlFor="moveClock">Move clock</label>
          <input
            type="text"
            id="moveClock"
            className={status === 'playing' && playerTurn && secondsLeft <= 10 ? 'low-time' : ''}
            value={formatClock(secondsLeft)}
            readOnly
          />
        </div>

        <div className="stat">
          <Button variant="outline-danger" disabled={status !== 'playing'} onClick={() => endGame('resign', movesSurvived)}>
            Resign
          </Button>
          <Button variant="primary" onClick={newGame}>
            New Game
          </Button>
        </div>
      </div>

      <div className={`game-message ${status === 'over' ? 'game-over' : ''}`} role="status">
        {statusText}
        {status === 'over' && ` You survived ${movesSurvived} move${movesSurvived === 1 ? '' : 's'}.`}
      </div>

      <ChessBoard
        board={game.board()}
        selected={selected}
        targets={targets}
        lastMove={lastMove}
        checkSquare={game.inCheck() ? kingSquare(game, game.turn()) : null}
        onSquareClick={onSquareClick}
      />
    </>
  );
}
