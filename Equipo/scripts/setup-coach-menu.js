/**
 * Setup: Agrega modulo Coach al bot de Telegram
 *
 * 1. Crea base de datos "coach" con tablas
 * 2. Crea sub-workflow "Archie Coach" (panel interactivo de ejercicios)
 * 3. Crea workflow "Archie Coach Reminder" (recordatorios cron 9/12/15/18/21)
 * 4. Actualiza "Archie Bot - Menu" (agrega boton Coach + routing)
 *
 * Ejecutar: node scripts/setup-coach-menu.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const TELEGRAM_CRED_ID = '2hu4MTinNEcT2rCy';
const DB_URL = 'http://host.docker.internal:3456';
const PENDIENTES_WF_ID = 'ZBgC6QoXA6qDfpyk';

function readLogic(filename) {
  const raw = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  return raw.replace(/__BOT_TOKEN__/g, BOT_TOKEN);
}

// ============================================================
// PASO 0: Crear base de datos coach
// ============================================================
async function createDatabase() {
  console.log('\n--- Paso 0: Crear base de datos coach ---');

  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: ''
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS coach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query('USE coach');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS coach_users (
      chat_id BIGINT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS coach_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chat_id BIGINT NOT NULL,
      ejercicio VARCHAR(50) NOT NULL,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_log (chat_id, ejercicio, fecha),
      INDEX idx_chat_fecha (chat_id, fecha)
    )
  `);

  await conn.end();
  console.log('  Database coach OK (tablas: coach_users, coach_log)');
}

// ============================================================
// PASO 1: Crear sub-workflow Archie Coach
// ============================================================
async function createCoachWorkflow() {
  console.log('\n--- Paso 1: Crear Archie Coach ---');

  const extractCode = readLogic('coach-extract-logic.js');
  const formatCode = readLogic('coach-format-logic.js');

  const workflow = {
    name: 'Archie Coach',
    nodes: [
      {
        parameters: {},
        id: 'coach-001', name: 'Execute Workflow Trigger',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1,
        position: [200, 300]
      },
      {
        parameters: { jsCode: extractCode, mode: 'runOnceForAllItems' },
        id: 'coach-002', name: 'Extract',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [400, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: DB_URL,
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $json.dbBody }}',
          options: {}
        },
        id: 'coach-003', name: 'DB Call',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [600, 300]
      },
      {
        parameters: { jsCode: formatCode, mode: 'runOnceForAllItems' },
        id: 'coach-004', name: 'Format',
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
        id: 'coach-005', name: 'Send Telegram',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [1000, 300],
        onError: 'continueRegularOutput'
      }
    ],
    connections: {
      'Execute Workflow Trigger': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
      'Extract': { main: [[{ node: 'DB Call', type: 'main', index: 0 }]] },
      'DB Call': { main: [[{ node: 'Format', type: 'main', index: 0 }]] },
      'Format': { main: [[{ node: 'Send Telegram', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const existing = (list.data || list).find(w => w.name === 'Archie Coach');

  let result;
  if (existing) {
    console.log('  Workflow existente (ID:', existing.id, '). Actualizando...');
    // Desactivar antes de actualizar
    await fetch(`${N8N_URL}/workflows/${existing.id}/deactivate`, {
      method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
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

  await fetch(`${N8N_URL}/workflows/${result.id}/activate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('  Archie Coach OK (ID:', result.id, ')');
  return result.id;
}

// ============================================================
// PASO 2: Crear workflow Archie Coach Reminder (cron)
// ============================================================
async function createReminderWorkflow() {
  console.log('\n--- Paso 2: Crear Archie Coach Reminder ---');

  const reminderCode = readLogic('coach-reminder-logic.js');

  const workflow = {
    name: 'Archie Coach Reminder',
    nodes: [
      {
        parameters: {
          rule: {
            interval: [
              { field: 'cronExpression', expression: '0 9,12,15,18,21 * * *' }
            ]
          }
        },
        id: 'reminder-001', name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2,
        position: [200, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: DB_URL,
          sendBody: true, specifyBody: 'json',
          jsonBody: JSON.stringify({ action: 'coach_get_users_today' }),
          options: {}
        },
        id: 'reminder-002', name: 'Get Reminders',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [400, 300]
      },
      {
        parameters: { jsCode: reminderCode, mode: 'runOnceForAllItems' },
        id: 'reminder-003', name: 'Format Reminders',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [600, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: '={{ $json.telegramUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $json.telegramBody }}',
          options: {}
        },
        id: 'reminder-004', name: 'Send Telegram',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [800, 300]
      }
    ],
    connections: {
      'Schedule Trigger': { main: [[{ node: 'Get Reminders', type: 'main', index: 0 }]] },
      'Get Reminders': { main: [[{ node: 'Format Reminders', type: 'main', index: 0 }]] },
      'Format Reminders': { main: [[{ node: 'Send Telegram', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const existing = (list.data || list).find(w => w.name === 'Archie Coach Reminder');

  let result;
  if (existing) {
    console.log('  Workflow existente (ID:', existing.id, '). Actualizando...');
    await fetch(`${N8N_URL}/workflows/${existing.id}/deactivate`, {
      method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
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

  await fetch(`${N8N_URL}/workflows/${result.id}/activate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('  Coach Reminder OK (ID:', result.id, ')');
  return result.id;
}

// ============================================================
// PASO 3: Actualizar Menu con boton Coach + routing
// ============================================================
async function updateMenu(coachWfId) {
  console.log('\n--- Paso 3: Actualizar Archie Bot - Menu ---');

  // Buscar SSL workflow ID
  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const sslWf = (list.data || list).find(w => w.name === 'Archie SSL Check');
  const sslWfId = sslWf ? sslWf.id : 'MISSING_SSL';

  if (!sslWf) {
    console.warn('  WARN: No se encontro Archie SSL Check. El boton SSL no funcionara.');
  }

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

  const prepSubWfCode = `
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
      // Prep Pendientes
      {
        parameters: { jsCode: prepSubWfCode, mode: 'runOnceForAllItems' },
        id: 'menu-006', name: 'Prep Pendientes',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1200, 160]
      },
      // Execute Pendientes
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: PENDIENTES_WF_ID }, options: {} },
        id: 'menu-007', name: 'Execute Pendientes',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1400, 160]
      },
      // Is SSL?
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
      // Prep SSL
      {
        parameters: { jsCode: prepSubWfCode, mode: 'runOnceForAllItems' },
        id: 'menu-009', name: 'Prep SSL',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1400, 360]
      },
      // Execute SSL
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: sslWfId }, options: {} },
        id: 'menu-010', name: 'Execute SSL',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1600, 360]
      },
      // Is Coach?
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r4', leftValue: '={{ $("Router").first().json.route }}', rightValue: 'coach', operator: { type: 'string', operation: 'equals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-014', name: 'Is Coach?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1400, 540]
      },
      // Prep Coach
      {
        parameters: { jsCode: prepSubWfCode, mode: 'runOnceForAllItems' },
        id: 'menu-015', name: 'Prep Coach',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1600, 480]
      },
      // Execute Coach
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: coachWfId }, options: {} },
        id: 'menu-016', name: 'Execute Coach',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1800, 480]
      },
      // Send Menu (fallback)
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
        position: [1600, 660]
      },
      // Has Callback?
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
        position: [2100, 480]
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
        position: [2300, 400]
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
        [{ node: 'Is Coach?', type: 'main', index: 0 }]
      ]},
      'Prep SSL': { main: [[{ node: 'Execute SSL', type: 'main', index: 0 }]] },
      'Execute SSL': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Is Coach?': { main: [
        [{ node: 'Prep Coach', type: 'main', index: 0 }],
        [{ node: 'Send Menu', type: 'main', index: 0 }]
      ]},
      'Prep Coach': { main: [[{ node: 'Execute Coach', type: 'main', index: 0 }]] },
      'Execute Coach': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Send Menu': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Has Callback?': { main: [
        [{ node: 'Answer Callback', type: 'main', index: 0 }],
        []
      ]}
    },
    settings: { executionOrder: 'v1' }
  };

  // Buscar workflow existente
  const list2Res = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list2 = await list2Res.json();
  const existing = (list2.data || list2).find(w => w.name === 'Archie Bot - Menu');

  let result;
  if (existing) {
    console.log('  Workflow existente (ID:', existing.id, '). Actualizando...');
    // Desactivar antes de actualizar
    await fetch(`${N8N_URL}/workflows/${existing.id}/deactivate`, {
      method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
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
  console.log('=== Setup: Modulo Coach para Archie Bot ===');

  // Paso 0: Base de datos
  await createDatabase();

  // Paso 1: Sub-workflow Coach
  const coachWfId = await createCoachWorkflow();
  if (!coachWfId) {
    console.error('\nFallo al crear Coach workflow. Abortando.');
    process.exit(1);
  }

  // Paso 2: Reminder workflow
  const reminderWfId = await createReminderWorkflow();
  if (!reminderWfId) {
    console.error('\nFallo al crear Reminder workflow. Abortando.');
    process.exit(1);
  }

  // Paso 3: Actualizar Menu
  const ok = await updateMenu(coachWfId);
  if (!ok) {
    console.error('\nFallo al actualizar Menu. Abortando.');
    process.exit(1);
  }

  console.log('\n=== Setup Coach completo ===');
  console.log('Coach (sub-workflow):', coachWfId);
  console.log('Coach Reminder (cron):', reminderWfId);
  console.log('Horarios: 9:00, 12:00, 15:00, 18:00, 21:00');
  console.log('\nProbalo en Telegram: menu \u2192 Coach');
  console.log('IMPORTANTE: Reinicia archie-db-server.js para que cargue el pool de coach');
}

main().catch(e => { console.error(e); process.exit(1); });
