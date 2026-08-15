// Formatea los resultados SSL para Telegram
// Recibe: SSH stdout (JSON) + chatId desde Extract
// Retorna: telegramBody listo para enviar

const chatId = $('Extract').first().json.chatId;
const botToken = '__BOT_TOKEN__';
const output = $input.first().json.stdout || '';

let certs;
try {
  certs = JSON.parse(output);
} catch(e) {
  const clean = output.replace(/[\r]/g, '').trim();
  try {
    certs = JSON.parse(clean);
  } catch(e2) {
    // Error al parsear
    const errorBody = {
      chat_id: chatId,
      text: '\u26a0\ufe0f No se pudieron consultar los certificados SSL.',
      parse_mode: 'Markdown'
    };
    return [{
      json: {
        telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
        telegramBody: JSON.stringify(errorBody)
      }
    }];
  }
}

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

let lines = [];
lines.push('\ud83d\udd12 *Certificados SSL*\n');

for (const cert of certs) {
  let diasRestantes = null;
  let icono = '\ud83d\udfe2';
  let estado = '';

  if (cert.vencimiento) {
    const venc = new Date(cert.vencimiento + 'T00:00:00');
    diasRestantes = Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // Formato de fecha legible
    const dia = venc.getDate();
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mes = meses[venc.getMonth()];
    const anio = venc.getFullYear();
    const fechaStr = dia + '/' + mes + '/' + anio;

    if (diasRestantes < 0) {
      icono = '\ud83d\udd34';
      estado = 'VENCIDO hace ' + Math.abs(diasRestantes) + ' dias';
    } else if (diasRestantes === 0) {
      icono = '\ud83d\udd34';
      estado = 'VENCE HOY';
    } else if (diasRestantes <= 7) {
      icono = '\ud83d\udfe0';
      estado = 'en ' + diasRestantes + ' dias';
    } else if (diasRestantes <= 30) {
      icono = '\ud83d\udfe1';
      estado = 'en ' + diasRestantes + ' dias';
    } else {
      icono = '\ud83d\udfe2';
      estado = 'en ' + diasRestantes + ' dias';
    }

    const safeDomain = cert.dominio.replace(/[*_\\`\[\]]/g, '');
    lines.push(icono + ' `' + safeDomain + '`');
    lines.push('   Vence: ' + fechaStr + ' (' + estado + ')');
    lines.push('');
  } else {
    const safeDomain = cert.dominio.replace(/[*_\\`\[\]]/g, '');
    lines.push('\ud83d\udfe3 `' + safeDomain + '`');
    lines.push('   \u26a0\ufe0f No se pudo leer el certificado');
    lines.push('');
  }
}

lines.push('\ud83d\udfe2 >30d  \ud83d\udfe1 15-30d  \ud83d\udfe0 <7d  \ud83d\udd34 Vencido');

const telegramBody = {
  chat_id: chatId,
  text: lines.join('\n'),
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [[{ text: '\ud83c\udfe0 Menu', callback_data: 'menu_main' }]]
  }
};

return [{
  json: {
    telegramUrl: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
    telegramBody: JSON.stringify(telegramBody)
  }
}];
