import { Chess } from 'chess.js';
import { pieceNames } from '../play/chessBoard';

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const mateBase = 10000;

export const grades = {
  best: { label: 'Best move', tone: 'great' },
  good: { label: 'Good move', tone: 'good' },
  inaccuracy: { label: 'Inaccuracy', tone: 'warn' },
  mistake: { label: 'Mistake', tone: 'bad' },
  blunder: { label: 'Blunder', tone: 'awful' },
};

export function scoreForWhite(line, sideToMove) {
  if (!line) return null;
  const score = line.mate !== null ? Math.sign(line.mate) * (mateBase - Math.abs(line.mate) * 10) : line.cp;
  return sideToMove === 'w' ? score : -score;
}

export function formatScore(score) {
  if (score === null || score === undefined) return '–';
  if (Math.abs(score) > mateBase / 2) {
    const movesToMate = Math.round((mateBase - Math.abs(score)) / 10);
    return `${score > 0 ? '' : '-'}M${movesToMate}`;
  }
  const pawns = score / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export function barShare(score) {
  if (score === null) return 0.5;
  const capped = Math.max(-1000, Math.min(1000, score));
  return 1 / (1 + Math.exp(-capped / 250));
}

export function gradeMove(played, bestMove, before, after) {
  const loss = Math.max(0, before - after);
  const playedBest = bestMove && played.from === bestMove.from && played.to === bestMove.to;
  if (playedBest || loss <= 15) return { grade: 'best', loss };
  if (loss <= 50) return { grade: 'good', loss };
  if (loss <= 120) return { grade: 'inaccuracy', loss };
  if (loss <= 300) return { grade: 'mistake', loss };
  return { grade: 'blunder', loss };
}

export function toSan(fen, move) {
  if (!move) return '';
  try {
    return new Chess(fen).move(move).san;
  } catch {
    return '';
  }
}

export function lineToSan(fen, uciMoves, limit = 6) {
  const chess = new Chess(fen);
  const sans = [];
  for (const uci of uciMoves.slice(0, limit)) {
    try {
      sans.push(chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san);
    } catch {
      break;
    }
  }
  return sans;
}

function describe(piece, square) {
  return `${pieceNames[piece.type]} on ${square}`;
}

export function hangingPieces(chess) {
  const found = [];
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== 'w' || piece.type === 'k') continue;
      const attackers = chess.attackers(piece.square, 'b');
      if (attackers.length === 0) continue;
      const defenders = chess.attackers(piece.square, 'w');
      const cheapestAttacker = Math.min(...attackers.map((sq) => pieceValues[chess.get(sq).type] || 0));
      if (defenders.length === 0 || cheapestAttacker < pieceValues[piece.type]) {
        found.push({ piece, square: piece.square, defended: defenders.length > 0 });
      }
    }
  }
  return found.sort((a, b) => pieceValues[b.piece.type] - pieceValues[a.piece.type]);
}

export function positionTips(chess) {
  const tips = [];
  if (chess.inCheck()) tips.push('You are in check. Block it, capture the checking piece, or move your king.');

  for (const { piece, square, defended } of hangingPieces(chess).slice(0, 2)) {
    tips.push(
      defended
        ? `Your ${describe(piece, square)} is attacked by a cheaper piece. Defending it is not enough; move it.`
        : `Your ${describe(piece, square)} is attacked and nothing defends it.`
    );
  }

  const moveNumber = Math.ceil(chess.history().length / 2);
  const castling = chess.getCastlingRights('w');
  if (moveNumber >= 8 && (castling.k || castling.q) && chess.get('e1')?.type === 'k') {
    tips.push('Your king is still in the middle. Castling tucks it behind your pawns.');
  }
  if (moveNumber <= 6 && !chess.get('d1') && chess.history({ verbose: true }).some((m) => m.color === 'w' && m.piece === 'q')) {
    tips.push('Bringing the queen out early lets Stockfish chase it while developing pieces.');
  }
  return tips;
}

export function nullMoveFen(fen) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  return parts.join(' ');
}

export function describeThreat(fen, analysis) {
  const line = analysis.lines[0];
  if (!line || !analysis.bestMove) return null;
  const chess = new Chess(fen);
  let move;
  try {
    move = chess.move(analysis.bestMove);
  } catch {
    return null;
  }
  if (line.mate !== null && line.mate > 0) {
    return { move: analysis.bestMove, text: `Stockfish threatens ${move.san}, leading to checkmate in ${line.mate}.` };
  }
  if (move.captured && pieceValues[move.captured] >= 3) {
    return { move: analysis.bestMove, text: `Stockfish threatens ${move.san}, winning your ${pieceNames[move.captured]} on ${move.to}.` };
  }
  return null;
}
