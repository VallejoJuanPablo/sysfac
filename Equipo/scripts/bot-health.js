/**
 * Health check del sistema de pendientes Telegram.
 * Verifica: MySQL, archie-db-server, n8n, Cloudflare tunnel, workflow activo.
 *
 * Uso: node scripts/bot-health.js
 * Devuelve JSON con el estado de cada servicio.
 */

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';

async function checkPort(port, label) {
  try {
    const r = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
    // For db-server, any response means it's up (even 405)
    if (r) return { ok: true };
    // Try health endpoint
    const r2 = await fetch(`http://localhost:${port}/healthz`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
    if (r2) return { ok: true };
    return { ok: false, error: `Puerto ${port} no responde` };
  } catch {
    return { ok: false, error: `Puerto ${port} no responde` };
  }
}

async function checkMySQL() {
  try {
    const { spawnSync } = require('child_process');
    const r = spawnSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', 'archie_team', '-e', 'SELECT 1'], {
      encoding: 'utf8', timeout: 3000
    });
    if (r.status === 0) return { ok: true, source: 'xampp' };

    // Try Docker MySQL
    const r2 = spawnSync('docker', ['exec', 'archie-mysql', 'mysql', '-u', 'root', '-parchie2026', 'archie_team', '-e', 'SELECT 1'], {
      encoding: 'utf8', timeout: 5000
    });
    if (r2.status === 0) return { ok: true, source: 'docker' };

    return { ok: false, error: 'MySQL no disponible (ni XAMPP ni Docker)' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkDbServer() {
  try {
    const r = await fetch('http://localhost:3456', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_state', chat_id: 0 }),
      signal: AbortSignal.timeout(3000)
    });
    const data = await r.json();
    if (data.projects) return { ok: true, projects: data.projects.length };
    return { ok: false, error: 'Respuesta inesperada' };
  } catch {
    return { ok: false, error: 'No responde en puerto 3456' };
  }
}

async function checkN8n() {
  try {
    const r = await fetch('http://localhost:5678/healthz', { signal: AbortSignal.timeout(3000) });
    const data = await r.json();
    if (data.status === 'ok') {
      // Check WEBHOOK_URL
      const { spawnSync } = require('child_process');
      const insp = spawnSync('docker', ['inspect', 'n8n', '--format', '{{range .Config.Env}}{{println .}}{{end}}'], {
        encoding: 'utf8', timeout: 3000
      });
      const webhookLine = (insp.stdout || '').split('\n').find(l => l.startsWith('WEBHOOK_URL='));
      const webhookUrl = webhookLine ? webhookLine.replace('WEBHOOK_URL=', '').trim() : null;
      return { ok: true, webhookUrl };
    }
    return { ok: false, error: 'Health check falló' };
  } catch {
    return { ok: false, error: 'n8n no responde en puerto 5678' };
  }
}

async function checkTunnel(webhookUrl) {
  if (!webhookUrl) return { ok: false, error: 'No hay WEBHOOK_URL configurada' };
  try {
    const r = await fetch(webhookUrl, { signal: AbortSignal.timeout(5000) });
    // Any response means the tunnel is working (even redirects)
    return { ok: true, url: webhookUrl };
  } catch {
    return { ok: false, error: 'Tunnel no alcanzable: ' + webhookUrl };
  }
}

async function checkWorkflow() {
  try {
    const r = await fetch('http://localhost:5678/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': N8N_KEY },
      signal: AbortSignal.timeout(3000)
    });
    const data = await r.json();
    const bot = (data.data || []).find(w => w.name === 'Archie Pendientes Bot');
    if (!bot) return { ok: false, error: 'Workflow no existe', exists: false };
    return { ok: bot.active, id: bot.id, active: bot.active, error: bot.active ? null : 'Workflow existe pero está inactivo' };
  } catch (e) {
    return { ok: false, error: 'No se pudo consultar n8n API' };
  }
}

async function checkTelegramWebhook() {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    const info = data.result || {};
    if (info.url && info.url.length > 0) {
      return { ok: true, url: info.url, pending: info.pending_update_count || 0 };
    }
    return { ok: false, error: 'No hay webhook registrado en Telegram' };
  } catch {
    return { ok: false, error: 'No se pudo consultar Telegram API' };
  }
}

async function main() {
  const mysql = await checkMySQL();
  const dbServer = await checkDbServer();
  const n8n = await checkN8n();
  const tunnel = await checkTunnel(n8n.webhookUrl);
  const workflow = n8n.ok ? await checkWorkflow() : { ok: false, error: 'n8n no disponible' };
  const telegram = await checkTelegramWebhook();

  const allOk = mysql.ok && dbServer.ok && n8n.ok && tunnel.ok && workflow.ok && telegram.ok;

  const result = {
    status: allOk ? 'OK' : 'DEGRADED',
    services: { mysql, dbServer, n8n, tunnel, workflow, telegram }
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(allOk ? 0 : 1);
}

main().catch(e => {
  console.error(JSON.stringify({ status: 'ERROR', error: e.message }));
  process.exit(2);
});
