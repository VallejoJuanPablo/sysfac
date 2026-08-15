// Logica original del workflow Archie Pendientes Bot
// Este archivo es el codigo que ejecuta n8n en el nodo "Logic"
// Se lee como texto plano y se inyecta como jsCode

const input = $('Extract').first().json;
const { chatId, text, callbackData, messageType, callbackQueryId } = input;
const botToken = '__BOT_TOKEN__';

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
  keyboard.push([{ text: '\u274c Cancelar', callback_data: 'cancel' }]);
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = {
    chat_id: chatId,
    text: '\ud83d\udccb *Nuevo pendiente*\n\nElegi el proyecto:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };

} else if (messageType === 'callback' && callbackData === 'cancel') {
  dbAction = { action: 'delete_state', chat_id: chatId };
  telegramBody = { chat_id: chatId, text: '\u274c Cancelado.' };

} else if (messageType === 'callback' && callbackData.startsWith('proj_')) {
  const projId = parseInt(callbackData.split('_')[1]);
  const proj = projects.find(p => p.id == projId);
  const projName = proj ? proj.nombre : 'Proyecto';
  dbAction = { action: 'save_state', chat_id: chatId, proyecto_id: projId, step: 'titulo' };
  telegramBody = {
    chat_id: chatId,
    text: '\u2705 Proyecto: *' + projName + '*\n\n\u270f\ufe0f Escribi el titulo del pendiente:',
    parse_mode: 'Markdown'
  };

} else if (messageType === 'message' && state && state.step === 'titulo' && text && !text.startsWith('/')) {
  dbAction = { action: 'update_state', chat_id: chatId, titulo: text.substring(0, 200), step: 'descripcion' };
  const safeText = text.replace(/[*_\\`\[\]]/g, '');
  telegramBody = {
    chat_id: chatId,
    text: '\u2705 Titulo: *' + safeText + '*\n\n\ud83d\udcdd Escribi una descripcion (o toca Omitir):',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\u23e9 Omitir', callback_data: 'skip_desc' }]
      ]
    }
  };

} else if (messageType === 'message' && state && state.step === 'descripcion' && text && !text.startsWith('/')) {
  dbAction = { action: 'update_state', chat_id: chatId, descripcion: text.substring(0, 500), step: 'tipo' };
  telegramBody = {
    chat_id: chatId,
    text: '\u2705 Descripcion guardada.\n\n\ud83d\udcc2 Elegi el tipo:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udccb Spec', callback_data: 'type_spec' }, { text: '\ud83d\udc1b Fix', callback_data: 'type_fix' }],
        [{ text: '\u2b06\ufe0f Mejora', callback_data: 'type_mejora' }, { text: '\ud83d\udd0d Investigacion', callback_data: 'type_inv' }]
      ]
    }
  };

} else if (messageType === 'callback' && callbackData === 'skip_desc') {
  dbAction = { action: 'update_state', chat_id: chatId, step: 'tipo' };
  telegramBody = {
    chat_id: chatId,
    text: '\ud83d\udcc2 Elegi el tipo:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udccb Spec', callback_data: 'type_spec' }, { text: '\ud83d\udc1b Fix', callback_data: 'type_fix' }],
        [{ text: '\u2b06\ufe0f Mejora', callback_data: 'type_mejora' }, { text: '\ud83d\udd0d Investigacion', callback_data: 'type_inv' }]
      ]
    }
  };

} else if (messageType === 'callback' && callbackData.startsWith('type_')) {
  const tipo = callbackData.replace('type_', '');
  const tipoLabels = { spec: 'Spec', fix: 'Fix', mejora: 'Mejora', inv: 'Investigacion' };
  telegramBody = {
    chat_id: chatId,
    text: '\u2705 Tipo: *' + (tipoLabels[tipo] || tipo) + '*\n\n\ud83c\udfaf Elegi la prioridad:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '\ud83d\udd34 Alta', callback_data: 'pri_alta_' + tipo },
        { text: '\ud83d\udfe1 Media', callback_data: 'pri_media_' + tipo },
        { text: '\ud83d\udfe2 Baja', callback_data: 'pri_baja_' + tipo }
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
    const priLabels = { alta: '\ud83d\udd34 Alta', media: '\ud83d\udfe1 Media', baja: '\ud83d\udfe2 Baja' };
    const safeTitle = state.titulo.replace(/[*_\\`\[\]]/g, '');

    dbAction = {
      action: 'insert_pendiente', chat_id: chatId,
      proyecto_id: parseInt(state.proyecto_id), titulo: state.titulo,
      descripcion: state.descripcion || '',
      tipo: realTipo, prioridad: prioridad, fuente: 'telegram'
    };
    const descLine = state.descripcion ? '\n\ud83d\udcdd Descripcion: ' + state.descripcion.replace(/[*_\\`\[\]]/g, '') : '';
    telegramBody = {
      chat_id: chatId,
      text: '\u2705 *Pendiente creado!*\n\n\ud83d\udcc1 Proyecto: ' + projName + '\n\ud83d\udcdd Titulo: ' + safeTitle + descLine + '\n\ud83d\udcc2 Tipo: ' + realTipo + '\n\ud83c\udfaf Prioridad: ' + (priLabels[prioridad] || prioridad) + '\n\nUsa /pendiente para crear otro.',
      parse_mode: 'Markdown'
    };
  } else {
    dbAction = { action: 'delete_state', chat_id: chatId };
    telegramBody = { chat_id: chatId, text: '\u26a0\ufe0f Sesion expirada. Usa /pendiente para empezar de nuevo.' };
  }

} else if (messageType === 'message' && text === '/start') {
  telegramBody = {
    chat_id: chatId,
    text: '\ud83d\udc4b *Bot de Pendientes \u2014 Equipo Archie*\n\nComandos:\n/pendiente \u2014 Crear un nuevo pendiente',
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
