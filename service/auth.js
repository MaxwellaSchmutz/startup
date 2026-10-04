const authCookieName = 'token';

function displayName(email) {
  return email.split('@')[0];
}

module.exports = { authCookieName, displayName };
