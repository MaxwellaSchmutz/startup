export const resultMessages = {
  checkmate: 'Checkmate. Stockfish got you.',
  resign: 'You resigned.',
  time: 'Out of time on the move clock.',
  draw: 'Draw. Stockfish could not finish you off.',
  win: 'You checkmated Stockfish?! Legendary.',
};

export const resultLabels = {
  checkmate: 'Checkmated',
  resign: 'Resigned',
  time: 'Out of time',
  draw: 'Draw',
  win: 'Won!',
};

export const resultText = {
  checkmate: 'checkmate',
  resign: 'resigned',
  time: 'ran out of time',
  draw: 'draw',
  win: 'beat Stockfish!',
};

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
