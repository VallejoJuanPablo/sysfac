// Nutricionista: Logica autocontenida (sin DB)
// Incluye los menus embebidos y maneja todos los callbacks
// Se inyecta como jsCode en un solo nodo Code de n8n

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

const botToken = '__BOT_TOKEN__';

// === Menus semanales ===
const menus = {
  lunes: {
    desayuno: 'Te o cafe con 250 ml de leche descremada + omelette de 2 huevos + tostada + 1 banana',
    almuerzo: '200 g pechuga de pollo + ensalada de tomate, cebolla y morron + 5 cucharadas soperas de arroz cocido',
    almuerzo_alt: '200 g de pescado blanco (merluza o boga) al horno + ensalada de zanahoria rallada y rucula + 5 cucharadas de quinoa o trigo burgol',
    merienda: '200 g de yogur descremado + 1 manzana',
    cena: '200 g carne magra + zapallo y zapallito al horno + acelga salteada',
    cena_alt: '200 g de pechuga de pavo (o pollo) a la plancha + pure de calabaza + brocoli al vapor'
  },
  martes: {
    desayuno: 'Te con leche + 200 g yogur descremado + 1 naranja',
    almuerzo: '200 g lomo de cerdo + 200 g papa hervida + ensalada de tomate',
    almuerzo_alt: '200 g de pechuga de pollo + 200 g de batata al horno (o mandioca) + ensalada de lechuga y pepino',
    merienda: '2 huevos duros + 1 banana',
    cena: '200 g atun al natural + ensalada de espinaca, cebolla y tomate',
    cena_alt: '200 g de filet de merluza al limon + ensalada de chauchas, zanahoria y huevo (solo claras)'
  },
  miercoles: {
    desayuno: 'Cafe con leche + revuelto de 2 huevos + tostada',
    almuerzo: '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de tomate y morron',
    almuerzo_alt: '200 g de lomo de cerdo + 6 cucharadas de garbanzos cocidos + ensalada de repollo blanco y morron',
    merienda: 'Yogur descremado + 1 manzana',
    cena: '200 g pollo + zapallo asado + zapallitos salteados',
    cena_alt: '200 g de carne magra (nalga o peceto) + berenjenas y morrones asados al horno'
  },
  jueves: {
    desayuno: 'Te con leche + omelette con espinaca + 1 naranja',
    almuerzo: '200 g pollo + 60 g de fideos secos (aprox 1 1/2 taza cocidos) + salsa de tomate casera con cebolla',
    almuerzo_alt: '200 g de carne picada magra (albondigas al horno) + 60 g de fideos integrales o monitos + salsa de tomate natural',
    merienda: 'Yogur descremado + 1 banana',
    cena: '200 g carne magra + ensalada de tomate, cebolla y acelga',
    cena_alt: '200 g de lomo de cerdo + ensalada de rucula, tomates cherry y champinones frescos'
  },
  viernes: {
    desayuno: 'Cafe con leche + 2 huevos + 1 manzana + tostada',
    almuerzo: '200 g atun + 5 cucharadas de arroz cocido + ensalada de tomate y morron',
    almuerzo_alt: '200 g de pollo desmenuzado + 5 cucharadas de choclo en grano + ensalada de apio y manzana verde',
    merienda: 'Yogur + 1 naranja',
    cena: '200 g lomo de cerdo + zapallo al horno + espinaca salteada',
    cena_alt: '200 g de pescado (filet) a las finas hierbas + coliflor al horno + acelga salteada con ajo'
  },
  sabado: {
    desayuno: 'Cafe con leche + revuelto de 2 huevos + tostada',
    almuerzo: '200 g pollo + 200 g papa hervida + ensalada de tomate y cebolla',
    almuerzo_alt: '200 g de carne magra (cuadril) al plato + 200 g de mandioca o batata hervida + ensalada de repollo colorado y zanahoria',
    merienda: 'Yogur descremado + 1 manzana',
    cena: '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de espinaca',
    cena_alt: '200 g de pechuga de pollo + 6 cucharadas de arvejas o porotos alubia + ensalada caprese (tomate y albahaca fresca)'
  }
};

