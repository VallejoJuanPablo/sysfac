/**
 * Setup: Agrega modulo Nutricionista al bot de Telegram
 *
 * 1. Crea sub-workflow "Archie Nutricionista" (menu aleatorio de comidas)
 * 2. Actualiza "Archie Bot - Menu" (agrega boton Nutricionista + routing)
 *
 * Ejecutar: node scripts/setup-nutricionista-menu.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.bowin.com.ar/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiOGRlNGU4Ni1mMDY4LTQ4ZDMtOTcwNi1mMWYxNDYxZDg1YjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNTE1YTMxZWYtZTgzNC00M2RkLWEzM2EtYzBkZjRjYWM0YTE5IiwiaWF0IjoxNzg2MDY4MTI2fQ.q5SlhZA-8SsCNzUISD9CjCkzXktHEYK55DL2AWUSsVo';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const TELEGRAM_CRED_ID = '2hu4MTinNEcT2rCy';
const DB_URL = 'http://host.docker.internal:3456';
const PENDIENTES_WF_ID = 'ZBgC6QoXA6qDfpyk';

function readLogic(filename) {
  const raw = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  return raw.replace(/__BOT_TOKEN__/g, BOT_TOKEN);
}

// ============================================================
// PASO 1: Crear sub-workflow Archie Nutricionista
// ============================================================
async function createNutricionistaWorkflow() {
  console.log('\n--- Paso 1: Crear Archie Nutricionista ---');

  const extractCode = readLogic('nutricionista-extract-logic.js');
  const formatCode = readLogic('nutricionista-format-logic.js');

  const workflow = {
    name: 'Archie Nutricionista',
    nodes: [
      {
        parameters: {},
        id: 'nutri-001', name: 'Execute Workflow Trigger',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1,
        position: [200, 300]
      },
      {
        parameters: { jsCode: extractCode, mode: 'runOnceForAllItems' },
        id: 'nutri-002', name: 'Extract',
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
        id: 'nutri-003', name: 'DB Call',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [600, 300]
      },
      {
        parameters: { jsCode: formatCode, mode: 'runOnceForAllItems' },
        id: 'nutri-004', name: 'Format',
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
        id: 'nutri-005', name: 'Send Telegram',
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
  const existing = (list.data || list).find(w => w.name === 'Archie Nutricionista');

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

  console.log('  Archie Nutricionista OK (ID:', result.id, ')');
  return result.id;
}

// ============================================================
// PASO 2: Actualizar Menu con boton Nutricionista + routing
// ============================================================
async function updateMenu(nutriWfId) {
  console.log('\n--- Paso 2: Actualizar Archie Bot - Menu ---');

  // Buscar IDs de sub-workflows existentes
  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const workflows = list.data || list;

  const sslWf = workflows.find(w => w.name === 'Archie SSL Check');
  const coachWf = workflows.find(w => w.name === 'Archie Coach');
  const sslWfId = sslWf ? sslWf.id : 'MISSING_SSL';
  const coachWfId = coachWf ? coachWf.id : 'MISSING_COACH';

  if (!sslWf) console.warn('  WARN: No se encontro Archie SSL Check.');
  if (!coachWf) console.warn('  WARN: No se encontro Archie Coach.');

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
      // Is Nutri?
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r5', leftValue: '={{ $("Router").first().json.route }}', rightValue: 'nutri', operator: { type: 'string', operation: 'equals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-017', name: 'Is Nutri?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1600, 640]
      },
      // Prep Nutri
      {
        parameters: { jsCode: prepSubWfCode, mode: 'runOnceForAllItems' },
        id: 'menu-018', name: 'Prep Nutri',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1800, 580]
      },
      // Execute Nutri
      {
        parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: nutriWfId }, options: {} },
        id: 'menu-019', name: 'Execute Nutri',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [2000, 580]
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
        position: [1800, 760]
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
        position: [2300, 580]
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
        position: [2500, 500]
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
        [{ node: 'Is Nutri?', type: 'main', index: 0 }]
      ]},
      'Prep Coach': { main: [[{ node: 'Execute Coach', type: 'main', index: 0 }]] },
      'Execute Coach': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Is Nutri?': { main: [
        [{ node: 'Prep Nutri', type: 'main', index: 0 }],
        [{ node: 'Send Menu', type: 'main', index: 0 }]
      ]},
      'Prep Nutri': { main: [[{ node: 'Execute Nutri', type: 'main', index: 0 }]] },
      'Execute Nutri': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Send Menu': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Has Callback?': { main: [
        [{ node: 'Answer Callback', type: 'main', index: 0 }],
        []
      ]}
    },
    settings: { executionOrder: 'v1' }
  };

  // Buscar workflow existente
  const existing = workflows.find(w => w.name === 'Archie Bot - Menu');

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
    if (!putRes.ok) { console.error('  ERROR:', JSON.stringify(result, null, 2)); return false; }
  } else {
    console.error('  ERROR: No se encontro "Archie Bot - Menu". Ejecuta setup-bot-menu.js primero.');
    return false;
  }

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
  console.log('=== Setup: Modulo Nutricionista para Archie Bot ===');

  // Paso 1: Sub-workflow Nutricionista
  const nutriWfId = await createNutricionistaWorkflow();
  if (!nutriWfId) {
    console.error('\nFallo al crear Nutricionista workflow. Abortando.');
    process.exit(1);
  }

  // Paso 2: Actualizar Menu
  const ok = await updateMenu(nutriWfId);
  if (!ok) {
    console.error('\nFallo al actualizar Menu. Abortando.');
    process.exit(1);
  }

  console.log('\n=== Setup Nutricionista completo ===');
  console.log('Nutricionista (sub-workflow):', nutriWfId);
  console.log('\nProbalo en Telegram: menu > Nutricionista > Menu aleatorio');
}

main().catch(e => { console.error(e); process.exit(1); });
