/**
 * Archie Pendientes Bot — Webhook via Cloudflare Tunnel
 * Telegram Trigger (webhook) → Extract → Read DB → Logic → Write DB → Send Telegram
 */

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const TELEGRAM_CRED_ID = '2hu4MTinNEcT2rCy';
const DB_URL = 'http://host.docker.internal:3456';

// --- Code: Extract ---
const extractCode = `
const update = $input.first().json;
let chatId = 0, text = '', callbackData = '', messageType = 'unknown', callbackQueryId = '';

if (update.message) {
  chatId = update.message.chat.id;
  text = (update.message.text || '').trim();
  messageType = 'message';
} else if (update.callback_query) {
  chatId = update.callback_query.message.chat.id;
  callbackData = update.callback_query.data || '';
  callbackQueryId = update.callback_query.id || '';
  messageType = 'callback';
}

return [{ json: { chatId, text, callbackData, messageType, callbackQueryId } }];
`;

// --- Code: Main Logic ---
const logicCode = `
const input = $('Extract').first().json;
const { chatId, text, callbackData, messageType, callbackQueryId } = input;
const botToken = '${BOT_TOKEN}';

const dbData = $input.first().json;
const state = dbData.state || null;
const projects = dbData.projects || [];

let dbAction = null;
let telegramBody = null;

if (messageType === 'message' && text === '/pendiente') {
  const keyboard = [];
  for (let i = 0; i < projects.length; i += 2) {
    const row = [{ text: projects[i].nombre, callback_data: 'proj_' + projects[i].id }];
    if (projects[i + 1]) {
      row.push({ text: projects[i + 1].nombre, callback_data: 'proj_' + projects[i + 1].id });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '\\u274c Cancelar', callback_data: 'cancel' }]);
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = {
    chat_id: chatId,
    text: '\\ud83d\\udccb *Nuevo pendiente*\\n\\nElegi el proyecto:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };

} else if (messageType === 'callback' && callbackData === 'cancel') {
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = { chat_id: chatId, text: '\\u274c Cancelado.' };

} else if (messageType === 'callback' && callbackData.startsWith('proj_')) {
  const projId = parseInt(callbackData.split('_')[1]);
  const proj = projects.find(p => p.id == projId);
  const projName = proj ? proj.nombre : 'Proyecto';
  dbAction = { action: 'save_state', chat_id: chatId, proyecto_id: projId, step: 'titulo' };
  telegramBody = {
    chat_id: chatId,
    text: '\\u2705 Proyecto: *' + projName + '*\\n\\n\\u270f\\ufe0f Escribi el titulo del pendiente:',
    parse_mode: 'Markdown'
  };

} else if (messageType === 'message' && state && state.step === 'titulo' && text && !text.startsWith('/')) {
  dbAction = { action: 'update_state', chat_id: chatId, titulo: text.substring(0, 200), step: 'descripcion' };
  const safeText = text.replace(/[*_\\\`\\[\\]]/g, '');
  telegramBody = {
    chat_id: chatId,
    text: '\\u2705 Titulo: *' + safeText + '*\\n\\n\\ud83d\\udcdd Escribi una descripcion (o toca Omitir):',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\\u23e9 Omitir', callback_data: 'skip_desc' }]
      ]
    }
  };

} else if (messageType === 'message' && state && state.step === 'descripcion' && text && !text.startsWith('/')) {
  dbAction = { action: 'update_state', chat_id: chatId, descripcion: text.substring(0, 500), step: 'tipo' };
  telegramBody = {
    chat_id: chatId,
    text: '\\u2705 Descripcion guardada.\\n\\n\\ud83d\\udcc2 Elegi el tipo:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\\ud83d\\udccb Spec', callback_data: 'type_spec' }, { text: '\\ud83d\\udc1b Fix', callback_data: 'type_fix' }],
        [{ text: '\\u2b06\\ufe0f Mejora', callback_data: 'type_mejora' }, { text: '\\ud83d\\udd0d Investigacion', callback_data: 'type_inv' }]
      ]
    }
  };

} else if (messageType === 'callback' && callbackData === 'skip_desc') {
  dbAction = { action: 'update_state', chat_id: chatId, step: 'tipo' };
  telegramBody = {
    chat_id: chatId,
    text: '\\ud83d\\udcc2 Elegi el tipo:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\\ud83d\\udccb Spec', callback_data: 'type_spec' }, { text: '\\ud83d\\udc1b Fix', callback_data: 'type_fix' }],
        [{ text: '\\u2b06\\ufe0f Mejora', callback_data: 'type_mejora' }, { text: '\\ud83d\\udd0d Investigacion', callback_data: 'type_inv' }]
      ]
    }
  };

} else if (messageType === 'callback' && callbackData.startsWith('type_')) {
  const tipo = callbackData.replace('type_', '');
  const tipoLabels = { spec: 'Spec', fix: 'Fix', mejora: 'Mejora', inv: 'Investigacion' };
  telegramBody = {
    chat_id: chatId,
    text: '\\u2705 Tipo: *' + (tipoLabels[tipo] || tipo) + '*\\n\\n\\ud83c\\udfaf Elegi la prioridad:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '\\ud83d\\udd34 Alta', callback_data: 'pri_alta_' + tipo },
        { text: '\\ud83d\\udfe1 Media', callback_data: 'pri_media_' + tipo },
        { text: '\\ud83d\\udfe2 Baja', callback_data: 'pri_baja_' + tipo }
      ]]
    }
  };

} else if (messageType === 'callback' && callbackData.startsWith('pri_')) {
  const parts = callbackData.split('_');
  const prioridad = parts[1];
  const tipo = parts.slice(2).join('_');
  const realTipo = tipo === 'inv' ? 'investigacion' : tipo;

  if (state && state.proyecto_id && state.titulo) {
    const proj = projects.find(p => p.id == state.proyecto_id);
    const projName = proj ? proj.nombre : 'Proyecto';
    const priLabels = { alta: '\\ud83d\\udd34 Alta', media: '\\ud83d\\udfe1 Media', baja: '\\ud83d\\udfe2 Baja' };
    const safeTitle = state.titulo.replace(/[*_\\\`\\[\\]]/g, '');

    dbAction = {
      action: 'insert_pendiente', chat_id: chatId,
      proyecto_id: parseInt(state.proyecto_id), titulo: state.titulo,
      descripcion: state.descripcion || '',
      tipo: realTipo, prioridad: prioridad, fuente: 'telegram'
    };
    const descLine = state.descripcion ? '\\n\\ud83d\\udcdd Descripcion: ' + state.descripcion.replace(/[*_\\\`\\[\\]]/g, '') : '';
    telegramBody = {
      chat_id: chatId,
      text: '\\u2705 *Pendiente creado!*\\n\\n\\ud83d\\udcc1 Proyecto: ' + projName + '\\n\\ud83d\\udcdd Titulo: ' + safeTitle + descLine + '\\n\\ud83d\\udcc2 Tipo: ' + realTipo + '\\n\\ud83c\\udfaf Prioridad: ' + (priLabels[prioridad] || prioridad) + '\\n\\nUsa /pendiente para crear otro.',
      parse_mode: 'Markdown'
    };
  } else {
    dbAction = { action: 'delete_state', chat_id: chatId };
    telegramBody = { chat_id: chatId, text: '\\u26a0\\ufe0f Sesion expirada. Usa /pendiente para empezar de nuevo.' };
  }

} else if (messageType === 'message' && text === '/start') {
  telegramBody = {
    chat_id: chatId,
    text: '\\ud83d\\udc4b *Bot de Pendientes \\u2014 Equipo Archie*\\n\\nComandos:\\n/pendiente \\u2014 Crear un nuevo pendiente',
    parse_mode: 'Markdown'
  };

} else {
  return [];
}

if (!telegramBody) return [];

return [{
  json: {
    dbAction: dbAction ? JSON.stringify(dbAction) : null,
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: JSON.stringify(telegramBody),
    answerUrl: callbackQueryId ? 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery' : '',
    answerBody: callbackQueryId ? JSON.stringify({ callback_query_id: callbackQueryId }) : ''
  }
}];
`;

