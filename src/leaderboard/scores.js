// Mocked score database. Completed games are kept in localStorage until the
// DB deliverable stores them in MongoDB through the backend service.

const scoresKey = 'scores';
const maxScores = 10;

export function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(scoresKey)) || [];
  } catch {
    return [];
  }
}

// score: { name, moves, result, date }. Keeps the top ten by moves survived;
// a new score that ties an old one ranks below it, since the old one got there first.
export function saveScore(score) {
  const scores = [...loadScores(), score].sort((a, b) => b.moves - a.moves).slice(0, maxScores);
  localStorage.setItem(scoresKey, JSON.stringify(scores));
  return scores;
}
