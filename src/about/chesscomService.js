const apiBase = 'https://api.chess.com/pub/player';

const preferredTimeClasses = [
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
  const found = preferredTimeClasses.find(([key]) => stats[key]?.last);
  if (found) {
    const [key, timeClass] = found;
    const { last, record } = stats[key];
    Object.assign(player, { timeClass, rating: last.rating, ...record });
  }
  return player;
}
