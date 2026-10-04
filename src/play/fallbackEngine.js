import { Chess } from 'chess.js';

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const mateScore = 100000;
const searchDepth = 2;
const varietyMargin = 15;

function centerBonus({ square, type }) {
  if (type === 'k' || type === 'q') return 0;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const centrality = 7 - (Math.abs(file - 3.5) + Math.abs(rank - 3.5));
  return centrality * (type === 'p' ? 3 : 5);
}

function scoreForBlack(chess, plyFromRoot) {
  if (chess.isCheckmate()) {
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
    return scoreForBlack(chess, plyFromRoot);
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

  const bestScore = Math.max(...scored.map((s) => s.score));
  const candidates = scored.filter((s) => s.score >= bestScore - varietyMargin);
  const { move } = candidates[Math.floor(Math.random() * candidates.length)];
  return { from: move.from, to: move.to, promotion: move.promotion };
}
