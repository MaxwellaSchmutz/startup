import React from 'react';
import Button from 'react-bootstrap/Button';

export function Login() {
  return (
    <main className="bg-secondary">
      <p>Survive as many moves as you can against the engine.</p>

      <p>
        Most people are not going to beat Stockfish, but that does not mean playing it cannot be competitive. Stockfish
        Survival turns losing to one of the strongest chess engines in the world into the game itself. Register, take on
        the engine, and see how many moves you can survive before the leaderboard remembers your name.
      </p>

      <p>
        This is the startup application for CS 260. Source code:{' '}
        <a className="text-reset" href="https://github.com/MaxwellaSchmutz/startup">
          github.com/MaxwellaSchmutz/startup
        </a>
      </p>

      <div>
        <h2>Login or create an account</h2>
        {/* Login placeholder: the buttons (type="button" by default) get wired up to the auth endpoints in React Phase 2 */}
        <form>
          <div className="input-group mb-3">
            <span className="input-group-text">@</span>
            <input className="form-control" type="email" id="email" name="email" placeholder="your@email.com" />
          </div>
          <div className="input-group mb-3">
            <span className="input-group-text">🔒</span>
            <input className="form-control" type="password" id="password" name="password" placeholder="password" />
          </div>
          <Button variant="primary">Login</Button> <Button variant="secondary">Create Account</Button>
        </form>
      </div>

      <div id="current-player">
        <span>Playing as:</span> <span className="player-name">Guest</span>
      </div>
    </main>
  );
}
