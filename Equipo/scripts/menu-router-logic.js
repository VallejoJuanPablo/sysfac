// Logica del Router del Menu Principal
// Determina si el update va a Pendientes, SSL, o al menu
// Se lee como texto plano y se inyecta como jsCode en n8n

const extract = $('Extract').first().json;
const { chatId, text, callbackData, messageType, callbackQueryId } = extract;
const botToken = '__BOT_TOKEN__';
const rawUpdate = $('Telegram Trigger').first().json;
const dbData = $('Read DB').first().json;
const hasActiveState = dbData.state !== null;

let route = 'menu';
let telegramBody = null;
let subWfInput = null;
let answerCallbackUrl = '';
let answerCallbackBody = '';

// Callbacks que pertenecen al modulo Pendientes
const pendientesPrefixes = ['proj_', 'type_', 'pri_'];
const pendientesExact = ['skip_desc', 'cancel'];

if (messageType === 'message' && text === '/pendiente') {
  route = 'pendientes';
  subWfInput = rawUpdate;

} else if (messageType === 'callback' && callbackData === 'menu_pendientes') {
  route = 'pendientes';
  subWfInput = { message: { chat: { id: chatId }, text: '/pendiente' } };
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

} else if (messageType === 'callback' && (
  pendientesPrefixes.some(function(p) { return callbackData.startsWith(p); }) ||
  pendientesExact.indexOf(callbackData) !== -1
)) {
  route = 'pendientes';
  subWfInput = rawUpdate;

} else if (messageType === 'message' && hasActiveState && text && !text.startsWith('/')) {
  route = 'pendientes';
  subWfInput = rawUpdate;

// --- SSL ---
} else if (messageType === 'callback' && callbackData === 'menu_ssl') {
  route = 'ssl';
  subWfInput = { chatId: chatId };
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

// --- Nutricionista ---
} else if (messageType === 'callback' && callbackData === 'menu_nutri') {
  route = 'nutri';
  subWfInput = { chatId: chatId };
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

} else if (messageType === 'callback' && callbackData && callbackData.startsWith('nutri_')) {
  route = 'nutri';
  subWfInput = rawUpdate;
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

// --- Coach ---
} else if (messageType === 'message' && text === '/coach') {
  route = 'coach';
  subWfInput = rawUpdate;

} else if (messageType === 'callback' && callbackData === 'menu_coach') {
  route = 'coach';
  subWfInput = { message: { chat: { id: chatId }, text: '/coach' } };
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

} else if (messageType === 'callback' && callbackData && callbackData.startsWith('coach_')) {
  route = 'coach';
  subWfInput = rawUpdate;
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

} else if (messageType === 'callback' && callbackData === 'menu_main') {
  route = 'menu';
  answerCallbackUrl = 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery';
  answerCallbackBody = JSON.stringify({ callback_query_id: callbackQueryId });

} else {
  route = 'menu';
}

// Generar respuesta del menu si corresponde
if (route === 'menu') {
  telegramBody = JSON.stringify({
    chat_id: chatId,
    text: '\ud83d\udc4b *Archie Bot* \u2014 Equipo\n\n\u00bfQue necesitas?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udccb Pendientes', callback_data: 'menu_pendientes' }],
        [{ text: '\ud83c\udfcb\ufe0f Coach', callback_data: 'menu_coach' }],
        [{ text: '\ud83e\udd57 Nutricionista', callback_data: 'menu_nutri' }],
        [{ text: '\ud83d\udd12 Vencimiento SSL', callback_data: 'menu_ssl' }]
      ]
    }
  });
}

return [{
  json: {
    route: route,
    telegramBody: telegramBody,
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    subWfInput: subWfInput ? JSON.stringify(subWfInput) : null,
    answerCallbackUrl: answerCallbackUrl,
    answerCallbackBody: answerCallbackBody
  }
}];
