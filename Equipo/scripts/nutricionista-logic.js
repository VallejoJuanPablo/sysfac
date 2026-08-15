// Logica del sub-workflow Nutricionista
// Se lee como texto plano y se inyecta como jsCode en n8n
// Recibe el update de Telegram via Execute Workflow Trigger

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

// --- Base de datos de comidas ---
const desayunos = [
  'Tostadas integrales con palta y huevo revuelto',
  'Yogur griego con granola y frutos rojos',
  'Avena cocida con banana y canela',
  'Licuado de banana, avena y leche de almendras',
  'Tostada de pan integral con queso untable y tomate',
  'Huevos revueltos con espinaca y pan integral',
  'Smoothie de mango, yogur y semillas de chia',
  'Panqueques de avena con miel y frutas',
  'Porridge de avena con manzana rallada y nueces',
  'Pan integral con mantequilla de mani y banana',
  'Omelette de claras con champignones',
  'Chia pudding con leche de coco y kiwi'
];

const mediaMananas = [
  'Manzana con mantequilla de almendras',
  'Mix de frutos secos (30g)',
  'Banana con un punado de nueces',
  'Yogur natural con semillas de girasol',
  'Zanahoria y apio con hummus',
  'Barrita de cereales casera',
  'Mandarina + 5 almendras',
  'Galletas de arroz con queso untable',
  'Pera con un punado de castanas de caju',
  'Smoothie verde (espinaca, manzana, jengibre)'
];

const almuerzos = [
  'Pollo a la plancha con ensalada mixta y arroz integral',
  'Milanesa de pollo al horno con pure de calabaza',
  'Salmon al horno con vegetales asados y quinoa',
  'Pasta integral con salsa de tomate casera y albahaca',
  'Wok de verduras con tofu y arroz yamani',
  'Ensalada de lentejas con tomate, cebolla y huevo duro',
  'Tarta de espinaca y ricota con ensalada',
  'Bowl de arroz integral, pollo, palta y edamame',
  'Merluza al horno con papas y ensalada de rucula',
  'Guiso de garbanzos con verduras de estacion',
  'Suprema de pollo con batata asada y brocoli',
  'Tacos de carne magra con ensalada de repollo',
  'Risotto de champignones con ensalada verde',
  'Hamburguesa casera de lentejas con ensalada'
];

const meriendas = [
  'Te verde con tostadas integrales y mermelada light',
  'Cafe con leche y 2 galletitas de avena',
  'Infusion con budincito de banana',
  'Mate con bizcochitos de grasa integrales',
  'Yogur con frutas picadas',
  'Licuado de frutilla con leche descremada',
  'Cafe con leche y 1 rebanada de pan integral con queso',
  'Te con scones de avena y semillas',
  'Smoothie de durazno con yogur',
  'Infusion con alfajor de maicena (1 unidad)'
];

const cenas = [
  'Sopa de verduras con pan integral tostado',
  'Omelette de verduras con ensalada mixta',
  'Pechuga de pollo grillada con ensalada cesar light',
  'Tarta de zapallitos con ensalada de tomate',
  'Revuelto de huevos con champignones y espinaca',
  'Merluza a la plancha con pure de papa',
  'Ensalada tibia de quinoa con vegetales asados',
  'Wrap integral de pollo con verduras y aderezo de yogur',
  'Sopa crema de calabaza con semillas de zapallo',
  'Milanesa de berenjena al horno con ensalada',
  'Brochettes de pollo y verduras con arroz',
  'Pizza casera integral con relleno de verduras',
  'Canelones de verdura y ricota con salsa blanca light'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let telegramBody = null;

// --- Sub-menu del nutricionista ---
if (messageType === 'direct' || callbackData === 'nutri_menu' || messageType === 'message') {
  telegramBody = {
    chat_id: chatId,
    text: '\ud83e\udd57 *Nutricionista* \u2014 Menu\n\n\u00bfQue necesitas?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83c\udfb2 Menu aleatorio del dia', callback_data: 'nutri_random' }],
        [{ text: '\ud83d\udd19 Volver al menu', callback_data: 'menu_main' }]
      ]
    }
  };

// --- Menu aleatorio ---
} else if (callbackData === 'nutri_random') {
  const desayuno = pick(desayunos);
  const mediaManana = pick(mediaMananas);
  const almuerzo = pick(almuerzos);
  const merienda = pick(meriendas);
  const cena = pick(cenas);

  const text = '\ud83c\udfb2 *Menu aleatorio del dia*\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n'
    + '\u2615 *Desayuno*\n' + desayuno + '\n\n'
    + '\ud83c\udf4e *Media manana*\n' + mediaManana + '\n\n'
    + '\ud83c\udf5d *Almuerzo*\n' + almuerzo + '\n\n'
    + '\u2615 *Merienda*\n' + merienda + '\n\n'
    + '\ud83c\udf19 *Cena*\n' + cena + '\n\n'
    + '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n'
    + '\ud83d\udca7 _Recorda tomar al menos 2L de agua_';

  telegramBody = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '\ud83d\udd04 Otro menu', callback_data: 'nutri_random' }],
        [{ text: '\ud83d\udd19 Nutricionista', callback_data: 'nutri_menu' }, { text: '\ud83c\udfe0 Menu principal', callback_data: 'menu_main' }]
      ]
    }
  };
}

if (!telegramBody) return [];

return [{
  json: {
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: JSON.stringify(telegramBody)
  }
}];
