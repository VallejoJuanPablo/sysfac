// Parsea el input del Telegram update para el modulo Coach
// Determina accion (panel, toggle, summary) y prepara body para DB

const input = $input.first().json;

let chatId = 0;
let action = 'panel';
let ejercicio = '';
let callbackQueryId = '';
let messageId = 0;

if (input.callback_query) {
  chatId = input.callback_query.message.chat.id;
  messageId = input.callback_query.message.message_id || 0;
  callbackQueryId = input.callback_query.id || '';
  const data = input.callback_query.data || '';

  if (data.startsWith('coach_toggle_')) {
    action = 'toggle';
    ejercicio = data.replace('coach_toggle_', '');
  } else if (data === 'coach_summary') {
    action = 'summary';
  } else {
    action = 'panel';
  }
} else if (input.message) {
  chatId = input.message.chat.id;
  action = 'panel';
}

let dbAction;
if (action === 'toggle') {
  dbAction = { action: 'coach_toggle', chat_id: chatId, ejercicio: ejercicio };
} else if (action === 'summary') {
  dbAction = { action: 'coach_summary', chat_id: chatId };
} else {
  dbAction = { action: 'coach_panel', chat_id: chatId };
}

return [{ json: { chatId, action, ejercicio, callbackQueryId, messageId, dbBody: JSON.stringify(dbAction) } }];
