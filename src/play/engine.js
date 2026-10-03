import { Chess } from 'chess.js';

// Mocked opponent. The real game will ask a Stockfish service for its move;
// until then this small minimax search (2 plies, material plus a nudge toward
// the center) stands in. It always plays black. It grabs hanging pieces and
// finds mate in one, which is enough to end most games eventually.

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const mateScore = 100000;
const searchDepth = 2;

function centerBonus({ square, type }) {
  if (type === 'k' || type === 'q') return 0;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const centrality = 7 - (Math.abs(file - 3.5) + Math.abs(rank - 3.5));
  return centrality * (type === 'p' ? 3 : 5);
}

// Positive scores favor black (the engine).
function evaluate(chess, plyFromRoot) {
  if (chess.isCheckmate()) {
    // prefer faster mates and slower losses
    return chess.turn() === 'b' ? -mateScore + plyFromRoot : mateScore - plyFromRoot;
  }
  if (chess.isDraw()) return 0;

  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece) {
        const value = pieceValues[piece.type] + centerBonus(piece);
        score += piece.color === 'b' ? value : -value;
      }
    }
  }
  return score;
}

function minimax(chess, depth, alpha, beta, plyFromRoot) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluate(chess, plyFromRoot);
  }

  const maximizing = chess.turn() === 'b';
  let best = maximizing ? -Infinity : Infinity;
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move);
    const score = minimax(chess, depth - 1, alpha, beta, plyFromRoot + 1);
    chess.undo();

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseMove(fen) {
  const chess = new Chess(fen);
  const scored = chess.moves({ verbose: true }).map((move) => {
    chess.move(move);
    const score = minimax(chess, searchDepth - 1, -Infinity, Infinity, 1);
    chess.undo();
    return { move, score };
  });

  // pick randomly among moves within 15 centipawns of the best so games vary
  const bestScore = Math.max(...scored.map((s) => s.score));
  const candidates = scored.filter((s) => s.score >= bestScore - 15);
  const { move } = candidates[Math.floor(Math.random() * candidates.length)];
  return { from: move.from, to: move.to, promotion: move.promotion };
}

// Async like the future service call, with a short "thinking" pause.
export async function getEngineMove(fen) {
  await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 500));
  return chooseMove(fen);
}
