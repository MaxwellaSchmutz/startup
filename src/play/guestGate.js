// A guest gets one free game. After that they need an account to keep playing,
// and the result of that free game can still be put on the leaderboard if they
// sign up from the same tab.

const usedKey = 'guestGameUsed';
const pendingKey = 'pendingScore';
const pendingMaxAgeMs = 60 * 60 * 1000;

function safely(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function guestGameUsed() {
  return safely(() => localStorage.getItem(usedKey) === '1', false);
}

export function markGuestGameUsed() {
  safely(() => localStorage.setItem(usedKey, '1'));
}

export function setPendingScore({ moves, result }) {
  safely(() => sessionStorage.setItem(pendingKey, JSON.stringify({ moves, result, at: Date.now() })));
}

export function clearPendingScore() {
  safely(() => sessionStorage.removeItem(pendingKey));
}

// The guest result waiting to be saved, or null if there isn't one (or it is
// too old to still count as "the game they just played")
export function getPendingScore() {
  const pending = safely(() => JSON.parse(sessionStorage.getItem(pendingKey)), null);
  if (!pending || !Number.isInteger(pending.moves) || typeof pending.result !== 'string') return null;
  if (Date.now() - pending.at > pendingMaxAgeMs) {
    clearPendingScore();
    return null;
  }
  return pending;
}

// Takes the pending score out of storage before saving it, so it can never be
// posted twice (two tabs, a double click, a re-render)
export function takePendingScore() {
  const pending = getPendingScore();
  clearPendingScore();
  return pending;
}
