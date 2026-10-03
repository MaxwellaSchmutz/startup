// Mocked account service. This will be replaced with calls to the backend's
// /api/auth endpoints in the Service and Login deliverables. Until then the
// browser's localStorage stands in for the user database. Only the email is
// remembered, never the password, since localStorage isn't a safe place for it.

const usersKey = 'users';
const currentUserKey = 'userName';

function registeredUsers() {
  try {
    return JSON.parse(localStorage.getItem(usersKey)) || [];
  } catch {
    return [];
  }
}

function validate(email, password) {
  if (!email.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  if (!password) {
    throw new Error('Enter a password.');
  }
}

export async function createAccount(email, password) {
  validate(email, password);
  const users = registeredUsers();
  if (users.includes(email)) {
    throw new Error(`An account for ${email} already exists. Try logging in instead.`);
  }
  localStorage.setItem(usersKey, JSON.stringify([...users, email]));
  localStorage.setItem(currentUserKey, email);
  return email;
}

export async function login(email, password) {
  validate(email, password);
  if (!registeredUsers().includes(email)) {
    throw new Error(`No account found for ${email}. Create an account first.`);
  }
  localStorage.setItem(currentUserKey, email);
  return email;
}

export function logout() {
  localStorage.removeItem(currentUserKey);
}

export function currentUser() {
  return localStorage.getItem(currentUserKey) || '';
}

// "magnus@example.com" -> "magnus", used everywhere a player name is shown
export function displayName(email) {
  return email.split('@')[0];
}
