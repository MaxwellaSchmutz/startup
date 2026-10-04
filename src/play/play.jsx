import React from 'react';
import { ChessGame } from './chessGame';
import { LiveActivity } from './liveActivity';
import './play.css';

export function Play({ userName }) {
  return (
    <main className="bg-secondary play-view">
      <ChessGame userName={userName} />
      <LiveActivity userName={userName} />
    </main>
  );
}
