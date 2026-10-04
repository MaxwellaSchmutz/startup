// Score calls to the backend service (service/index.js). The leaderboard is
// public; saving a score requires the auth cookie, and the server fills in the
// player's name and the timestamp itself.

// Scores carry an ISO createdAt timestamp; show it in the player's own locale.
// navigator.languages is the browser's language preference, which can differ
// from the runtime's default locale that a bare toLocaleDateString() uses.
export function formatDate(createdAt) {
  return createdAt ? new Date(createdAt).toLocaleDateString(navigator.languages) : '';
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
    throw new Error(response.status === 401 ? 'Log in to see your games.' : 'Could not load your games.');
  }
  return response.json();
}

// result: 'checkmate' | 'resign' | 'time' | 'draw' | 'win'
export async function saveScore({ moves, result }) {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moves, result }),
  });
  if (response.status === 401) {
    throw new Error('Your session expired, so this game was not saved. Log in again to save your next one.');
  }
  if (!response.ok) {
    throw new Error('The server could not save this game.');
  }
  // 201 Created with just the saved score; the leaderboard fetches its own list
  return response.json();
}
