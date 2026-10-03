import React from 'react';
import { Authenticated } from './authenticated';
import { Unauthenticated } from './unauthenticated';
import { AuthState } from './authState';
import { displayName } from './authService';

export function Login({ userName, authState, onAuthChange }) {
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

      {authState === AuthState.Authenticated && (
        <Authenticated userName={userName} onLogout={() => onAuthChange('', AuthState.Unauthenticated)} />
      )}
      {authState === AuthState.Unauthenticated && (
        <Unauthenticated
          userName={userName}
          onLogin={(loginUserName) => onAuthChange(loginUserName, AuthState.Authenticated)}
        />
      )}

      <div id="current-player">
        <span>Playing as:</span>{' '}
        <span className="player-name">{authState === AuthState.Authenticated ? displayName(userName) : 'Guest'}</span>
      </div>
    </main>
  );
}
