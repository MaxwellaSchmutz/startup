import React from 'react';
import { Chess } from 'chess.js';
import { analyzePosition } from '../play/engine';
import {
  describeThreat,
  gradeMove,
  lineToSan,
  nullMoveFen,
  positionTips,
  scoreForWhite,
  toSan,
} from './coach';

const positionNodes = 120000;
const threatNodes = 40000;

function finalScore(fen) {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return chess.turn() === 'b' ? 10000 : -10000;
  return 0;
}

export function useCoach({ enabled, game, fen, status, lastPlayerMove }) {
  const cache = React.useRef(new Map());
  const [current, setCurrent] = React.useState(null);
  const [threat, setThreat] = React.useState(null);
  const [review, setReview] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showThreat, setShowThreat] = React.useState(false);

  function analysis(position, nodes, key = position) {
    if (!cache.current.has(key)) {
      cache.current.set(key, analyzePosition(position, { nodes }).catch(() => null));
    }
    return cache.current.get(key);
  }

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    const turn = game.turn();
    setShowHint(false);
    setShowThreat(false);
    setThreat(null);

    if (game.isGameOver()) {
      setCurrent({ fen, score: finalScore(fen), bestMove: null, bestSan: '', line: [] });
      return;
    }

    analysis(fen, positionNodes).then((result) => {
      if (!active || !result) return;
      setCurrent({
        fen,
        score: scoreForWhite(result.lines[0], turn),
        bestMove: result.bestMove,
        bestSan: toSan(fen, result.bestMove),
        line: lineToSan(fen, result.lines[0]?.pv ?? []),
      });
    });

    if (turn === 'w' && status !== 'over' && !game.inCheck()) {
      const threatFen = nullMoveFen(fen);
      analysis(threatFen, threatNodes, `threat ${threatFen}`).then((result) => {
        if (active && result) setThreat(describeThreat(threatFen, result));
      });
    }

    return () => {
      active = false;
    };
  }, [enabled, fen]);

  React.useEffect(() => {
    if (!enabled || !lastPlayerMove) {
      setReview(null);
      return;
    }
    let active = true;
    const { fenBefore, fenAfter, move } = lastPlayerMove;
    setReview({ pending: true, san: move.san });

    Promise.all([analysis(fenBefore, positionNodes), analysis(fenAfter, positionNodes)]).then(([before, after]) => {
      if (!active || !before) return;
      const beforeScore = scoreForWhite(before.lines[0], 'w');
      const afterScore = after?.lines[0] ? scoreForWhite(after.lines[0], 'b') : finalScore(fenAfter);
      if (beforeScore === null || afterScore === null) {
        setReview(null);
        return;
      }
      const { grade, loss } = gradeMove(move, before.bestMove, beforeScore, afterScore);
      setReview({
        pending: false,
        san: move.san,
        grade,
        loss,
        before: beforeScore,
        after: afterScore,
        fenBefore,
        playedMove: { from: move.from, to: move.to },
        bestMove: before.bestMove,
        bestSan: toSan(fenBefore, before.bestMove),
        bestLine: lineToSan(fenBefore, before.lines[0]?.pv ?? []),
      });
    });

    return () => {
      active = false;
    };
  }, [enabled, lastPlayerMove]);

  const playerTurn = game.turn() === 'w' && status !== 'over';
  const tips = enabled && playerTurn ? positionTips(game) : [];
  const arrows = [];
  if (enabled && playerTurn && showHint && current?.fen === fen && current.bestMove) {
    arrows.push({ ...current.bestMove, kind: 'hint' });
  }
  if (enabled && playerTurn && showThreat && threat) {
    arrows.push({ ...threat.move, kind: 'threat' });
  }

  return {
    current: current?.fen === fen ? current : null,
    threat: playerTurn ? threat : null,
    review,
    tips,
    arrows,
    showHint,
    setShowHint,
    showThreat,
    setShowThreat,
  };
}
