import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt-builder.js';

const client = new Anthropic();

const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const maxHistory = parseInt(process.env.MAX_HISTORY || '50', 10);

// Historial de conversación único (un solo chat)
const history = [];
let systemPrompt = null;

function getSystemPrompt() {
  // Se construye una sola vez al iniciar, leyendo la carpeta Equipo/
  if (!systemPrompt) {
    systemPrompt = buildSystemPrompt();
    console.log('System prompt construido desde Equipo/');
  }
  return systemPrompt;
}

// Recorta historial si excede el máximo
function trimHistory() {
  while (history.length > maxHistory) {
    history.shift();
  }
}

export async function chat(userMessage) {
  history.push({ role: 'user', content: userMessage });
  trimHistory();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: getSystemPrompt(),
      messages: [...history],
    });

    const assistantMessage = response.content[0].text;

    history.push({ role: 'assistant', content: assistantMessage });
    trimHistory();

    return assistantMessage;
  } catch (error) {
    // Sacar el mensaje del usuario del historial si falla
    history.pop();
    throw error;
  }
}

export function clearHistory() {
  history.length = 0;
}

export function reloadPrompt() {
  systemPrompt = null;
  getSystemPrompt();
}
