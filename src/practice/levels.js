export const levels = [
  { id: 'beginner', label: 'Beginner', rating: 'Just learning', strength: { skill: 0, nodes: 400 } },
  { id: 'casual', label: 'Casual', rating: '~1400', strength: { elo: 1400, nodes: 20000 } },
  { id: 'club', label: 'Club', rating: '~1800', strength: { elo: 1800, nodes: 30000 } },
  { id: 'expert', label: 'Expert', rating: '~2200', strength: { elo: 2200, nodes: 40000 } },
  { id: 'master', label: 'Master', rating: '~2600', strength: { elo: 2600, nodes: 60000 } },
  { id: 'stockfish', label: 'Stockfish', rating: 'Full strength', strength: { nodes: 60000 } },
];

const storageKey = 'practiceLevel';

export function savedLevel() {
  try {
    return levels.find((level) => level.id === localStorage.getItem(storageKey)) ?? levels[1];
  } catch {
    return levels[1];
  }
}

export function saveLevel(level) {
  try {
    localStorage.setItem(storageKey, level.id);
  } catch {}
}
