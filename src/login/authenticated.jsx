import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import { displayName, logout } from './authService';

export function Authenticated({ userName, onLogout }) {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Ready to survive?</h2>
      <p>
        Logged in as <span className="player-name">{userName}</span>
      </p>
      <Button variant="primary" onClick={() => navigate('/play')}>
        Play as {displayName(userName)}
      </Button>{' '}
      <Button
        variant="outline-light"
        onClick={async () => {
          await logout();
          onLogout();
        }}
      >
        Logout
      </Button>
    </div>
  );
}