const diasArr = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const diaLabels = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miercoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sabado' };
const diaEmojis = { lunes: '\ud83d\udfe2', martes: '\ud83d\udd35', miercoles: '\ud83d\udfe3', jueves: '\ud83d\udfe0', viernes: '\ud83d\udd34', sabado: '\u2b50' };

function pickRandom() {
  return diasArr[Math.floor(Math.random() * diasArr.length)];
}

function formatMenu(dia) {
  const m = menus[dia];
  if (!m) return null;
  let text = (diaEmojis[dia] || '\ud83d\udcc5') + ' *Menu del ' + (diaLabels[dia] || dia) + '*\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n'
    + '\u2615 *Desayuno*\n' + m.desayuno + '\n\n'
    + '\ud83c\udf5d *Almuerzo*\n' + m.almuerzo + '\n\n'
    + '\u2615 *Merienda*\n' + m.merienda + '\n\n'
    + '\ud83c\udf19 *Cena*\n' + m.cena + '\n\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n'
    + '\ud83d\udca7 _Recorda tomar al menos 2L de agua_';
  return text;
}

function formatAlternativas(dia) {
  const m = menus[dia];
  if (!m) return null;
  let text = '\ud83d\udd04 *Alternativas del ' + (diaLabels[dia] || dia) + '*\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n';
  if (m.almuerzo_alt) text += '\ud83c\udf5d *Almuerzo alternativo*\n' + m.almuerzo_alt + '\n\n';
  if (m.cena_alt) text += '\ud83c\udf19 *Cena alternativa*\n' + m.cena_alt + '\n\n';
  text += '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
  return text;
}

let telegramBody = null;

// Sub-menu principal
if (messageType === 'direct' || callbackData === 'nutri_menu' || messageType === 'message') {
  telegramBody = {
    chat_id: chatId,
    text: '\ud83e\udd57 *Nutricionista*\n\n\u00bfQue necesitas?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83c\udfb2 Menu aleatorio', callback_data: 'nutri_random' }],
        [{ text: '\ud83d\udcc5 Elegir dia', callback_data: 'nutri_dias' }],
        [{ text: '\ud83d\udd19 Menu principal', callback_data: 'menu_main' }]
      ]
    }
  };

// Lista de dias
} else if (callbackData === 'nutri_dias') {
  const diasKeyboard = [];
  for (let i = 0; i < diasArr.length; i += 2) {
    const row = [{ text: (diaEmojis[diasArr[i]] || '') + ' ' + diaLabels[diasArr[i]], callback_data: 'nutri_dia_' + diasArr[i] }];
    if (diasArr[i + 1]) {
      row.push({ text: (diaEmojis[diasArr[i + 1]] || '') + ' ' + diaLabels[diasArr[i + 1]], callback_data: 'nutri_dia_' + diasArr[i + 1] });
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

// Menu aleatorio
} else if (callbackData === 'nutri_random') {
  const dia = pickRandom();
  const text = formatMenu(dia);
  telegramBody = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udd04 Ver alternativas', callback_data: 'nutri_alt_' + dia }],
        [{ text: '\ud83c\udfb2 Otro menu', callback_data: 'nutri_random' }],
        [{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]
      ]
    }
  };

// Menu de un dia especifico
} else if (callbackData && callbackData.startsWith('nutri_dia_')) {
  const dia = callbackData.replace('nutri_dia_', '');
  const text = formatMenu(dia);
  if (text) {
    telegramBody = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '\ud83d\udd04 Ver alternativas', callback_data: 'nutri_alt_' + dia }],
          [{ text: '\ud83c\udfb2 Otro menu', callback_data: 'nutri_random' }],
          [{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]
        ]
      }
    };
  }

// Alternativas
} else if (callbackData && callbackData.startsWith('nutri_alt_')) {
  const dia = callbackData.replace('nutri_alt_', '');
  const text = formatAlternativas(dia);
  if (text) {
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
  }
}

if (!telegramBody) return [];

return [{
  json: {
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: JSON.stringify(telegramBody)
  }
}];
