const currentUserKey = 'userName';

export const minPasswordLength = 8;

async function authRequest(endpoint, email, password) {
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

export function createAccount(email, password) {
  return authRequest('/api/auth/create', email, password);
}

export function login(email, password) {
  return authRequest('/api/auth/login', email, password);
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'DELETE' });
  } catch {}
  forgetUser();
}

export function forgetUser() {
  localStorage.removeItem(currentUserKey);
}

export function currentUser() {
  return localStorage.getItem(currentUserKey) || '';
}

export async function verifySession() {
  try {
    const response = await fetch('/api/user/me');
    if (response.ok) {
      const { email } = await response.json();
      localStorage.setItem(currentUserKey, email);
      return email;
    }
    if (response.status === 401) {
      forgetUser();
      return '';
    }
  } catch {}
  return currentUser();
}

export function displayName(email) {
  return email.split('@')[0];
}
