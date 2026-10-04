import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';

import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Play } from './play/play';
import { NotFound } from './notfound/notfound';
import { AuthContext } from './login/authContext';
import { AuthModal } from './login/authModal';
import { GameNotifier } from './play/gameNotifier';
import { takePendingScore } from './play/guestGate';
import { saveScore } from './leaderboard/scores';
import { currentUser, displayName, forgetUser, logout, verifySession } from './login/authService';
import { Icon } from './icons';
import { ToastProvider, useToast } from './toast';
import { loadBoardTheme } from './play/boardTheme';

const Leaderboard = React.lazy(() => import('./leaderboard/leaderboard').then((m) => ({ default: m.Leaderboard })));
const Learn = React.lazy(() => import('./learn/learn').then((m) => ({ default: m.Learn })));
const About = React.lazy(() => import('./about/about').then((m) => ({ default: m.About })));

const siteName = 'Stockfish Survival';
const repoUrl = 'https://github.com/MaxwellaSchmutz/startup';
const siteUrl = 'https://startup.beatstockfish.click';
const pages = {
  '/': {
    title: `${siteName} · Survive Stockfish as long as you can`,
    description:
      'Stockfish Survival: play chess against Stockfish 19 right in your browser and see how many moves you can survive. Free, with a live global leaderboard.',
  },
  '/leaderboard': {
    title: `Leaderboard · ${siteName}`,
    description: 'The players who survived the longest against Stockfish 19, updated live as games finish.',
  },
  '/learn': {
    title: `Learn to play · ${siteName}`,
    description:
      'Learn how every chess piece moves, special moves like castling and en passant, and how games end, with interactive boards.',
  },
  '/about': {
    title: `About · ${siteName}`,
    description: 'How Stockfish Survival works, who made it, and a live Chess.com player lookup.',
  },
};

function setHeadValue(selector, attribute, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

const navItems = [
  { to: '/', label: 'Play', icon: 'play', end: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { to: '/learn', label: 'Learn', icon: 'book' },
  { to: '/about', label: 'About', icon: 'info' },
];

loadBoardTheme();

function PageTitle() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    const page = pages[pathname];
    document.title = page?.title ?? `Page not found · ${siteName}`;
    const url = siteUrl + (page ? pathname : '/');
    setHeadValue('link[rel="canonical"]', 'href', url);
    setHeadValue('meta[property="og:url"]', 'content', url);
    setHeadValue('meta[name="description"]', 'content', (page ?? pages['/']).description);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Loading() {
  return (
    <main className="page-loading" aria-busy="true">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </main>
  );
}

class PageErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    const chunkError = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
      String(error?.message),
    );
    try {
      if (chunkError && navigator.onLine && sessionStorage.getItem('chunkReload') !== '1') {
        sessionStorage.setItem('chunkReload', '1');
        window.location.reload();
      }
    } catch {
      return;
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.path !== this.props.path && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page-error">
        <h1>Couldn't load this page</h1>
        <p>
          {navigator.onLine
            ? 'Part of the app failed to load. Reloading usually fixes it.'
            : "You're offline and this page hasn't been saved yet. Reconnect and try again."}
        </p>
        <div className="page-error-actions">
          <Button variant="primary" onClick={() => window.location.reload()}>
            <Icon name="refresh" size={17} />
            Reload
          </Button>
          <Link className="btn btn-outline-light" to="/">
            Back to the game
          </Link>
        </div>
      </main>
    );
  }
}

function AppRoutes() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.removeItem('chunkReload');
      } catch {
        return;
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <PageErrorBoundary path={pathname}>
      <React.Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Play />} />
          <Route path="/play" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </PageErrorBoundary>
  );
}

function LoginButton({ onLogin, className = '' }) {
  return (
    <Button variant="warning" className={`login-button ${className}`} onClick={onLogin}>
      <Icon name="user" size={17} />
      Log in
    </Button>
  );
}

