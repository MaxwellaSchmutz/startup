function loadSettings() {
  try {
    return require('./tutorConfig.json');
  } catch {
    return {};
  }
}

const settings = loadSettings();
const region = process.env.TUTOR_REGION || settings.region || 'us-east-2';
const modelId = process.env.TUTOR_MODEL_ID || settings.modelId || '';
const bedrock = modelId ? require('@aws-sdk/client-bedrock-runtime') : null;
const client = bedrock ? new bedrock.BedrockRuntimeClient({ region }) : null;

const systemPrompt = [
  'You are a warm, encouraging chess coach for beginners and casual players inside a web game called Stockfish Survival.',
  'The student plays White against the Stockfish engine.',
  'You are given facts computed by Stockfish. Treat them as the only source of truth: never invent moves, lines, or evaluations, and never contradict the engine.',
  'Explain in plain language why the move the student played was weaker or stronger than the engine move, and the idea behind the engine move (threats, hanging pieces, king safety, development, tactics).',
  'Keep it to 2-4 short sentences, no markdown, no lists, and mention moves in standard algebraic notation exactly as given.',
].join(' ');

function pawns(score) {
  if (Math.abs(score) > 5000) return score > 0 ? 'White is winning by force (mate)' : 'Black is winning by force (mate)';
  return `${(score / 100).toFixed(1)} pawns from White's point of view`;
}

function buildPrompt(facts) {
  return [
    `Position before the student's move (FEN): ${facts.fen}`,
    `Student played: ${facts.played}`,
    `Stockfish's best move was: ${facts.best}`,
    `Stockfish's best line from that position: ${facts.line.join(' ') || 'n/a'}`,
    `Move grade: ${facts.grade}`,
    `Evaluation before the move: ${pawns(facts.before)}`,
    `Evaluation after the move: ${pawns(facts.after)}`,
    'Explain this to the student.',
  ].join('\n');
}

function isAvailable() {
  return Boolean(client);
}

async function explainMove(facts) {
  const response = await client.send(
    new bedrock.ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      messages: [{ role: 'user', content: [{ text: buildPrompt(facts) }] }],
      inferenceConfig: { maxTokens: 300, temperature: 0.3 },
    })
  );
  return response.output.message.content
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

module.exports = { isAvailable, explainMove };
