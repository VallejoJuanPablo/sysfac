/**
 * Startup automático del sistema de pendientes Telegram.
 * Levanta todos los servicios en orden y configura el tunnel.
 *
 * Uso: node scripts/bot-start.js
 *
 * Orden:
 *   1. Verifica MySQL (XAMPP o Docker)
 *   2. Inicia archie-db-server si no está corriendo
 *   3. Inicia Cloudflare tunnel y captura la URL
 *   4. Recrea contenedor n8n con la nueva WEBHOOK_URL
 *   5. Crea/reactiva el workflow de Telegram
 */

const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const SCRIPTS_DIR = __dirname;
const N8N_VOLUME = 'D:/trabajo/n8n';

function log(icon, msg) { console.log(`${icon} ${msg}`); }
function ok(msg) { log('✅', msg); }
function fail(msg) { log('❌', msg); }
function info(msg) { log('🔧', msg); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function isPortOpen(port) {
  try {
    const r = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
    return !!r;
  } catch { return false; }
}

// --- STEP 1: MySQL ---
function checkMySQL() {
  const r = spawnSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', 'archie_team', '-e', 'SELECT 1'], {
    encoding: 'utf8', timeout: 3000
  });
  return r.status === 0;
}

// --- STEP 2: archie-db-server ---
async function ensureDbServer() {
  if (await isPortOpen(3456)) {
    ok('archie-db-server ya corriendo en :3456');
    return true;
  }

  info('Iniciando archie-db-server...');
  const child = spawn('node', [path.join(SCRIPTS_DIR, 'archie-db-server.js')], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  // Wait for it to be ready
  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    if (await isPortOpen(3456)) {
      ok('archie-db-server iniciado en :3456');
      return true;
    }
  }
  fail('archie-db-server no arrancó');
  return false;
}

