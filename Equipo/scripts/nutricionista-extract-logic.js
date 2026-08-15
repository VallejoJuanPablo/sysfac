// Nutricionista: Extract input y determinar accion DB
// Recibe update de Telegram via Execute Workflow Trigger

const input = $input.first().json;
let chatId = 0;
let callbackData = '';
let messageType = 'unknown';

if (input.message) {
  chatId = input.message.chat.id;
  messageType = 'message';
} else if (input.callback_query) {
  chatId = input.callback_query.message.chat.id;
  callbackData = input.callback_query.data || '';
  messageType = 'callback';
} else if (input.chatId) {
  chatId = input.chatId;
  messageType = 'direct';
}

// Determinar que accion de DB necesitamos
let dbBody = JSON.stringify({ action: 'nutri_list_dias' });
let intent = 'show_menu';

if (callbackData === 'nutri_random') {
  dbBody = JSON.stringify({ action: 'nutri_random_menu' });
  intent = 'random_menu';
} else if (callbackData && callbackData.startsWith('nutri_alt_')) {
  const dia = callbackData.replace('nutri_alt_', '');
  dbBody = JSON.stringify({ action: 'nutri_day_menu', dia: dia });
  intent = 'alt_menu';
} else if (callbackData && callbackData.startsWith('nutri_dia_')) {
  const dia = callbackData.replace('nutri_dia_', '');
  dbBody = JSON.stringify({ action: 'nutri_day_menu', dia: dia });
  intent = 'day_menu';
} else if (callbackData === 'nutri_dias') {
  dbBody = JSON.stringify({ action: 'nutri_list_dias' });
  intent = 'list_dias';
}

return [{
  json: {
    chatId: chatId,
    callbackData: callbackData,
    messageType: messageType,
    intent: intent,
    dbBody: dbBody
  }
}];
