import { chooseMove } from './fallbackEngine';

// The opponent: real Stockfish 19, compiled to WebAssembly and running in a
// Web Worker in the player's own browser (files in public/stockfish/). We talk
// to it with the standard UCI text protocol: "position fen ..." then "go ...",
// and it answers "bestmove e7e5". If the engine can't start, the small minimax
// in fallbackEngine.js plays instead so the game still works.

const enginePath = '/stockfish/stockfish-19-lite-single.js';

// A fixed amount of search work per move (not a time limit), so Stockfish plays
// at the same strength on a fast laptop and a slow phone, keeping every
// player's score comparable. Even this small budget is far beyond human level.
const searchNodes = 60000;
const minThinkMs = 400; // instant replies feel jarring
const startupTimeoutMs = 20000;
const searchTimeoutMs = 20000;

let engine = null; // { send, waitFor, ready }
let engineFailed = false;
let queue = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startEngine() {
  if (engine) return engine;

  const worker = new Worker(enginePath);
  const listeners = new Set();
  let workerError = null;

  worker.onmessage = (e) => listeners.forEach((listener) => listener(String(e.data)));
  worker.onerror = (e) => {
    workerError = new Error(`Stockfish worker failed: ${e.message || 'could not load'}`);
    listeners.forEach((listener) => listener(null));
  };

  const send = (command) => worker.postMessage(command);

  // Resolves with the first line from the engine that matches.
  const waitFor = (matches, timeoutMs) =>
    new Promise((resolve, reject) => {
      const listener = (line) => {
        if (line === null || workerError) {
          cleanup();
          reject(workerError);
        } else if (matches(line)) {
          cleanup();
          resolve(line);
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Stockfish did not respond in time'));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        listeners.delete(listener);
      };
      listeners.add(listener);
    });

  const ready = (async () => {
    const uciOk = waitFor((line) => line === 'uciok', startupTimeoutMs);
    send('uci');
    await uciOk;
    const readyOk = waitFor((line) => line === 'readyok', startupTimeoutMs);
    send('isready');
    await readyOk;
  })();

  engine = { send, waitFor, ready };
  return engine;
}

// "e7e8q" -> { from: 'e7', to: 'e8', promotion: 'q' }
function parseBestMove(line) {
  const uci = line.split(' ')[1];
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

async function stockfishMove(fen) {
  const { send, waitFor, ready } = startEngine();
  await ready;
  const bestMove = waitFor((line) => line.startsWith('bestmove'), searchTimeoutMs);
  send(`position fen ${fen}`);
  send(`go nodes ${searchNodes}`);
  return parseBestMove(await bestMove);
}

// Start downloading and initializing the engine before the first move.
export function preloadEngine() {
  if (engineFailed) return;
  startEngine().ready.catch(() => {});
}

// Black's reply to the position. Searches run one at a time: if a new game
// starts while Stockfish is still thinking, the next search waits for the old
// one to finish, so a stale "bestmove" can never be mistaken for the new one.
export function getEngineMove(fen) {
  const search = queue.then(async () => {
    const [move] = await Promise.all([fen && !engineFailed ? stockfishMove(fen) : null, delay(minThinkMs)]);
    return move;
  });
  queue = search.catch(() => {});

  return search.catch((err) => {
    if (!engineFailed) {
      engineFailed = true;
      console.warn('Stockfish unavailable, using the built-in fallback engine.', err);
    }
    return null;
  }).then((move) => move ?? chooseMove(fen));
}
