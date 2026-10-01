import React from 'react';
import Button from 'react-bootstrap/Button';

export function Login() {
  return (
    <main className="container-fluid bg-secondary text-center">
      <div>
        <h1>Welcome to Simon</h1>
        <div>
          <div className="input-group mb-3">
            <span className="input-group-text">@</span>
            <input className="form-control" type="text" placeholder="your@email.com" />
          </div>
          <div className="input-group mb-3">
            <span className="input-group-text">🔒</span>
            <input className="form-control" type="password" placeholder="password" />
          </div>
          <Button variant="primary">Login</Button>{' '}
          <Button variant="secondary">Create</Button>
        </div>
      </div>
    </main>
  );
}
