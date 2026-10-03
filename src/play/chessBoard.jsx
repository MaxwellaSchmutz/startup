import React from 'react';

const files = 'abcdefgh';
// Filled glyphs for both sides (colored with CSS). U+FE0E asks for the text
// form so the pawn doesn't render as an emoji on Windows.
const glyphs = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const names = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

// board: chess.js board() rows, rank 8 first. Purely presentational: all the
// game rules live in ChessGame, which passes down what to highlight.
export function ChessBoard({ board, selected, targets, lastMove, checkSquare, onSquareClick }) {
  return (
    <table id="board">
      <tbody>
        {board.map((row, r) => (
          <tr key={r}>
            {row.map((piece, c) => {
              const square = files[c] + (8 - r);
              const classes = [
                square === selected && 'selected',
                targets.includes(square) && (piece ? 'capture-target' : 'target'),
                lastMove && (square === lastMove.from || square === lastMove.to) && 'last-move',
                square === checkSquare && 'in-check',
              ].filter(Boolean);
              const color = piece && (piece.color === 'w' ? 'white' : 'black');

              return (
                <td
                  key={square}
                  className={classes.join(' ')}
                  onClick={() => onSquareClick(square)}
                  aria-label={piece ? `${square} ${color} ${names[piece.type]}` : square}
                >
                  {piece && <span className={`piece ${color}`}>{glyphs[piece.type] + '︎'}</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
