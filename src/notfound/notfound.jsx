import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-card card-surface">
        <img src="/pieces/wN.svg" alt="" aria-hidden="true" />
        <h1>404</h1>
        <p>Return to sender. Address unknown.</p>
        <p>This square is empty. The page you were looking for isn&rsquo;t on the board.</p>
        <Link className="btn btn-primary" to="/">
          Back to the game
        </Link>
      </div>
    </main>
  );
}
