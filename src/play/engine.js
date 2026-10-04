import { chooseMove } from './fallbackEngine';

const enginePath = '/stockfish/stockfish-19-lite-single.js';
const searchNodes = 60000;
const minThinkMs = 400;
const startupTimeoutMs = 20000;
const searchTimeoutMs = 20000;

let engine = null;
let engineFailed = false;
let searchQueue = Promise.resolve();

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

  const waitForLine = (matches, timeoutMs) =>
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
    const uciOk = waitForLine((line) => line === 'uciok', startupTimeoutMs);
    send('uci');
    await uciOk;
    const readyOk = waitForLine((line) => line === 'readyok', startupTimeoutMs);
    send('isready');
    await readyOk;
  })();

  engine = { send, waitForLine, ready };
  return engine;
}

function parseBestMove(line) {
  const uci = line.split(' ')[1];
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

async function stockfishMove(fen) {
  const { send, waitForLine, ready } = startEngine();
  await ready;
  const bestMove = waitForLine((line) => line.startsWith('bestmove'), searchTimeoutMs);
  send(`position fen ${fen}`);
  send(`go nodes ${searchNodes}`);
  return parseBestMove(await bestMove);
}

export function preloadEngine() {
  if (engineFailed) return;
  startEngine().ready.catch(() => {});
}

export function getEngineMove(fen) {
  const search = searchQueue.then(async () => {
    const [move] = await Promise.all([engineFailed ? null : stockfishMove(fen), delay(minThinkMs)]);
    return move;
  });
  searchQueue = search.catch(() => {});

  return search
    .catch((err) => {
      if (!engineFailed) {
        engineFailed = true;
        console.warn('Stockfish unavailable, using the built-in fallback engine.', err);
      }
      return null;
    })
    .then((move) => move ?? chooseMove(fen));
}
