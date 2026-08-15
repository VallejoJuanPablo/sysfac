import 'dotenv/config';
import { notify } from './bot.js';

console.log('=================================');
console.log('  Archie Telegram Bot');
console.log('  Equipo activo');
console.log('=================================');
console.log('');
console.log('Bot escuchando...');
console.log('Enviá /start en Telegram para comenzar.');

// Manejo limpio de cierre
process.on('SIGINT', () => {
  console.log('\nBot detenido.');
  process.exit(0);
});

// Exportar notify para uso programático
export { notify };
