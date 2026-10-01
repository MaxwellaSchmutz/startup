import React from 'react';
import Button from 'react-bootstrap/Button';
import './about.css';

export function About() {
  return (
    <main className="bg-secondary">
      <div id="picture" className="picture-box">
        <img
          width="500"
          src="/stockfish-survival-wireframe.png"
          alt="Rough wireframe of the login, game, and leaderboard views"
        />
      </div>

      <p>
        Stockfish Survival is a competitive chess game where the goal is not to beat Stockfish, but to survive against
        it for as many moves as possible. Every player faces the same engine difficulty and move time limit, so scores
        are directly comparable. Completed games are saved and ranked on a global leaderboard.
      </p>

      <p>Every game ends the same three ways: checkmate, resignation, or running out of time on the move clock.</p>

      <div>
        {/* Third party service placeholder: Chess.com PubAPI lookup */}
        <h2>Look up a Chess.com player</h2>
        <p>Enter a Chess.com username to see their public stats, pulled from the Chess.com PubAPI.</p>
        <form>
          <div className="input-group mb-3">
            <label className="input-group-text" htmlFor="chesscomUsername">
              Username
            </label>
            <input
              className="form-control"
              type="text"
              id="chesscomUsername"
              name="chesscomUsername"
              placeholder="hikaru"
            />
            <Button variant="primary">Look up stats</Button>
          </div>
        </form>

        <div id="chesscomStats" className="stat-box bg-light text-dark">
          <div>
            Username: <span className="stat-username">MagnusCarlsen</span>
          </div>
          <div>
            Rating: <span className="stat-rating">2839</span>
          </div>
          <div>
            Wins: <span className="stat-wins">--</span>
          </div>
          <div>
            Losses: <span className="stat-losses">--</span>
          </div>
        </div>
      </div>
    </main>
  );
}