function SiteNav({ userName, onLogin, onLogout }) {
  const name = userName ? displayName(userName) : '';
  const { pathname } = useLocation();
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => setExpanded(false), [pathname, userName]);

  function login() {
    setExpanded(false);
    onLogin();
  }

  function logoutAndClose() {
    setExpanded(false);
    onLogout();
  }

  return (
    <header className={`site-header ${pathname === '/' ? 'is-home' : ''}`}>
      <Navbar expand="md" collapseOnSelect variant="dark" expanded={expanded} onToggle={setExpanded}>
        <Navbar.Brand as={Link} to="/" className="site-brand">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span className="brand-text">Stockfish Survival</span>
        </Navbar.Brand>
        {!userName && <LoginButton onLogin={login} className="login-compact d-md-none" />}
        <Navbar.Toggle aria-controls="main-nav" aria-expanded={expanded} label="Menu" />
        <Navbar.Collapse id="main-nav">
          <Nav as="ul" className="me-auto site-nav-links">
            {navItems.map((item) => (
              <Nav.Item as="li" key={item.to}>
                <Nav.Link as={NavLink} eventKey={item.label.toLowerCase()} to={item.to} end={item.end}>
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <Nav className={`nav-account ${userName ? '' : 'd-none d-md-flex'}`}>
            {userName ? (
              <NavDropdown
                id="account-menu"
                align="end"
                title={
                  <>
                    <span className="avatar" aria-hidden="true">
                      {name.charAt(0)}
                    </span>
                    <span className="player-name nav-user">{name}</span>
                  </>
                }
              >
                <NavDropdown.ItemText className="account-email">{userName}</NavDropdown.ItemText>
                <NavDropdown.Item as={Link} to="/leaderboard" eventKey="my-games">
                  <Icon name="trophy" size={16} />
                  Your games
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as="button" eventKey="logout" onClick={logoutAndClose}>
                  <Icon name="logout" size={16} />
                  Log out
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <LoginButton onLogin={login} />
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}

function SiteFooter() {
  const { pathname } = useLocation();
  return (
    <footer className={`site-footer ${pathname === '/' ? 'is-home' : ''}`}>
      <div className="site-footer-inner">
        <span>Stockfish Survival by Maxwell Schmutz</span>
        <nav aria-label="Footer">
          <Link to="/learn">Learn</Link>
          <Link to="/about">About</Link>
          <a href={repoUrl}>GitHub</a>
        </nav>
      </div>
    </footer>
  );
}

function AppShell() {
  const notify = useToast();
  const [userName, setUserName] = React.useState(currentUser());
  const [authModal, setAuthModal] = React.useState({ show: false, reason: null });

  React.useEffect(() => {
    if (!userName) return;
    verifySession().then((email) => setUserName(email || ''));
  }, []);

  const openAuth = React.useCallback((reason = { kind: 'login' }) => setAuthModal({ show: true, reason }), []);

  async function handleAuthenticated(email) {
    setUserName(email);
    GameNotifier.reconnect();
    const pending = takePendingScore();
    if (!pending) {
      notify(`Signed in as ${displayName(email)}`);
      return null;
    }
    try {
      await saveScore({ moves: pending.moves, result: pending.result });
      return { moves: pending.moves };
    } catch (err) {
      return { moves: pending.moves, error: err.message };
    }
  }

  const sessionExpired = React.useCallback(() => {
    forgetUser();
    setUserName('');
    GameNotifier.reconnect();
  }, []);

  async function handleLogout() {
    await logout();
    setUserName('');
    GameNotifier.reconnect();
    notify('Logged out');
  }

  const auth = React.useMemo(
    () => ({ userName, openAuth, logout: handleLogout, notify, sessionExpired }),
    [userName, openAuth, notify, sessionExpired],
  );

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <PageTitle />
        <div className="app-shell">
          <SiteNav userName={userName} onLogin={() => openAuth({ kind: 'login' })} onLogout={handleLogout} />

          <AppRoutes />

          <SiteFooter />
        </div>

        <AuthModal
          show={authModal.show}
          reason={authModal.reason}
          onHide={() => setAuthModal((current) => ({ ...current, show: false }))}
          onAuthenticated={handleAuthenticated}
        />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
