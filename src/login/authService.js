// Account calls to the backend service (service/index.js). The service keeps
// the real session in an httpOnly cookie; localStorage only remembers which
// email is logged in so the UI can render immediately on reload, and
// verifySession() checks that against the server.

const currentUserKey = 'userName';

async function authRequest(endpoint, email, password) {
  if (!email.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  if (!password) {
    throw new Error('Enter a password.');
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.msg || `Request failed (${response.status}).`);
  }
  localStorage.setItem(currentUserKey, body.email);
  return body.email;
}

// Matches the service's registration rule, so the player hears about it right away
export const minPasswordLength = 8;

export function createAccount(email, password) {
  if (password && password.length < minPasswordLength) {
    return Promise.reject(new Error('Choose a password with at least ' + minPasswordLength + ' characters.'));
  }
  return authRequest('/api/auth/create', email, password);
}

export function login(email, password) {
  return authRequest('/api/auth/login', email, password);
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'DELETE' });
  } catch {
    // Offline: the cookie can't be cleared server-side, but forget it locally anyway
  } finally {
    localStorage.removeItem(currentUserKey);
  }
}

export function forgetUser() {
  localStorage.removeItem(currentUserKey);
}

export function currentUser() {
  return localStorage.getItem(currentUserKey) || '';
}

// Asks the server who the auth cookie belongs to. Returns '' if the session
// is gone (logged out elsewhere, or the service restarted and forgot it).
export async function verifySession() {
  try {
    const response = await fetch('/api/user/me');
    if (response.ok) {
      const { email } = await response.json();
      localStorage.setItem(currentUserKey, email);
      return email;
    }
    if (response.status === 401) {
      localStorage.removeItem(currentUserKey);
      return '';
    }
  } catch {
    // Server unreachable: keep whatever we had rather than logging the player out
  }
  return currentUser();
}

// "magnus@example.com" -> "magnus", used everywhere a player name is shown
export function displayName(email) {
  return email.split('@')[0];
}
