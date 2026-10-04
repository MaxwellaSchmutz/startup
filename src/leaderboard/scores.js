// Score calls to the backend service (service/index.js). The leaderboard is
// public; saving a score requires the auth cookie, and the server fills in the
// player's name and the timestamp itself.

// Scores carry an ISO createdAt timestamp; show it in the player's own locale.
// navigator.languages is the browser's language preference, which can differ
// from the runtime's default locale that a bare toLocaleDateString() uses.
export function formatDate(createdAt) {
  return createdAt ? new Date(createdAt).toLocaleDateString(navigator.languages) : '';
}

export function formatShortDate(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const options = sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', year: 'numeric' };
  return date.toLocaleDateString(navigator.languages, options);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function loadScores() {
  const response = await fetch('/api/scores');
  if (!response.ok) {
    throw new Error(`Could not load the leaderboard (${response.status}).`);
  }
  return response.json();
}

// The logged-in player's { best, recent, total } from the database
export async function loadMyGames() {
  const response = await fetch('/api/user/games');
  if (!response.ok) {
    throw new ApiError(response.status === 401 ? 'Log in to see your games.' : 'Could not load your games.', response.status);
  }
  return response.json();
}

// Site-wide totals for the home page. Optional: null if the service can't give them
export async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) return null;
    const stats = await response.json();
    const ok = ['totalGames', 'totalPlayers', 'bestMoves'].every((key) => Number.isFinite(stats[key]));
    return ok ? stats : null;
  } catch {
    return null;
  }
}

// result: 'checkmate' | 'resign' | 'time' | 'draw' | 'win'
export async function saveScore({ moves, result }) {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moves, result }),
  });
  if (response.status === 401) {
    throw new ApiError('Your session expired. Log in again to save this game.', 401);
  }
  if (!response.ok) {
    throw new ApiError('The server could not save this game.', response.status);
  }
  // 201 Created with just the saved score; the leaderboard fetches its own list
  return response.json();
}
