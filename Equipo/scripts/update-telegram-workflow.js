/**
 * Actualiza el workflow "Archie Pendientes Bot" en n8n
 * con la nueva lógica de botonera principal.
 */

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const WF_ID = 'ZBgC6QoXA6qDfpyk';

const newLogicCode = `
const input = $('Extract').first().json;
const { chatId, text, callbackData, messageType, callbackQueryId } = input;
const botToken = '${BOT_TOKEN}';

const dbData = $input.first().json;
const state = dbData.state || null;
const projects = dbData.projects || [];

let dbAction = null;
let telegramBody = null;

// --- Helper: botonera principal ---
function mainMenu(cid) {
  return {
    chat_id: cid,
    text: '\\ud83d\\udc4b *Archie Bot* \\u2014 Equipo\\n\\n\\u00bfQue necesitas?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\\ud83d\\udccb Pendientes', callback_data: 'menu_pendientes' }]
      ]
    }
  };
}

// --- Helper: selector de proyectos ---
function projectSelector(cid, projs) {
  const keyboard = [];
  for (let i = 0; i < projs.length; i += 2) {
    const row = [{ text: projs[i].nombre, callback_data: 'proj_' + projs[i].id }];
    if (projs[i + 1]) {
      row.push({ text: projs[i + 1].nombre, callback_data: 'proj_' + projs[i + 1].id });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '\\u274c Cancelar', callback_data: 'cancel' }]);
  return {
    chat_id: cid,
    text: '\\ud83d\\udccb *Nuevo pendiente*\\n\\nElegi el proyecto:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };
}

// --- Menu principal callback ---
if (messageType === 'callback' && callbackData === 'menu_main') {
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = mainMenu(chatId);

// --- Pendientes: botonera o comando ---
} else if ((messageType === 'callback' && callbackData === 'menu_pendientes') || (messageType === 'message' && text === '/pendiente')) {
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = projectSelector(chatId, projects);

} else if (messageType === 'callback' && callbackData === 'cancel') {
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = {
    chat_id: chatId,
    text: '\\u274c Cancelado.',
    reply_markup: { inline_keyboard: [[{ text: '\\ud83c\\udfe0 Menu', callback_data: 'menu_main' }]] }
  };

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
  const safeText = text.replace(/[*_\\\\\`\\[\\]]/g, '');
  telegramBody = {
    chat_id: chatId,
    text: '\\u2705 Titulo: *' + safeText + '*\\n\\n\\ud83d\\udcdd Escribi una descripcion (o toca Omitir):',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '\\u23e9 Omitir', callback_data: 'skip_desc' }]] }
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
    const safeTitle = state.titulo.replace(/[*_\\\\\`\\[\\]]/g, '');

    dbAction = {
      action: 'insert_pendiente', chat_id: chatId,
      proyecto_id: parseInt(state.proyecto_id), titulo: state.titulo,
      descripcion: state.descripcion || '',
      tipo: realTipo, prioridad: prioridad, fuente: 'telegram'
    };
    const descLine = state.descripcion ? '\\n\\ud83d\\udcdd Descripcion: ' + state.descripcion.replace(/[*_\\\\\`\\[\\]]/g, '') : '';
    telegramBody = {
      chat_id: chatId,
      text: '\\u2705 *Pendiente creado!*\\n\\n\\ud83d\\udcc1 Proyecto: ' + projName + '\\n\\ud83d\\udcdd Titulo: ' + safeTitle + descLine + '\\n\\ud83d\\udcc2 Tipo: ' + realTipo + '\\n\\ud83c\\udfaf Prioridad: ' + (priLabels[prioridad] || prioridad),
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '\\ud83d\\udccb Otro pendiente', callback_data: 'menu_pendientes' }, { text: '\\ud83c\\udfe0 Menu', callback_data: 'menu_main' }]] }
    };
  } else {
    dbAction = { action: 'delete_state', chat_id: chatId };
    telegramBody = {
      chat_id: chatId,
      text: '\\u26a0\\ufe0f Sesion expirada.',
      reply_markup: { inline_keyboard: [[{ text: '\\ud83c\\udfe0 Menu', callback_data: 'menu_main' }]] }
    };
  }

// --- Fallback: cualquier mensaje → menu principal ---
} else if (messageType === 'message') {
  dbAction = state ? { action: 'delete_state', chat_id: chatId } : null;
  telegramBody = mainMenu(chatId);

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

async function main() {
  // Get current workflow
  const getRes = await fetch(`${N8N_URL}/workflows/${WF_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  const wf = await getRes.json();

  // Find the Logic node and update its code
  const logicNode = wf.nodes.find(n => n.name === 'Logic');
  if (!logicNode) { console.error('Logic node not found'); process.exit(1); }

  logicNode.parameters.jsCode = newLogicCode;

  // Only send fields that the PUT endpoint accepts
  const updateBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData
  };

  // Update workflow
  const putRes = await fetch(`${N8N_URL}/workflows/${WF_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
    body: JSON.stringify(updateBody)
  });
  const result = await putRes.json();
  if (!putRes.ok) {
    console.error('Error:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log('Workflow actualizado OK');
  console.log('ID:', result.id);
  console.log('Active:', result.active);
}

main().catch(e => { console.error(e); process.exit(1); });
