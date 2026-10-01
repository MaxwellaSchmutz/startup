import React from 'react';
import Button from 'react-bootstrap/Button';
import './play.css';

// Starting position, one string per rank (8 down to 1). Spaces are empty squares.
const startingBoard = ['♜♞♝♛♚♝♞♜', '♟♟♟♟♟♟♟♟', '        ', '        ', '        ', '        ', '♙♙♙♙♙♙♙♙', '♖♘♗♕♔♗♘♖'];

export function Play() {
  return (
    <main className="bg-secondary">
      <div className="players">
        Player: <span className="player-name">Guest</span>
      </div>

      <div className="game-status">
        <div className="stat">
          <label htmlFor="movesSurvived">Moves survived</label>
          <input type="text" id="movesSurvived" value="0" readOnly />
        </div>

        <div className="stat">
          <label htmlFor="moveClock">Move clock</label>
          <input type="text" id="moveClock" value="0:30" readOnly />
        </div>

        <div className="stat">
          <Button variant="outline-danger">Resign</Button>
          <Button variant="primary">New Game</Button>
        </div>
      </div>

      {/* Placeholder chessboard. Squares are colored with CSS (see play.css), not the bgcolor attribute. */}
      <table id="board">
        <tbody>
          {startingBoard.map((rank, row) => (
            <tr key={row}>
              {[...rank].map((piece, col) => (
                <td key={col}>{piece.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* WebSocket placeholder: realtime activity from other players */}
      <div>
        <h2>Live activity</h2>
        <ul className="notification">
          <li className="player-name">Ada started a new game</li>
          <li className="player-name">Tim survived 42 moves and set a new personal best</li>
          <li className="player-name">Priya's game ended at move 17</li>
        </ul>
      </div>
    </main>
  );
}
