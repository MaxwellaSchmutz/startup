import React from 'react';
import Button from 'react-bootstrap/Button';
import { MessageDialog } from './messageDialog';
import { createAccount, login } from './authService';

export function Unauthenticated({ userName, onLogin }) {
  const [email, setEmail] = React.useState(userName);
  const [password, setPassword] = React.useState('');
  const [displayError, setDisplayError] = React.useState(null);

  async function authenticate(action) {
    try {
      onLogin(await action(email.trim(), password));
    } catch (err) {
      setDisplayError(err.message);
    }
  }

  return (
    <div>
      <h2>Login or create an account</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          authenticate(login);
        }}
      >
        <div className="input-group mb-3">
          <span className="input-group-text">@</span>
          <input
            className="form-control"
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
        <div className="input-group mb-3">
          <span className="input-group-text">🔒</span>
          <input
            className="form-control"
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        <Button variant="primary" type="submit" disabled={!email || !password}>
          Login
        </Button>{' '}
        <Button variant="secondary" onClick={() => authenticate(createAccount)} disabled={!email || !password}>
          Create Account
        </Button>
      </form>

      <MessageDialog message={displayError} onHide={() => setDisplayError(null)} />
    </div>
  );
}
