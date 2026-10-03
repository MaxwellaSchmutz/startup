// Mocked Chess.com PubAPI. The Service deliverable will replace getPlayerStats
// with a real fetch of https://api.chess.com/pub/player/{username}/stats.
// Until then it returns hard-coded data shaped like that endpoint's response
// (trimmed to the blitz fields this page shows).

const knownPlayers = {
  magnuscarlsen: { rating: 3283, win: 3125, loss: 541, draw: 712 },
  hikaru: { rating: 3299, win: 21847, loss: 4433, draw: 3268 },
  gothamchess: { rating: 2509, win: 7652, loss: 4109, draw: 1046 },
  danielnaroditsky: { rating: 3190, win: 13530, loss: 3216, draw: 1862 },
};

// Made-up but stable numbers for any other username, so every lookup "works".
function fakeStats(username) {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { rating: 600 + (hash % 1600), win: hash % 900, loss: (hash >> 3) % 900, draw: (hash >> 6) % 120 };
}

export async function getPlayerStats(username) {
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,25}$/.test(name)) {
    throw new Error('Chess.com usernames are 3-25 letters, numbers, dashes, or underscores.');
  }

  // simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  const { rating, win, loss, draw } = knownPlayers[name] ?? fakeStats(name);
  return {
    username,
    chess_blitz: {
      last: { rating },
      record: { win, loss, draw },
    },
  };
}
