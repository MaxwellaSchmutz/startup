// Third-party service: the Chess.com PubAPI (https://www.chess.com/news/view/published-data-api).
// It's public, needs no API key, and allows cross-origin requests, so the
// browser calls it directly. We fetch the player's profile (for the avatar and
// profile link) and their stats in parallel.

const apiBase = 'https://api.chess.com/pub/player';

// Shown in this order of preference: most people's main rating is blitz
const timeClasses = [
  ['chess_blitz', 'Blitz'],
  ['chess_rapid', 'Rapid'],
  ['chess_bullet', 'Bullet'],
  ['chess_daily', 'Daily'],
];

async function getJson(url, username) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Could not reach Chess.com. Check your connection and try again.');
  }
  if (response.status === 404) {
    throw new Error(`There's no Chess.com player named "${username}".`);
  }
  if (!response.ok) {
    throw new Error(`Chess.com returned an error (${response.status}). Try again in a moment.`);
  }
  return response.json();
}

// Returns { username, url, avatar, timeClass, rating, win, loss, draw }.
// timeClass is null if the player has no rated games.
export async function getPlayerStats(username) {
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,25}$/.test(name)) {
    throw new Error('Chess.com usernames are 3-25 letters, numbers, dashes, or underscores.');
  }

  const [profile, stats] = await Promise.all([
    getJson(`${apiBase}/${name}`, name),
    getJson(`${apiBase}/${name}/stats`, name),
  ]);

  const player = { username: profile.username ?? name, url: profile.url, avatar: profile.avatar, timeClass: null };
  const found = timeClasses.find(([key]) => stats[key]?.last);
  if (found) {
    const { last, record } = stats[found[0]];
    Object.assign(player, { timeClass: found[1], rating: last.rating, ...record });
  }
  return player;
}
