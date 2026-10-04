import React from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../play/chessBoard';

function load(fen) {
  const chess = new Chess();
  chess.load(fen, { skipValidation: true });
  return chess;
}

function whiteToMove(fen) {
  const parts = fen.split(' ');
  parts[1] = 'w';
  parts[3] = '-';
  return parts.join(' ');
}

// A small practice board: tap a white piece to see where it can go, tap a dot
// to move it there. Reset puts the starting position back.
export function BoardDemo({ fen, label, hint, startSquare = null }) {
  const chessRef = React.useRef(null);
  if (!chessRef.current) chessRef.current = load(fen);
  const chess = chessRef.current;

  const [position, setPosition] = React.useState(chess.fen());
  const [selected, setSelected] = React.useState(startSquare);
  const [lastMove, setLastMove] = React.useState(null);
  const [note, setNote] = React.useState('');

  const targets = selected ? chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];

  function onSquareClick(square) {
    if (selected && targets.includes(square)) {
      const move = chess.move({ from: selected, to: square, promotion: 'q' });
      setLastMove({ from: move.from, to: move.to });
      setNote(describe(move));
      try {
        chess.load(whiteToMove(chess.fen()), { skipValidation: true });
      } catch {
        // leave it as it is
      }
      setSelected(null);
      setPosition(chess.fen());
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === 'w' && square !== selected) {
      setSelected(square);
      const count = new Set(chess.moves({ square, verbose: true }).map((m) => m.to)).size;
      setNote(`${count} legal move${count === 1 ? '' : 's'} from ${square}.`);
    } else {
      setSelected(null);
    }
  }

  function reset() {
    chess.load(fen, { skipValidation: true });
    setPosition(chess.fen());
    setSelected(startSquare);
    setLastMove(null);
    setNote('');
  }

  return (
    <figure className="board-demo" data-position={position}>
      <ChessBoard
        board={chess.board()}
        selected={selected}
        targets={targets}
        lastMove={lastMove}
        checkSquare={null}
        onSquareClick={onSquareClick}
        label={label}
        className="small"
      />
      <figcaption>
        <span className="demo-hint">{note || hint}</span>
        <button type="button" className="btn btn-sm btn-outline-light demo-reset" onClick={reset}>
          Reset
        </button>
      </figcaption>
    </figure>
  );
}

function describe(move) {
  if (move.flags.includes('k') || move.flags.includes('q')) return 'Castled: the king and rook moved together.';
  if (move.flags.includes('e')) return 'En passant: the pawn captured the pawn beside it.';
  if (move.promotion) return 'Promoted! The pawn became a queen.';
  if (move.captured) return `Captured on ${move.to}.`;
  return `Moved to ${move.to}.`;
}

// A position to look at, not play: used for check, checkmate and stalemate.
export function BoardDiagram({ fen, label, caption, highlight = null }) {
  const chess = React.useMemo(() => load(fen), [fen]);
  return (
    <figure className="board-demo">
      <ChessBoard board={chess.board()} checkSquare={highlight} label={label} className="small" />
      <figcaption>
        <span className="demo-hint">{caption}</span>
      </figcaption>
    </figure>
  );
}
