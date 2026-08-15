// Formatea la respuesta del Coach para Telegram
// Lee resultado de DB Call + datos de Extract
// Usa editMessageText para callbacks (panel se actualiza in-place)

const extract = $('Extract').first().json;
const dbResult = $input.first().json;
const botToken = '__BOT_TOKEN__';
const chatId = extract.chatId;
const action = extract.action;

const EJERCICIOS = [
  { id: 'bici', nombre: '40 min bici', emoji: '\ud83d\udeb4' },
  { id: 'abs', nombre: 'Abdominales', emoji: '\ud83d\udd25' },
  { id: 'func', nombre: 'Funcionales', emoji: '\ud83c\udfcb\ufe0f' },
  { id: 'tobillo', nombre: 'Estiram. tobillos', emoji: '\ud83e\uddb6' },
  { id: 'hombro', nombre: 'Ejerc. hombros', emoji: '\ud83e\udd38' }
];

let text = '';
let keyboard = [];

if (action === 'summary') {
  const days = dbResult.days || [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  text = '\ud83d\udcca *Resumen semanal*\n\n';

  for (const day of days) {
    const parts = day.fecha.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayName = dayNames[d.getDay()];
    const done = day.ejercicios || [];
    const count = done.length;
    const fechaShort = parts[2] + '/' + parts[1];

    if (count === 0) {
      text += dayName + ' ' + fechaShort + ': \u2014 (0/5)\n';
    } else {
      const emojis = done.map(function(e) {
        const ej = EJERCICIOS.find(function(x) { return x.id === e; });
        return ej ? ej.emoji : '\u2705';
      }).join(' ');
      const star = count === 5 ? ' \u2b50' : '';
      text += dayName + ' ' + fechaShort + ': ' + emojis + ' (' + count + '/5)' + star + '\n';
    }
  }

  keyboard = [
    [{ text: '\ud83c\udfaf Panel de hoy', callback_data: 'coach_panel' }],
    [{ text: '\ud83c\udfe0 Menu', callback_data: 'menu_main' }]
  ];

} else {
  // Panel (initial + after toggle)
  const done = dbResult.done || [];
  const total = done.length;

  text = '\ud83c\udfcb\ufe0f *Coach \u2014 Ejercicios de hoy*\n\n';
  text += 'Completados: ' + total + '/5';

  if (total === 5) {
    text += ' \ud83c\udf1f\n\n\u00a1Completaste todos los ejercicios hoy!';
  }

  text += '\n\nToca para marcar/desmarcar:';

  for (const ej of EJERCICIOS) {
    const isDone = done.indexOf(ej.id) !== -1;
    const label = isDone ? '\u2705 ' + ej.emoji + ' ' + ej.nombre : ej.emoji + ' ' + ej.nombre;
    keyboard.push([{ text: label, callback_data: 'coach_toggle_' + ej.id }]);
  }

  keyboard.push([{ text: '\ud83d\udcca Resumen semanal', callback_data: 'coach_summary' }]);
  keyboard.push([{ text: '\ud83c\udfe0 Menu', callback_data: 'menu_main' }]);
}

// editMessageText si viene de callback (panel se actualiza in-place)
const method = extract.messageId ? 'editMessageText' : 'sendMessage';
const telegramUrl = 'https://api.telegram.org/bot' + botToken + '/' + method;
const body = {
  chat_id: chatId,
  text: text,
  parse_mode: 'Markdown',
  reply_markup: { inline_keyboard: keyboard }
};
if (extract.messageId) {
  body.message_id = extract.messageId;
}

return [{ json: { telegramUrl, telegramBody: JSON.stringify(body) } }];
