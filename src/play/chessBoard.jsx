import React from 'react';
import './chessBoard.css';

const files = 'abcdefgh';
export const pieceNames = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const dragThreshold = 5;

export function pieceSrc(color, type) {
  return `/pieces/${color}${type.toUpperCase()}.svg`;
}

export function PieceImg({ color, type, className = '' }) {
  return (
    <img
      className={`piece-img ${className}`}
      src={pieceSrc(color, type)}
      alt=""
      draggable="false"
      aria-hidden="true"
    />
  );
}

function squareAt(file, rank) {
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  return files[file] + rank;
}

function firstWhitePiece(board) {
  for (let r = 7; r >= 0; r--) {
    for (const piece of board[r]) {
      if (piece && piece.color === 'w') return piece.square;
    }
  }
  return 'a1';
}

function slideOffset(lastMove) {
  return {
    '--dx': files.indexOf(lastMove.from[0]) - files.indexOf(lastMove.to[0]),
    '--dy': Number(lastMove.to[1]) - Number(lastMove.from[1]),
  };
}

export function ChessBoard({
  id,
  board,
  selected = null,
  targets = [],
  lastMove = null,
  checkSquare = null,
  onSquareClick,
  onDragStart,
  onDrop,
  label = 'Chess board',
  className = '',
  children,
}) {
  const tableRef = React.useRef(null);
  const pressRef = React.useRef(null);
  const droppedRef = React.useRef(null);
  const [focusSquare, setFocusSquare] = React.useState(null);
  const [drag, setDrag] = React.useState(null);

  const interactive = Boolean(onSquareClick);
  const activeSquare = focusSquare ?? selected ?? firstWhitePiece(board);
  const dropped = droppedRef.current;
  const slide =
    lastMove &&
    !(dropped && dropped.from === lastMove.from && dropped.to === lastMove.to && Date.now() - dropped.at < 1000);

  function squareFromPoint(x, y) {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-square]');
    return el && tableRef.current?.contains(el) ? el.dataset.square : null;
  }

  function squareSize() {
    const cell = tableRef.current?.querySelector('td');
    return cell ? cell.getBoundingClientRect().width : 48;
  }

  function handlePointerDown(e) {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cell = e.target.closest('[data-square]');
    if (!cell) return;
    pressRef.current = { square: cell.dataset.square, x: e.clientX, y: e.clientY, dragging: false };
    try {
      tableRef.current.setPointerCapture(e.pointerId);
    } catch {
      return;
    }
  }

  function handlePointerMove(e) {
    const press = pressRef.current;
    if (!press) return;
    if (!press.dragging) {
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > dragThreshold;
      if (!moved || !onDragStart) return;
      const [file, rank] = [files.indexOf(press.square[0]), Number(press.square[1])];
      const piece = board[8 - rank][file];
      if (!piece || !onDragStart(press.square)) {
        pressRef.current = { ...press, dragging: false, blocked: true };
        return;
      }
      press.dragging = true;
      press.piece = piece;
      press.size = squareSize();
    }
    setDrag({
      from: press.square,
      piece: press.piece,
      size: press.size,
      x: e.clientX,
      y: e.clientY,
      over: squareFromPoint(e.clientX, e.clientY),
    });
  }

  function handlePointerUp(e) {
    const press = pressRef.current;
    pressRef.current = null;
    setDrag(null);
    if (!press) return;
    if (press.dragging) {
      const to = squareFromPoint(e.clientX, e.clientY);
      droppedRef.current = { from: press.square, to, at: Date.now() };
      onDrop?.(press.square, to);
    } else if (!press.blocked) {
      onSquareClick(press.square);
    }
  }

  function cancelPress() {
    pressRef.current = null;
    setDrag(null);
  }

  function moveFocus(square) {
    setFocusSquare(square);
    tableRef.current?.querySelector(`[data-square="${square}"]`)?.focus();
  }

  function handleKeyDown(e, square) {
    const file = files.indexOf(square[0]);
    const rank = Number(square[1]);
    const steps = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (steps[e.key]) {
      e.preventDefault();
      const next = squareAt(file + steps[e.key][0], rank + steps[e.key][1]);
      if (next) moveFocus(next);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      moveFocus(squareAt(e.key === 'Home' ? 0 : 7, rank));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSquareClick(square);
    }
  }

  return (
    <div className={`board-wrap ${className}`}>
      <table
        id={id}
        ref={tableRef}
        className={`chess-board ${interactive ? 'interactive' : ''} ${drag ? 'is-dragging' : ''}`}
        role="grid"
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelPress}
      >
        <tbody>
          {board.map((row, r) => (
            <tr key={r}>
              {row.map((piece, c) => {
                const square = files[c] + (8 - r);
                const isTarget = targets.includes(square);
                const arrived = slide && square === lastMove.to;
                const classes = [
                  (r + c) % 2 === 0 ? 'light' : 'dark',
                  square === selected && 'selected',
                  isTarget && (piece ? 'capture-target' : 'target'),
                  lastMove && (square === lastMove.from || square === lastMove.to) && 'last-move',
                  square === checkSquare && 'in-check',
                  drag && drag.over === square && 'drag-over',
                  drag && drag.from === square && 'drag-from',
                  piece && piece.color === 'w' && 'has-white',
                ].filter(Boolean);
                const color = piece && (piece.color === 'w' ? 'white' : 'black');
                const description = [
                  square,
                  piece ? `${color} ${pieceNames[piece.type]}` : null,
                  square === selected ? 'selected' : null,
                  isTarget ? (piece ? 'capture' : 'possible move') : null,
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <td
                    key={square}
                    data-square={square}
                    className={classes.join(' ')}
                    aria-label={description}
                    tabIndex={interactive ? (square === activeSquare ? 0 : -1) : undefined}
                    onFocus={() => interactive && setFocusSquare(square)}
                    onKeyDown={interactive ? (e) => handleKeyDown(e, square) : undefined}
                  >
                    {c === 0 && <span className="coord coord-rank">{8 - r}</span>}
                    {r === 7 && <span className="coord coord-file">{files[c]}</span>}
                    {piece && (
                      <img
                        key={arrived ? `${lastMove.from}${lastMove.to}` : 'still'}
                        className={`piece ${color} ${arrived ? 'arrived' : ''}`}
                        style={arrived ? slideOffset(lastMove) : undefined}
                        src={pieceSrc(piece.color, piece.type)}
                        alt=""
                        draggable="false"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {children}
      {drag && (
        <img
          className="drag-ghost"
          src={pieceSrc(drag.piece.color, drag.piece.type)}
          alt=""
          draggable="false"
          style={{ left: drag.x, top: drag.y, width: drag.size * 1.15, height: drag.size * 1.15 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
