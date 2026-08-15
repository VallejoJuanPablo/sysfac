// Formatea recordatorios del Coach para todos los usuarios registrados
// Recibe: resultado de coach_get_users_today desde Get Reminders HTTP
// Retorna: un item por usuario con telegramUrl + telegramBody

const response = $input.first().json;
const reminders = response.reminders || [];
const botToken = '__BOT_TOKEN__';

if (reminders.length === 0) {
  return [];
}

const EJERCICIOS = [
  { id: 'bici', nombre: '40 min bici', emoji: '\ud83d\udeb4' },
  { id: 'abs', nombre: 'Abdominales', emoji: '\ud83d\udd25' },
  { id: 'func', nombre: 'Funcionales', emoji: '\ud83c\udfcb\ufe0f' },
  { id: 'tobillo', nombre: 'Estiram. tobillos', emoji: '\ud83e\uddb6' },
  { id: 'hombro', nombre: 'Ejerc. hombros', emoji: '\ud83e\udd38' }
];

const hora = new Date().getHours();
let saludo = '';
if (hora <= 10) saludo = 'Buen dia';
else if (hora <= 14) saludo = 'Buen mediodia';
else if (hora <= 17) saludo = 'Buenas tardes';
else saludo = 'Buenas noches';

return reminders.map(function(r) {
  const chatId = r.chat_id;
  const done = r.done || [];
  const total = done.length;

  let text = '\u23f0 *Coach Check-in*\n\n' + saludo + '! ';

  if (total === 0) {
    text += 'Todavia no marcaste ejercicios hoy.\n';
  } else if (total === 5) {
    text += '\ud83c\udf1f Ya completaste todos! Genio!\n';
  } else {
    text += 'Llevas ' + total + '/5 ejercicios.\n';
  }

  text += '\nMarca los que completaste:';

  const keyboard = [];
  for (const ej of EJERCICIOS) {
    const isDone = done.indexOf(ej.id) !== -1;
    const label = isDone ? '\u2705 ' + ej.emoji + ' ' + ej.nombre : ej.emoji + ' ' + ej.nombre;
    keyboard.push([{ text: label, callback_data: 'coach_toggle_' + ej.id }]);
  }

  keyboard.push([{ text: '\ud83d\udcca Resumen semanal', callback_data: 'coach_summary' }]);

  const telegramBody = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });

  return { json: {
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: telegramBody
  }};
});
