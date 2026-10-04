import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';

import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Login } from './login/login';
import { Play } from './play/play';
import { Leaderboard } from './leaderboard/leaderboard';
import { About } from './about/about';
import { NotFound } from './notfound/notfound';
import { AuthState } from './login/authState';
import { currentUser, displayName, verifySession } from './login/authService';

export default function App() {
  // Lifted state: Login changes who is logged in, and App needs to know so it
  // can show the player's name and pass it to Play. Anyone can play; only
  // logged-in players get their games saved to the leaderboard.
  const [userName, setUserName] = React.useState(currentUser());
  const [authState, setAuthState] = React.useState(userName ? AuthState.Authenticated : AuthState.Unauthenticated);
  const authenticated = authState === AuthState.Authenticated;

  // The remembered login can be stale (logged out elsewhere, or the service
  // restarted and forgot its sessions), so confirm it with the server once.
  React.useEffect(() => {
    if (!userName) return;
    verifySession().then((email) => {
      if (!email) {
        setUserName('');
        setAuthState(AuthState.Unauthenticated);
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <div className="body bg-dark text-light">
        <header className="container-fluid">
          <nav className="navbar fixed-top navbar-dark">
            <div className="navbar-brand">Stockfish Survival</div>
            <menu className="navbar-nav">
              <li className="nav-item">
                <NavLink className="nav-link" to="">
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="play">
                  Play
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="leaderboard">
                  Leaderboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="about">
                  About
                </NavLink>
              </li>
            </menu>
            {authenticated && <span className="navbar-text player-name nav-user">{displayName(userName)}</span>}
          </nav>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <Login
                userName={userName}
                authState={authState}
                onAuthChange={(newUserName, newAuthState) => {
                  setUserName(newUserName);
                  setAuthState(newAuthState);
                }}
              />
            }
          />
          <Route path="/play" element={<Play userName={authenticated ? userName : ''} />} />
          <Route path="/leaderboard" element={<Leaderboard userName={userName} />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        <footer className="bg-dark text-white-50">
          <div className="container-fluid">
            <span className="text-reset">Maxwell Schmutz</span>
            <a className="text-reset" href="https://github.com/MaxwellaSchmutz/startup">
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
