import React from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../play/chessBoard';
import { plural } from '../play/results';

function loadPosition(fen) {
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

function describe(move) {
  if (move.flags.includes('k') || move.flags.includes('q')) return 'Castled: the king and rook moved together.';
  if (move.flags.includes('e')) return 'En passant: the pawn captured the pawn beside it.';
  if (move.promotion) return 'Promoted! The pawn became a queen.';
  if (move.captured) return `Captured on ${move.to}.`;
  return `Moved to ${move.to}.`;
}

export function BoardDemo({ fen, label, hint }) {
  const chessRef = React.useRef(null);
  if (!chessRef.current) chessRef.current = loadPosition(fen);
  const chess = chessRef.current;

  const [position, setPosition] = React.useState(chess.fen());
  const [selected, setSelected] = React.useState(null);
  const [lastMove, setLastMove] = React.useState(null);
  const [note, setNote] = React.useState('');

  const targets = selected ? chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];

  function onSquareClick(square) {
    if (selected && targets.includes(square)) {
      const move = chess.move({ from: selected, to: square, promotion: 'q' });
      setLastMove({ from: move.from, to: move.to });
      setNote(describe(move));
      chess.load(whiteToMove(chess.fen()), { skipValidation: true });
      setSelected(null);
      setPosition(chess.fen());
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === 'w' && square !== selected) {
      setSelected(square);
      const count = new Set(chess.moves({ square, verbose: true }).map((m) => m.to)).size;
      setNote(`${plural(count, 'legal move')} from ${square}.`);
    } else {
      setSelected(null);
    }
  }

  function reset() {
    chess.load(fen, { skipValidation: true });
    setPosition(chess.fen());
    setSelected(null);
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

export function BoardDiagram({ fen, label, caption, highlight = null }) {
  const chess = React.useMemo(() => loadPosition(fen), [fen]);
  return (
    <figure className="board-demo">
      <ChessBoard board={chess.board()} checkSquare={highlight} label={label} className="small" />
      <figcaption>
        <span className="demo-hint">{caption}</span>
      </figcaption>
    </figure>
  );
}
