import React from 'react';
import { Link } from 'react-router-dom';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Spinner from 'react-bootstrap/Spinner';
import { createAccount, login, minPasswordLength } from './authService';
import { resultLabels } from '../play/results';
import { Icon } from '../icons';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode, email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!emailPattern.test(email.trim())) errors.email = 'That does not look like an email address.';
  if (!password) errors.password = 'Enter a password.';
  else if (mode === 'create' && password.length < minPasswordLength) {
    errors.password = `Use at least ${minPasswordLength} characters.`;
  }
  return errors;
}

function Intro({ reason }) {
  if (reason?.kind === 'result' || reason?.kind === 'expired') {
    const { moves, result } = reason;
    return (
      <div className="auth-intro auth-result">
        <div className="auth-result-moves">
          <span className="auth-result-number">{moves}</span> move{moves === 1 ? '' : 's'} survived
        </div>
        <div className="auth-result-detail">{resultLabels[result] ?? result}</div>
        <p>
          {reason.kind === 'expired'
            ? 'Your session expired before this game was saved. Log in again and it goes straight onto the leaderboard.'
            : 'Put this on the leaderboard: log in or create a free account and we will save it for you.'}
        </p>
      </div>
    );
  }
  if (reason?.kind === 'gate') {
    return (
      <div className="auth-intro auth-gate">
        <img src="/pieces/wN.svg" alt="" aria-hidden="true" />
        <p>
          <strong>Sign in to keep playing</strong> &mdash; your games will count on the leaderboard.
        </p>
      </div>
    );
  }
  return null;
}

export function AuthModal({ show, reason, onHide, onAuthenticated }) {
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(null);

  React.useEffect(() => {
    if (!show) return;
    setMode(!reason || reason.kind === 'login' || reason.kind === 'expired' ? 'login' : 'create');
    setPassword('');
    setTouched(false);
    setServerError('');
    setBusy(false);
    setSaved(null);
  }, [show, reason]);

  const errors = validate(mode, email, password);
  const valid = Object.keys(errors).length === 0;

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    setServerError('');
    if (!valid || busy) return;

    setBusy(true);
    try {
      const action = mode === 'create' ? createAccount : login;
      const userEmail = await action(email.trim(), password);
      const outcome = await onAuthenticated(userEmail);
      setPassword('');
      if (outcome) {
        setSaved(outcome);
      } else {
        onHide();
      }
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setServerError('');
    setTouched(false);
  }

  const title = saved
    ? 'Saved to the leaderboard'
    : reason?.kind === 'result'
      ? 'Nice game!'
      : reason?.kind === 'expired'
        ? 'Log in to save it'
      : mode === 'create'
        ? 'Create your account'
        : 'Welcome back';

  return (
    <Modal show={show} onHide={onHide} centered className="auth-modal" aria-labelledby="auth-modal-title">
      <Modal.Header closeButton>
        <Modal.Title id="auth-modal-title">{title}</Modal.Title>
      </Modal.Header>

      {saved ? (
        <>
          <Modal.Body>
            {saved.error ? (
              <p className="auth-error" role="alert">
                {saved.error}
              </p>
            ) : (
              <p className="auth-saved" role="status">
                <Icon name="check" size={20} />
                <span>Your {saved.moves}-move game is on the leaderboard. Every game you play from now on counts too.</span>
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button as={Link} to="/leaderboard" variant="outline-secondary" onClick={onHide}>
              <Icon name="trophy" size={17} />
              View leaderboard
            </Button>
            <Button variant="primary" onClick={onHide}>
              Keep playing
            </Button>
          </Modal.Footer>
        </>
      ) : (
        <Form noValidate onSubmit={submit}>
          <Modal.Body>
            <Intro reason={reason} />

            <Nav variant="pills" activeKey={mode} onSelect={(key) => switchMode(key)} className="auth-tabs" role="tablist">
              <Nav.Item>
                <Nav.Link eventKey="login" role="tab" aria-selected={mode === 'login'}>
                  Log in
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="create" role="tab" aria-selected={mode === 'create'}>
                  Create account
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Form.Group className="mb-3" controlId="auth-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isInvalid={touched && Boolean(errors.email)}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2" controlId="auth-password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                placeholder={mode === 'create' ? `At least ${minPasswordLength} characters` : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isInvalid={touched && Boolean(errors.password)}
              />
              <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
            </Form.Group>

            {serverError && (
              <div className="auth-error" role="alert">
                {serverError}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {(reason?.kind === 'result' || reason?.kind === 'expired') && (
              <Button variant="link" className="me-auto" onClick={onHide}>
                Not now
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={busy} className="auth-submit">
              {busy && <Spinner as="span" animation="border" size="sm" className="me-2" aria-hidden="true" />}
              {mode === 'create' ? 'Create account' : 'Log in'}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  );
}
