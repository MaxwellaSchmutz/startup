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

function clearPendingScore() {
  safely(() => sessionStorage.removeItem(pendingKey));
}

export function getPendingScore() {
  const pending = safely(() => JSON.parse(sessionStorage.getItem(pendingKey)), null);
  if (!pending || !Number.isInteger(pending.moves) || typeof pending.result !== 'string') return null;
  if (Date.now() - pending.at > pendingMaxAgeMs) {
    clearPendingScore();
    return null;
  }
  return pending;
}

export function takePendingScore() {
  const pending = getPendingScore();
  clearPendingScore();
  return pending;
}
