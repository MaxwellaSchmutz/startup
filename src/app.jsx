import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';

import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Login } from './login/login';
import { Play } from './play/play';
import { Leaderboard } from './leaderboard/leaderboard';
import { About } from './about/about';
import { NotFound } from './notfound/notfound';
import { AuthState } from './login/authState';
import { GameNotifier } from './play/gameNotifier';
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
        {/* Sticky and in the normal flow (not fixed-top), so the page below always
            starts under the nav bar whatever height it ends up on a given screen.
            Below the md breakpoint the links collapse behind a hamburger button;
            collapseOnSelect closes the menu again once a link is tapped. */}
        <header className="sticky-top">
          <Navbar expand="md" collapseOnSelect variant="dark" bg="dark">
            <div className="navbar-brand">Stockfish Survival</div>
            <Navbar.Toggle aria-controls="main-nav" />
            <Navbar.Collapse id="main-nav">
              <Nav as="menu">
                <Nav.Item as="li">
                  <Nav.Link as={NavLink} eventKey="home" to="">
                    Home
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link as={NavLink} eventKey="play" to="play">
                    Play
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link as={NavLink} eventKey="leaderboard" to="leaderboard">
                    Leaderboard
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item as="li">
                  <Nav.Link as={NavLink} eventKey="about" to="about">
                    About
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              {authenticated && <Navbar.Text className="player-name nav-user">{displayName(userName)}</Navbar.Text>}
            </Navbar.Collapse>
          </Navbar>
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
                  // let the live feed connection pick up the new login cookie
                  GameNotifier.reconnect();
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
