import { chooseMove } from './fallbackEngine';

const enginePath = '/stockfish/stockfish-19-lite-single.js';
const minThinkMs = 400;
const startupTimeoutMs = 20000;
const searchTimeoutMs = 20000;

export const fullStrength = { nodes: 60000 };

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createEngine() {
  const worker = new Worker(enginePath);
  const listeners = new Set();
  let workerError = null;

  worker.onmessage = (e) => listeners.forEach((listener) => listener(String(e.data)));
  worker.onerror = (e) => {
    workerError = new Error(`Stockfish worker failed: ${e.message || 'could not load'}`);
    listeners.forEach((listener) => listener(null));
  };

  const send = (command) => worker.postMessage(command);

  const waitForLine = (matches, timeoutMs, onLine) =>
    new Promise((resolve, reject) => {
      const listener = (line) => {
        if (line === null || workerError) {
          cleanup();
          reject(workerError);
        } else if (matches(line)) {
          cleanup();
          resolve(line);
        } else if (onLine) {
          onLine(line);
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

  return { send, waitForLine, ready, queue: Promise.resolve(), options: '' };
}

function parseUci(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function strengthCommands({ skill = 20, elo = null }) {
  return [
    `setoption name Skill Level value ${skill}`,
    `setoption name UCI_LimitStrength value ${elo ? 'true' : 'false'}`,
    ...(elo ? [`setoption name UCI_Elo value ${elo}`] : []),
  ];
}

function runSearch(engine, task) {
  const search = engine.queue.then(async () => {
    await engine.ready;
    return task(engine);
  });
  engine.queue = search.catch(() => {});
  return search;
}

let player = null;
let analyst = null;
let playerFailed = false;

function playerEngine() {
  if (!player) player = createEngine();
  return player;
}

function analystEngine() {
  if (!analyst) analyst = createEngine();
  return analyst;
}

export function preloadEngine() {
  if (playerFailed) return;
  playerEngine().ready.catch(() => {});
}

export function getEngineMove(fen, strength = fullStrength) {
  const search = playerFailed
    ? Promise.reject(new Error('Stockfish unavailable'))
    : runSearch(playerEngine(), async (engine) => {
        const commands = strengthCommands(strength);
        const key = commands.join('|');
        if (engine.options !== key) {
          commands.forEach(engine.send);
          engine.options = key;
        }
        const bestMove = engine.waitForLine((line) => line.startsWith('bestmove'), searchTimeoutMs);
        engine.send(`position fen ${fen}`);
        engine.send(`go nodes ${strength.nodes}`);
        return parseUci((await bestMove).split(' ')[1]);
      });

  return Promise.all([search.catch((err) => err), delay(minThinkMs)]).then(([move]) => {
    if (!(move instanceof Error)) return move;
    if (!playerFailed) {
      playerFailed = true;
      console.warn('Stockfish unavailable, using the built-in fallback engine.', move);
    }
    return chooseMove(fen);
  });
}

function parseInfo(line) {
  const parts = line.split(' ');
  const at = (name) => parts.indexOf(name);
  if (at('multipv') < 0 || at('score') < 0 || at('pv') < 0) return null;
  const kind = parts[at('score') + 1];
  const value = Number(parts[at('score') + 2]);
  return {
    rank: Number(parts[at('multipv') + 1]),
    cp: kind === 'cp' ? value : null,
    mate: kind === 'mate' ? value : null,
    pv: parts.slice(at('pv') + 1),
  };
}

export function analyzePosition(fen, { nodes = 120000, lines = 1 } = {}) {
  return runSearch(analystEngine(), async (engine) => {
    const latest = new Map();
    const done = engine.waitForLine(
      (line) => line.startsWith('bestmove'),
      searchTimeoutMs,
      (line) => {
        const info = line.startsWith('info') ? parseInfo(line) : null;
        if (info) latest.set(info.rank, info);
      }
    );
    engine.send(`setoption name MultiPV value ${lines}`);
    engine.send(`position fen ${fen}`);
    engine.send(`go nodes ${nodes}`);
    const bestLine = await done;
    const best = bestLine.split(' ')[1];
    const ranked = [...latest.values()].sort((a, b) => a.rank - b.rank);
    return {
      bestMove: best && best !== '(none)' ? parseUci(best) : null,
      lines: ranked.map((info) => ({ ...info, move: parseUci(info.pv[0]) })),
    };
  });
}