// --- STEP 3: Cloudflare tunnel ---
async function startTunnel() {
  // Check if tunnel is already running
  const r = spawnSync('tasklist', [], { encoding: 'utf8' });
  if (r.stdout && r.stdout.includes('cloudflared')) {
    // Get current tunnel URL from n8n
    try {
      const insp = spawnSync('docker', ['inspect', 'n8n', '--format', '{{range .Config.Env}}{{println .}}{{end}}'], {
        encoding: 'utf8', timeout: 3000
      });
      const line = (insp.stdout || '').split('\n').find(l => l.startsWith('WEBHOOK_URL='));
      const url = line ? line.replace('WEBHOOK_URL=', '').trim() : null;
      if (url) {
        try {
          const check = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (check) {
            ok('Cloudflare tunnel ya activo: ' + url);
            return url;
          }
        } catch {}
      }
    } catch {}
    // Tunnel process exists but URL is stale, kill it
    info('Tunnel existente con URL inválida, reiniciando...');
    spawnSync('taskkill', ['/IM', 'cloudflared.exe', '/F'], { encoding: 'utf8' });
    await sleep(2000);
  }

  info('Iniciando Cloudflare tunnel...');
  const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:5678'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Timeout esperando URL del tunnel'));
    }, 30000);

    const handler = (data) => {
      output += data.toString();
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timeout);
        tunnel.stderr.removeListener('data', handler);
        tunnel.unref();
        ok('Tunnel activo: ' + match[0]);
        resolve(match[0]);
      }
    };

    tunnel.stderr.on('data', handler);
    tunnel.on('error', (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

// --- STEP 4: n8n con WEBHOOK_URL ---
async function ensureN8n(tunnelUrl) {
  const webhookUrl = tunnelUrl.endsWith('/') ? tunnelUrl : tunnelUrl + '/';

  // Check if n8n is running with correct URL
  try {
    const health = await fetch('http://localhost:5678/healthz', { signal: AbortSignal.timeout(2000) });
    if (health.ok) {
      const insp = spawnSync('docker', ['inspect', 'n8n', '--format', '{{range .Config.Env}}{{println .}}{{end}}'], {
        encoding: 'utf8', timeout: 3000
      });
      const currentUrl = ((insp.stdout || '').split('\n').find(l => l.startsWith('WEBHOOK_URL=')) || '')
        .replace('WEBHOOK_URL=', '').trim();

      if (currentUrl === webhookUrl) {
        ok('n8n ya corriendo con URL correcta');
        return true;
      }
      info('n8n corriendo pero con URL vieja, recreando...');
    }
  } catch {}

  // Stop and recreate
  info('Configurando n8n con WEBHOOK_URL: ' + webhookUrl);
  spawnSync('docker', ['stop', 'n8n'], { encoding: 'utf8', timeout: 10000 });
  spawnSync('docker', ['rm', 'n8n'], { encoding: 'utf8', timeout: 5000 });

  const run = spawnSync('docker', [
    'run', '-d', '--restart', 'unless-stopped',
    '--name', 'n8n',
    '-p', '5678:5678',
    '-v', `${N8N_VOLUME}:/home/node/.n8n`,
    '-e', `WEBHOOK_URL=${webhookUrl}`,
    'n8nio/n8n'
  ], { encoding: 'utf8', timeout: 15000 });

  if (run.status !== 0) {
    fail('Error iniciando n8n: ' + (run.stderr || ''));
    return false;
  }

  // Wait for n8n to be ready
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    try {
      const r = await fetch('http://localhost:5678/healthz', { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        ok('n8n iniciado correctamente');
        return true;
      }
    } catch {}
  }
  fail('n8n no arrancó a tiempo');
  return false;
}

// --- STEP 5: Workflow ---
async function ensureWorkflow() {
  // Wait a bit for n8n to fully initialize
  await sleep(2000);

  try {
    const r = await fetch(`${N8N_URL}/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_KEY },
      signal: AbortSignal.timeout(5000)
    });
    const data = await r.json();
    const bot = (data.data || []).find(w => w.name === 'Archie Pendientes Bot');

    if (bot && bot.active) {
      ok('Workflow "Archie Pendientes Bot" activo (ID: ' + bot.id + ')');
      return true;
    }

    if (bot && !bot.active) {
      info('Workflow existe pero está inactivo, necesita activación manual');
      console.log('   → Abrí http://localhost:5678/workflow/' + bot.id + ' y activá el toggle');
      return false;
    }

    // No workflow exists, create it
    info('Workflow no existe, creándolo...');
    const create = spawnSync('node', [path.join(SCRIPTS_DIR, 'create-telegram-workflow.js')], {
      encoding: 'utf8', timeout: 15000, cwd: path.resolve(SCRIPTS_DIR, '..')
    });
    console.log('   ' + (create.stdout || '').trim());
    if (create.status === 0) {
      info('Workflow creado. Activalo desde n8n.');
      return false; // needs manual activation
    }
    fail('Error creando workflow');
    return false;
  } catch (e) {
    fail('Error verificando workflow: ' + e.message);
    return false;
  }
}

// --- STEP 6: Telegram webhook ---
async function checkTelegramWebhook() {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    const url = data.result?.url || '';
    if (url) {
      ok('Webhook de Telegram registrado: ' + url.substring(0, 50) + '...');
      return true;
    }
    info('Webhook de Telegram no registrado (se registra al activar el workflow)');
    return false;
  } catch {
    fail('No se pudo verificar webhook de Telegram');
    return false;
  }
}

// --- MAIN ---
async function main() {
  console.log('');
  console.log('🤖 Archie — Iniciando servicio de pendientes Telegram');
  console.log('─'.repeat(50));

  // Step 1: MySQL
  if (checkMySQL()) {
    ok('MySQL disponible (XAMPP)');
  } else {
    fail('MySQL no disponible. Iniciá XAMPP o Docker MySQL.');
    process.exit(1);
  }

  // Step 2: DB Server
  const dbOk = await ensureDbServer();
  if (!dbOk) process.exit(1);

  // Step 3: Tunnel
  let tunnelUrl;
  try {
    tunnelUrl = await startTunnel();
  } catch (e) {
    fail('Error con Cloudflare tunnel: ' + e.message);
    process.exit(1);
  }

  // Step 4: n8n
  const n8nOk = await ensureN8n(tunnelUrl);
  if (!n8nOk) process.exit(1);

  // Step 5: Workflow
  await ensureWorkflow();

  // Step 6: Telegram webhook
  await checkTelegramWebhook();

  console.log('─'.repeat(50));
  console.log('');
}

main().catch(e => {
  fail('Error fatal: ' + e.message);
  process.exit(2);
});
