import TelegramBot from 'node-telegram-bot-api';
import { chat, clearHistory, reloadPrompt } from './claude.js';

const token = process.env.TELEGRAM_TOKEN;
const allowedChatId = process.env.ALLOWED_CHAT_ID;

if (!token) {
  console.error('TELEGRAM_TOKEN no configurado en .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Referencia para enviar mensajes desde fuera (notificaciones)
let activeChatId = allowedChatId || null;

function isAllowed(chatId) {
  // Si no hay whitelist, el primer usuario que hable se registra
  if (!allowedChatId) {
    if (!activeChatId) {
      activeChatId = String(chatId);
      console.log(`Chat autorizado automáticamente: ${activeChatId}`);
    }
    return String(chatId) === activeChatId;
  }
  return String(chatId) === allowedChatId;
}

// Partir mensajes largos (Telegram tiene límite de 4096 chars)
function splitMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];

  const parts = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Buscar un buen punto de corte
    let cutIndex = remaining.lastIndexOf('\n', maxLength);
    if (cutIndex === -1 || cutIndex < maxLength * 0.5) {
      cutIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (cutIndex === -1 || cutIndex < maxLength * 0.5) {
      cutIndex = maxLength;
    }

    parts.push(remaining.substring(0, cutIndex));
    remaining = remaining.substring(cutIndex).trimStart();
  }

  return parts;
}

async function sendResponse(chatId, text) {
  const parts = splitMessage(text);
  for (const part of parts) {
    try {
      await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
    } catch {
      // Si falla Markdown, enviar como texto plano
      await bot.sendMessage(chatId, part);
    }
  }
}

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) return;

  sendResponse(chatId,
    '*Archie activo.* 🏗️\n\n' +
    'Soy el orquestador de tu equipo. Hablame directamente.\n\n' +
    'Comandos:\n' +
    '/clear — Limpiar historial\n' +
    '/reload — Recargar configuración del equipo\n' +
    '/id — Ver tu chat ID\n' +
    '/status — Estado del bot'
  );
});

// Comando /id — para configurar ALLOWED_CHAT_ID
bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `Tu chat ID: \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
});

// Comando /clear
bot.onText(/\/clear/, (msg) => {
  if (!isAllowed(msg.chat.id)) return;
  clearHistory();
  sendResponse(msg.chat.id, 'Historial limpiado.');
});

// Comando /reload — recarga el system prompt desde Equipo/
bot.onText(/\/reload/, (msg) => {
  if (!isAllowed(msg.chat.id)) return;
  reloadPrompt();
  sendResponse(msg.chat.id, 'Configuración del equipo recargada.');
});

// Comando /status
bot.onText(/\/status/, (msg) => {
  if (!isAllowed(msg.chat.id)) return;
  const uptime = process.uptime();
  const mins = Math.floor(uptime / 60);
  const hrs = Math.floor(mins / 60);
  sendResponse(msg.chat.id,
    `*Estado del bot*\n` +
    `Uptime: ${hrs}h ${mins % 60}m\n` +
    `Modelo: ${process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'}\n` +
    `Chat ID: \`${msg.chat.id}\``
  );
});

// Mensajes normales (conversación con Archie)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Ignorar comandos (ya manejados arriba)
  if (msg.text && msg.text.startsWith('/')) return;
  // Ignorar si no es texto
  if (!msg.text) return;
  // Verificar autorización
  if (!isAllowed(chatId)) {
    bot.sendMessage(chatId, 'No autorizado. Configurá ALLOWED_CHAT_ID en .env');
    return;
  }

  // Indicador de "escribiendo..."
  bot.sendChatAction(chatId, 'typing');

  try {
    const response = await chat(msg.text);
    await sendResponse(chatId, response);
  } catch (error) {
    console.error('Error en Claude API:', error.message);
    await sendResponse(chatId, `Error: ${error.message}`);
  }
});

// Función para enviar notificaciones desde código externo
export function notify(message) {
  if (activeChatId) {
    return sendResponse(activeChatId, message);
  }
  console.warn('No hay chat activo para enviar notificación');
}

export { bot, activeChatId };
