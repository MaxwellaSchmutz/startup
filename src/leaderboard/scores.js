// Score calls to the backend service (service/index.js). The leaderboard is
// public; saving a score requires the auth cookie, and the server fills in the
// player's name and the date itself.

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
  return response.json();
}
