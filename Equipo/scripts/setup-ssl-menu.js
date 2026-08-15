/**
 * Setup: Agrega modulo SSL al bot de Telegram
 *
 * 1. Crea sub-workflow "Archie SSL Check" (consulta certificados via SSH)
 * 2. Actualiza "Archie Bot - Menu" (agrega boton SSL + routing)
 *
 * Ejecutar: node scripts/setup-ssl-menu.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const TELEGRAM_CRED_ID = '2hu4MTinNEcT2rCy';
const DB_URL = 'http://host.docker.internal:3456';
const PENDIENTES_WF_ID = 'ZBgC6QoXA6qDfpyk';
const SSH_CRED_ID = 'bMa4wXvgRxg07ORl';
const SSH_CRED_NAME = 'SSH t40 (190.183.60.148)';

function readLogic(filename) {
  const raw = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  return raw.replace(/__BOT_TOKEN__/g, BOT_TOKEN);
}

// Comando SSH (mismo del workflow SSL existente)
const sshCommand = `#!/bin/bash
DOMINIOS="prescriptorweb.ddaval.com.ar validador.supbienestar.gob.ar pamiweb.handlerfacaf.com.ar"

echo "["
FIRST=1
for DOMINIO in $DOMINIOS; do
  ENDDATE=$(echo | openssl s_client -connect \${DOMINIO}:443 -servername \${DOMINIO} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$ENDDATE" ]; then
    EPOCH=$(date -d "$ENDDATE" +%s 2>/dev/null)
    ISO=$(date -d "$ENDDATE" +%Y-%m-%d 2>/dev/null)
    if [ $FIRST -eq 1 ]; then FIRST=0; else echo ","; fi
    echo "  {\\"dominio\\": \\"\${DOMINIO}\\", \\"vencimiento\\": \\"\${ISO}\\", \\"enddate_raw\\": \\"\${ENDDATE}\\", \\"epoch\\": \${EPOCH:-0}}"
  else
    if [ $FIRST -eq 1 ]; then FIRST=0; else echo ","; fi
    echo "  {\\"dominio\\": \\"\${DOMINIO}\\", \\"vencimiento\\": null, \\"enddate_raw\\": \\"ERROR\\", \\"epoch\\": 0}"
  fi
done
echo ""
echo "]"`;

const extractChatIdCode = `
const input = $input.first().json;
const chatId = input.chatId || 0;
return [{ json: { chatId } }];
`;

// ============================================================
// PASO 1: Crear sub-workflow SSL
// ============================================================
async function createSSLWorkflow() {
  console.log('\n--- Paso 1: Crear Archie SSL Check ---');

  const sslFormatCode = readLogic('ssl-format-logic.js');

  const workflow = {
    name: 'Archie SSL Check',
    nodes: [
      {
        parameters: {},
        id: 'ssl-001', name: 'Execute Workflow Trigger',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1,
        position: [200, 300]
      },
      {
        parameters: { jsCode: extractChatIdCode, mode: 'runOnceForAllItems' },
        id: 'ssl-002', name: 'Extract',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [400, 300]
      },
      {
        parameters: { command: sshCommand },
        id: 'ssl-003', name: 'SSH - Consultar Certificados',
        type: 'n8n-nodes-base.ssh', typeVersion: 1,
        position: [600, 300],
        credentials: { sshPassword: { id: SSH_CRED_ID, name: SSH_CRED_NAME } }
      },
      {
        parameters: { jsCode: sslFormatCode, mode: 'runOnceForAllItems' },
        id: 'ssl-004', name: 'Format SSL',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [800, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: '={{ $json.telegramUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $json.telegramBody }}',
          options: {}
        },
        id: 'ssl-005', name: 'Send Telegram',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [1000, 300]
      }
    ],
    connections: {
      'Execute Workflow Trigger': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
      'Extract': { main: [[{ node: 'SSH - Consultar Certificados', type: 'main', index: 0 }]] },
      'SSH - Consultar Certificados': { main: [[{ node: 'Format SSL', type: 'main', index: 0 }]] },
      'Format SSL': { main: [[{ node: 'Send Telegram', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  // Verificar si ya existe
  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const existing = (list.data || list).find(w => w.name === 'Archie SSL Check');

  let result;
  if (existing) {
    console.log('  Workflow existente (ID:', existing.id, '). Actualizando...');
    const putRes = await fetch(`${N8N_URL}/workflows/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
      body: JSON.stringify(workflow)
    });
    result = await putRes.json();
    if (!putRes.ok) { console.error('  ERROR:', JSON.stringify(result, null, 2)); return null; }
  } else {
    const postRes = await fetch(`${N8N_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
      body: JSON.stringify(workflow)
    });
    result = await postRes.json();
    if (!postRes.ok) { console.error('  ERROR:', JSON.stringify(result, null, 2)); return null; }
  }

  // Activar (necesario antes de que el Menu lo referencie)
  await fetch(`${N8N_URL}/workflows/${result.id}/activate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('  SSL Check OK (ID:', result.id, ')');
  return result.id;
}

// ============================================================
// PASO 2: Actualizar Menu con boton SSL
// ============================================================
async function updateMenu(sslWfId) {
  console.log('\n--- Paso 2: Actualizar Archie Bot - Menu ---');

  const routerCode = readLogic('menu-router-logic.js');
  const extractCode = `
const update = $input.first().json;
let chatId = 0, text = '', callbackData = '', messageType = 'unknown', callbackQueryId = '';

if (update.message) {
  chatId = update.message.chat.id;
  text = (update.message.text || '').trim();
  messageType = 'message';
} else if (update.callback_query) {
  chatId = update.callback_query.message.chat.id;
  callbackData = update.callback_query.data || '';
  callbackQueryId = update.callback_query.id || '';
  messageType = 'callback';
}

return [{ json: { chatId, text, callbackData, messageType, callbackQueryId } }];
`;

  const prepPendientesCode = `
const router = $('Router').first().json;
const input = JSON.parse(router.subWfInput);
return [{ json: input }];
`;

  const prepSSLCode = `
const router = $('Router').first().json;
const input = JSON.parse(router.subWfInput);
return [{ json: input }];
`;

  const workflow = {
    name: 'Archie Bot - Menu',
    nodes: [
      // Telegram Trigger
      {
        parameters: { updates: ['message', 'callback_query'] },
        id: 'menu-001', name: 'Telegram Trigger',
        type: 'n8n-nodes-base.telegramTrigger', typeVersion: 1.1,
        position: [200, 300],
        credentials: { telegramApi: { id: TELEGRAM_CRED_ID, name: 'Telegram account' } }
      },
      // Extract
      {
        parameters: { jsCode: extractCode, mode: 'runOnceForAllItems' },
        id: 'menu-002', name: 'Extract',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [400, 300]
      },
      // Read DB
      {
        parameters: {
          method: 'POST', url: DB_URL,
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ JSON.stringify({ action: "read_state", chat_id: $json.chatId }) }}',
          options: {}
        },
        id: 'menu-003', name: 'Read DB',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [600, 300]
      },
      // Router
      {
        parameters: { jsCode: routerCode, mode: 'runOnceForAllItems' },
        id: 'menu-004', name: 'Router',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [800, 300]
      },
      // Is Pendientes?
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r1', leftValue: '={{ $json.route }}', rightValue: 'pendientes', operator: { type: 'string', operation: 'equals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-005', name: 'Is Pendientes?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1000, 300]
      },
      // TRUE → Prep + Execute Pendientes
      {
        parameters: { jsCode: prepPendientesCode, mode: 'runOnceForAllItems' },
        id: 'menu-006', name: 'Prep Pendientes',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1200, 160]
      },
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: PENDIENTES_WF_ID }, options: {} },
        id: 'menu-007', name: 'Execute Pendientes',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1400, 160]
      },
      // FALSE → Is SSL?
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r2', leftValue: '={{ $("Router").first().json.route }}', rightValue: 'ssl', operator: { type: 'string', operation: 'equals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-008', name: 'Is SSL?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1200, 440]
      },
      // SSL TRUE → Prep + Execute SSL
      {
        parameters: { jsCode: prepSSLCode, mode: 'runOnceForAllItems' },
        id: 'menu-009', name: 'Prep SSL',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1400, 360]
      },
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: sslWfId }, options: {} },
        id: 'menu-010', name: 'Execute SSL',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1600, 360]
      },
      // SSL FALSE → Send Menu
      {
        parameters: {
          method: 'POST',
          url: '={{ $("Router").first().json.telegramUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $("Router").first().json.telegramBody }}',
          options: {}
        },
        id: 'menu-011', name: 'Send Menu',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [1400, 540]
      },
      // Has Callback? (merge de todas las ramas)
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r3', leftValue: '={{ $("Router").first().json.answerCallbackUrl }}', rightValue: '', operator: { type: 'string', operation: 'notEquals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-012', name: 'Has Callback?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1800, 440]
      },
      // Answer Callback
      {
        parameters: {
          method: 'POST',
          url: '={{ $("Router").first().json.answerCallbackUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $("Router").first().json.answerCallbackBody }}',
          options: {}
        },
        id: 'menu-013', name: 'Answer Callback',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [2000, 360]
      }
    ],
    connections: {
      'Telegram Trigger': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
      'Extract': { main: [[{ node: 'Read DB', type: 'main', index: 0 }]] },
      'Read DB': { main: [[{ node: 'Router', type: 'main', index: 0 }]] },
      'Router': { main: [[{ node: 'Is Pendientes?', type: 'main', index: 0 }]] },
      'Is Pendientes?': { main: [
        [{ node: 'Prep Pendientes', type: 'main', index: 0 }],
        [{ node: 'Is SSL?', type: 'main', index: 0 }]
      ]},
      'Prep Pendientes': { main: [[{ node: 'Execute Pendientes', type: 'main', index: 0 }]] },
      'Execute Pendientes': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Is SSL?': { main: [
        [{ node: 'Prep SSL', type: 'main', index: 0 }],
        [{ node: 'Send Menu', type: 'main', index: 0 }]
      ]},
      'Prep SSL': { main: [[{ node: 'Execute SSL', type: 'main', index: 0 }]] },
      'Execute SSL': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Send Menu': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Has Callback?': { main: [
        [{ node: 'Answer Callback', type: 'main', index: 0 }],
        []
      ]}
    },
    settings: { executionOrder: 'v1' }
  };

  // Buscar workflow existente
  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const existing = (list.data || list).find(w => w.name === 'Archie Bot - Menu');

  let result;
  if (existing) {
    console.log('  Workflow existente (ID:', existing.id, '). Actualizando...');
    const putRes = await fetch(`${N8N_URL}/workflows/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
      body: JSON.stringify(workflow)
    });
    result = await putRes.json();
    if (!putRes.ok) { console.error('  ERROR:', JSON.stringify(result, null, 2)); return false; }
  } else {
    console.error('  ERROR: No se encontro "Archie Bot - Menu". Ejecuta setup-bot-menu.js primero.');
    return false;
  }

  // Activar
  await fetch(`${N8N_URL}/workflows/${result.id}/activate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('  Menu actualizado OK (ID:', result.id, ')');
  return true;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== Setup: Modulo SSL para Archie Bot ===');

  const sslWfId = await createSSLWorkflow();
  if (!sslWfId) {
    console.error('\nFallo al crear SSL workflow. Abortando.');
    process.exit(1);
  }

  const ok = await updateMenu(sslWfId);
  if (!ok) {
    console.error('\nFallo al actualizar Menu. Abortando.');
    process.exit(1);
  }

  console.log('\n=== Setup SSL completo ===');
  console.log('SSL Check (sub-workflow):', sslWfId);
  console.log('\nProbalo en Telegram: menu → Vencimiento SSL');
}

main().catch(e => { console.error(e); process.exit(1); });