// --- Workflow ---
const workflow = {
  name: 'Archie Pendientes Bot',
  nodes: [
    {
      parameters: { updates: ['message', 'callback_query'] },
      id: 'bot-0001', name: 'Telegram Trigger',
      type: 'n8n-nodes-base.telegramTrigger', typeVersion: 1.1,
      position: [200, 300],
      credentials: { telegramApi: { id: TELEGRAM_CRED_ID, name: 'Telegram account' } }
    },
    {
      parameters: { jsCode: extractCode, mode: 'runOnceForAllItems' },
      id: 'bot-0002', name: 'Extract',
      type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [420, 300]
    },
    {
      parameters: {
        method: 'POST', url: DB_URL,
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ action: "read_state", chat_id: $json.chatId }) }}',
        options: {}
      },
      id: 'bot-0003', name: 'Read DB',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [640, 300]
    },
    {
      parameters: { jsCode: logicCode, mode: 'runOnceForAllItems' },
      id: 'bot-0004', name: 'Logic',
      type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [860, 300]
    },
    // IF dbAction exists → Write DB → Send Telegram
    // ELSE → Send Telegram Direct
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
          conditions: [{ id: 'c1', leftValue: '={{ $json.dbAction }}', rightValue: '', operator: { type: 'string', operation: 'notEquals' } }],
          combinator: 'and'
        }, options: {}
      },
      id: 'bot-0005', name: 'Has DB Action?',
      type: 'n8n-nodes-base.if', typeVersion: 2.2,
      position: [1080, 300]
    },
    {
      parameters: {
        method: 'POST', url: DB_URL,
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ $("Logic").first().json.dbAction }}',
        options: {}
      },
      id: 'bot-0006', name: 'Write DB',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [1300, 200]
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ $("Logic").first().json.telegramUrl }}',
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ $("Logic").first().json.telegramBody }}',
        options: {}
      },
      id: 'bot-0007', name: 'Send Telegram',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [1520, 200]
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ $("Logic").first().json.telegramUrl }}',
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ $("Logic").first().json.telegramBody }}',
        options: {}
      },
      id: 'bot-0008', name: 'Send Telegram Direct',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [1300, 420]
    },
    // Answer callback query if present
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
          conditions: [{ id: 'c2', leftValue: '={{ $("Logic").first().json.answerUrl }}', rightValue: '', operator: { type: 'string', operation: 'notEquals' } }],
          combinator: 'and'
        }, options: {}
      },
      id: 'bot-0009', name: 'Is Callback?',
      type: 'n8n-nodes-base.if', typeVersion: 2.2,
      position: [1740, 300]
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ $("Logic").first().json.answerUrl }}',
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ $("Logic").first().json.answerBody }}',
        options: {}
      },
      id: 'bot-0010', name: 'Answer Callback',
      type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
      position: [1960, 200]
    }
  ],
  connections: {
    'Telegram Trigger': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
    'Extract': { main: [[{ node: 'Read DB', type: 'main', index: 0 }]] },
    'Read DB': { main: [[{ node: 'Logic', type: 'main', index: 0 }]] },
    'Logic': { main: [[{ node: 'Has DB Action?', type: 'main', index: 0 }]] },
    'Has DB Action?': { main: [
      [{ node: 'Write DB', type: 'main', index: 0 }],
      [{ node: 'Send Telegram Direct', type: 'main', index: 0 }]
    ]},
    'Write DB': { main: [[{ node: 'Send Telegram', type: 'main', index: 0 }]] },
    'Send Telegram': { main: [[{ node: 'Is Callback?', type: 'main', index: 0 }]] },
    'Send Telegram Direct': { main: [[{ node: 'Is Callback?', type: 'main', index: 0 }]] },
    'Is Callback?': { main: [
      [{ node: 'Answer Callback', type: 'main', index: 0 }],
      []
    ]}
  },
  settings: { executionOrder: 'v1' }
};

async function main() {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, { method: 'POST' });

  const res = await fetch(`${N8N_URL}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
    body: JSON.stringify(workflow)
  });
  const data = await res.json();
  if (!res.ok) { console.error('Error:', JSON.stringify(data, null, 2)); process.exit(1); }
  console.log('Workflow creado! ID:', data.id);
  console.log('URL: http://localhost:5678/workflow/' + data.id);
}

main().catch(e => { console.error(e); process.exit(1); });
