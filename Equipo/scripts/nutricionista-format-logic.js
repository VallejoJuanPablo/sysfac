// Nutricionista: Format response para Telegram
// Recibe datos del DB Call y el intent del Extract

const extract = $('Extract').first().json;
const dbData = $input.first().json;
const { chatId, intent } = extract;
const botToken = '__BOT_TOKEN__';

let telegramBody = null;

const diaLabels = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miercoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sabado'
};

const diaEmojis = {
  lunes: '\ud83d\udfe2', martes: '\ud83d\udd35', miercoles: '\ud83d\udfe3',
  jueves: '\ud83d\udfe0', viernes: '\ud83d\udd34', sabado: '\u2b50'
};

if (intent === 'show_menu' || intent === 'list_dias') {
  // Sub-menu del nutricionista
  const keyboard = [
    [{ text: '\ud83c\udfb2 Menu aleatorio', callback_data: 'nutri_random' }],
    [{ text: '\ud83d\udcc5 Elegir dia', callback_data: 'nutri_dias' }]
  ];

  if (intent === 'list_dias' && dbData.dias) {
    // Mostrar botones por dia
    const diasKeyboard = [];
    const dias = dbData.dias;
    for (let i = 0; i < dias.length; i += 2) {
      const row = [{ text: (diaEmojis[dias[i]] || '') + ' ' + (diaLabels[dias[i]] || dias[i]), callback_data: 'nutri_dia_' + dias[i] }];
      if (dias[i + 1]) {
        row.push({ text: (diaEmojis[dias[i + 1]] || '') + ' ' + (diaLabels[dias[i + 1]] || dias[i + 1]), callback_data: 'nutri_dia_' + dias[i + 1] });
      }
      diasKeyboard.push(row);
    }
    diasKeyboard.push([{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]);

    telegramBody = {
      chat_id: chatId,
      text: '\ud83d\udcc5 *Elegir dia*\n\nSelecciona el dia para ver su menu:',
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: diasKeyboard }
    };
  } else {
    keyboard.push([{ text: '\ud83d\udd19 Menu principal', callback_data: 'menu_main' }]);
    telegramBody = {
      chat_id: chatId,
      text: '\ud83e\udd57 *Nutricionista*\n\n\u00bfQue necesitas?',
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    };
  }

} else if (intent === 'alt_menu') {
  // Mostrar alternativas del dia
  const dia = dbData.dia || 'desconocido';
  const menus = dbData.menus || [];
  const byComida = {};
  menus.forEach(function(m) { byComida[m.comida] = m.descripcion; });

  let text = '\ud83d\udd04 *Alternativas del ' + (diaLabels[dia] || dia) + '*\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n';

  if (byComida['almuerzo_alt']) {
    text += '\ud83c\udf5d *Almuerzo alternativo*\n' + byComida['almuerzo_alt'] + '\n\n';
  }
  if (byComida['cena_alt']) {
    text += '\ud83c\udf19 *Cena alternativa*\n' + byComida['cena_alt'] + '\n\n';
  }

  if (!byComida['almuerzo_alt'] && !byComida['cena_alt']) {
    text += '_No hay alternativas para este dia._\n\n';
  }

  text += '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';

  telegramBody = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udccb Ver menu principal', callback_data: 'nutri_dia_' + dia }],
        [{ text: '\ud83c\udfb2 Otro menu', callback_data: 'nutri_random' }],
        [{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]
      ]
    }
  };

} else if (intent === 'random_menu' || intent === 'day_menu') {
  const dia = dbData.dia || 'desconocido';
  const menus = dbData.menus || [];

  if (menus.length === 0) {
    telegramBody = {
      chat_id: chatId,
      text: '\u26a0\ufe0f No se encontraron menus para ese dia.',
      reply_markup: {
        inline_keyboard: [
          [{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }]
        ]
      }
    };
  } else {
    // Armar menu principal (sin alternativas)
    const byComida = {};
    menus.forEach(function(m) { byComida[m.comida] = m.descripcion; });

    const hasAlts = byComida['almuerzo_alt'] || byComida['cena_alt'];

    let text = (diaEmojis[dia] || '\ud83d\udcc5') + ' *Menu del ' + (diaLabels[dia] || dia) + '*\n'
      + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n';

    if (byComida['desayuno']) {
      text += '\u2615 *Desayuno*\n' + byComida['desayuno'] + '\n\n';
    }
    if (byComida['almuerzo']) {
      text += '\ud83c\udf5d *Almuerzo*\n' + byComida['almuerzo'] + '\n\n';
    }
    if (byComida['merienda']) {
      text += '\u2615 *Merienda*\n' + byComida['merienda'] + '\n\n';
    }
    if (byComida['cena']) {
      text += '\ud83c\udf19 *Cena*\n' + byComida['cena'] + '\n\n';
    }

    text += '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n';
    text += '\ud83d\udca7 _Recorda tomar al menos 2L de agua_';

    const keyboard = [];
    if (hasAlts) {
      keyboard.push([{ text: '\ud83d\udd04 Ver alternativas', callback_data: 'nutri_alt_' + dia }]);
    }
    keyboard.push([{ text: '\ud83c\udfb2 Otro menu', callback_data: 'nutri_random' }]);
    keyboard.push([{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]);

    telegramBody = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    };
  }
}

if (!telegramBody) return [];

return [{
  json: {
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: JSON.stringify(telegramBody)
  }
}];
