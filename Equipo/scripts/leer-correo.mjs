import { ImapFlow } from 'imapflow';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env manualmente (sin dependencia extra)
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error('ERROR: No se encontró el archivo .env en Equipo/');
    console.error('Copiá .env.example como .env y completá GMAIL_APP_PASSWORD');
    process.exit(1);
  }
}

loadEnv();

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

if (!user || !pass || pass.includes('xxxx')) {
  console.error('ERROR: Configurá GMAIL_USER y GMAIL_APP_PASSWORD en .env');
  process.exit(1);
}

// Parámetros CLI
const args = process.argv.slice(2);
const cantidad = parseInt(args.find(a => /^\d+$/.test(a)) || '10', 10);
const carpeta = args.find(a => !/^\d+$/.test(a) && !a.startsWith('--')) || 'INBOX';
const soloNoLeidos = args.includes('--no-leidos');
const buscar = args.find((a, i) => args[i - 1] === '--buscar') || null;

async function main() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();

    // Si piden listar carpetas
    if (carpeta === '--carpetas') {
      const mailboxes = await client.list();
      console.log('=== CARPETAS DISPONIBLES ===\n');
      for (const mb of mailboxes) {
        console.log(`  ${mb.path}${mb.specialUse ? ` (${mb.specialUse})` : ''}`);
      }
      await client.logout();
      return;
    }

    const lock = await client.getMailboxLock(carpeta);

    try {
      // Construir criterio de búsqueda
      let searchCriteria = {};
      if (soloNoLeidos) searchCriteria.seen = false;
      if (buscar) searchCriteria.or = [
        { subject: buscar },
        { from: buscar },
      ];

      // Obtener UIDs de mensajes
      let uids;
      if (Object.keys(searchCriteria).length > 0) {
        const results = await client.search(searchCriteria);
        uids = results.slice(-cantidad);
      } else {
        // Últimos N mensajes
        const total = client.mailbox.exists;
        if (total === 0) {
          console.log('La bandeja está vacía.');
          return;
        }
        const start = Math.max(1, total - cantidad + 1);
        const range = `${start}:${total}`;
        uids = [];
        for await (const msg of client.fetch(range, { uid: true })) {
          uids.push(msg.uid);
        }
      }

      if (uids.length === 0) {
        console.log('No se encontraron mensajes con ese criterio.');
        return;
      }

      console.log(`=== CORREOS EN ${carpeta} (${uids.length} mensajes) ===\n`);

      let index = 0;
      for await (const message of client.fetch(uids, {
        envelope: true,
        bodyStructure: true,
        source: { maxLength: 50000 },
      }, { uid: true })) {
        index++;
        const env = message.envelope;
        const from = env.from?.[0] ? `${env.from[0].name || ''} <${env.from[0].address}>`.trim() : 'Desconocido';
        const to = env.to?.map(t => t.address).join(', ') || '';
        const date = env.date ? new Date(env.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '';
        const subject = env.subject || '(sin asunto)';

        // Extraer texto plano del source
        let body = '';
        if (message.source) {
          const raw = message.source.toString('utf-8');
          // Intentar extraer el body de texto plano
          const parts = raw.split(/\r?\n\r?\n/);
          if (parts.length > 1) {
            body = parts.slice(1).join('\n\n');
            // Limpiar encoding quoted-printable básico
            body = body.replace(/=\r?\n/g, '');
            body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            // Limpiar HTML tags si viene como HTML
            body = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            // Limitar largo
            if (body.length > 500) body = body.slice(0, 500) + '...';
          }
        }

        console.log(`--- Mensaje ${index} ---`);
        console.log(`  De:     ${from}`);
        console.log(`  Para:   ${to}`);
        console.log(`  Fecha:  ${date}`);
        console.log(`  Asunto: ${subject}`);
        console.log(`  UID:    ${message.uid}`);
        if (body) {
          console.log(`  Cuerpo: ${body}`);
        }
        console.log('');
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    if (err.authenticationFailed) {
      console.error('ERROR: Autenticación fallida. Verificá:');
      console.error('  1. Que tenés verificación en 2 pasos activada en Gmail');
      console.error('  2. Que GMAIL_APP_PASSWORD es una contraseña de aplicación (16 caracteres)');
      console.error('  3. Que IMAP está habilitado en Gmail (Configuración → Ver todos → Reenvío y POP/IMAP)');
    } else {
      console.error(`ERROR: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
