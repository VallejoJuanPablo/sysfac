/**
 * Setup: Archie Bot - Menu + Pendientes Sub-Workflow
 *
 * 1. Actualiza "Archie Pendientes Bot": restaura logica original + cambia trigger a Execute Workflow Trigger
 * 2. Crea "Archie Bot - Menu": router con Telegram Trigger + botonera principal
 *
 * Ejecutar: node scripts/setup-bot-menu.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = 'http://localhost:5678/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODVkMTRiYi1jMTkwLTQ4NDUtODUwMy1lZGVkNDcxYmQxMmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTliYTI0OWYtOTgwZC00YmZhLWIwNmMtOTQ1NmE5MjJmOThkIiwiaWF0IjoxNzc4MDEwMDc5fQ.oyVl5aU-sJNV0bs_yj2qReQT_E2kNaHQKE0u26QldFY';
const BOT_TOKEN = '8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA';
const TELEGRAM_CRED_ID = '2hu4MTinNEcT2rCy';
const DB_URL = 'http://host.docker.internal:3456';
const PENDIENTES_WF_ID = 'ZBgC6QoXA6qDfpyk';

// --- Leer codigo de logica desde archivos ---
function readLogic(filename) {
  const raw = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  return raw.replace(/__BOT_TOKEN__/g, BOT_TOKEN);
}

// --- Extract code (compartido por ambos workflows) ---
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

// ============================================================
// PASO 1: Actualizar Pendientes → sub-workflow
// ============================================================
async function updatePendientes() {
  console.log('\n--- Paso 1: Actualizar Pendientes Bot ---');

  // Leer workflow actual
  const getRes = await fetch(`${N8N_URL}/workflows/${PENDIENTES_WF_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  const wf = await getRes.json();

  // Cambiar trigger: Telegram Trigger → Execute Workflow Trigger
  const triggerIdx = wf.nodes.findIndex(n => n.name === 'Telegram Trigger');
  if (triggerIdx !== -1) {
    wf.nodes[triggerIdx] = {
      parameters: {},
      id: wf.nodes[triggerIdx].id,
      name: 'Execute Workflow Trigger',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      typeVersion: 1,
      position: wf.nodes[triggerIdx].position
    };
    console.log('  Trigger cambiado a Execute Workflow Trigger');
  }

  // Restaurar logica original
  const logicNode = wf.nodes.find(n => n.name === 'Logic');
  if (logicNode) {
    logicNode.parameters.jsCode = readLogic('pendientes-logic.js');
    console.log('  Logic restaurada a version original');
  }

  // Actualizar conexiones: reemplazar 'Telegram Trigger' por 'Execute Workflow Trigger'
  if (wf.connections['Telegram Trigger']) {
    wf.connections['Execute Workflow Trigger'] = wf.connections['Telegram Trigger'];
    delete wf.connections['Telegram Trigger'];
    console.log('  Conexiones actualizadas');
  }

  // PUT
  const updateBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData
  };

  const putRes = await fetch(`${N8N_URL}/workflows/${PENDIENTES_WF_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
    body: JSON.stringify(updateBody)
  });
  const result = await putRes.json();
  if (!putRes.ok) {
    console.error('  ERROR:', JSON.stringify(result, null, 2));
    return false;
  }

  // Activar
  await fetch(`${N8N_URL}/workflows/${PENDIENTES_WF_ID}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  console.log('  Pendientes Bot actualizado OK (ID:', result.id, ')');
  return true;
}

// ============================================================
// PASO 2: Crear Menu workflow
// ============================================================
async function createMenu() {
  console.log('\n--- Paso 2: Crear Archie Bot - Menu ---');

  const routerCode = readLogic('menu-router-logic.js');

  const prepInputCode = `
const router = $('Router').first().json;
const input = JSON.parse(router.subWfInput);
return [{ json: input }];
`;

  const workflow = {
    name: 'Archie Bot - Menu',
    nodes: [
      {
        parameters: { updates: ['message', 'callback_query'] },
        id: 'menu-001', name: 'Telegram Trigger',
        type: 'n8n-nodes-base.telegramTrigger', typeVersion: 1.1,
        position: [200, 300],
        credentials: { telegramApi: { id: TELEGRAM_CRED_ID, name: 'Telegram account' } }
      },
      {
        parameters: { jsCode: extractCode, mode: 'runOnceForAllItems' },
        id: 'menu-002', name: 'Extract',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [400, 300]
      },
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
      {
        parameters: { jsCode: routerCode, mode: 'runOnceForAllItems' },
        id: 'menu-004', name: 'Router',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [800, 300]
      },
      // IF: route === 'pendientes'
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
      // TRUE: preparar input para sub-workflow
      {
        parameters: { jsCode: prepInputCode, mode: 'runOnceForAllItems' },
        id: 'menu-006', name: 'Prep Input',
        type: 'n8n-nodes-base.code', typeVersion: 2,
        position: [1200, 180]
      },
      // Execute sub-workflow Pendientes
      {
        parameters: {
          source: 'database',
          workflowId: { __rl: true, mode: 'id', value: PENDIENTES_WF_ID },
          options: {}
        },
        id: 'menu-007', name: 'Execute Pendientes',
        type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.1,
        position: [1400, 180]
      },
      // FALSE: enviar menu por Telegram
      {
        parameters: {
          method: 'POST',
          url: '={{ $("Router").first().json.telegramUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $("Router").first().json.telegramBody }}',
          options: {}
        },
        id: 'menu-008', name: 'Send Menu',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [1200, 440]
      },
      // Merge: tiene callback del menu que contestar?
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: 'r2', leftValue: '={{ $("Router").first().json.answerCallbackUrl }}', rightValue: '', operator: { type: 'string', operation: 'notEquals' } }],
            combinator: 'and'
          }, options: {}
        },
        id: 'menu-009', name: 'Has Callback?',
        type: 'n8n-nodes-base.if', typeVersion: 2.2,
        position: [1600, 300]
      },
      // Answer callback
      {
        parameters: {
          method: 'POST',
          url: '={{ $("Router").first().json.answerCallbackUrl }}',
          sendBody: true, specifyBody: 'json',
          jsonBody: '={{ $("Router").first().json.answerCallbackBody }}',
          options: {}
        },
        id: 'menu-010', name: 'Answer Callback',
        type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
        position: [1800, 200]
      }
    ],
    connections: {
      'Telegram Trigger': { main: [[{ node: 'Extract', type: 'main', index: 0 }]] },
      'Extract': { main: [[{ node: 'Read DB', type: 'main', index: 0 }]] },
      'Read DB': { main: [[{ node: 'Router', type: 'main', index: 0 }]] },
      'Router': { main: [[{ node: 'Is Pendientes?', type: 'main', index: 0 }]] },
      'Is Pendientes?': { main: [
        [{ node: 'Prep Input', type: 'main', index: 0 }],
        [{ node: 'Send Menu', type: 'main', index: 0 }]
      ]},
      'Prep Input': { main: [[{ node: 'Execute Pendientes', type: 'main', index: 0 }]] },
      'Execute Pendientes': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Send Menu': { main: [[{ node: 'Has Callback?', type: 'main', index: 0 }]] },
      'Has Callback?': { main: [
        [{ node: 'Answer Callback', type: 'main', index: 0 }],
        []
      ]}
    },
    settings: { executionOrder: 'v1' }
  };

  // Verificar si ya existe un workflow con este nombre
  const listRes = await fetch(`${N8N_URL}/workflows`, {
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  const list = await listRes.json();
  const existing = (list.data || list).find(w => w.name === 'Archie Bot - Menu');

  let result;
  if (existing) {
    // Actualizar existente
    console.log('  Workflow existente encontrado (ID:', existing.id, '). Actualizando...');
    const putRes = await fetch(`${N8N_URL}/workflows/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
      body: JSON.stringify(workflow)
    });
    result = await putRes.json();
    if (!putRes.ok) {
      console.error('  ERROR:', JSON.stringify(result, null, 2));
      return null;
    }
  } else {
    // Crear nuevo
    const postRes = await fetch(`${N8N_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
      body: JSON.stringify(workflow)
    });
    result = await postRes.json();
    if (!postRes.ok) {
      console.error('  ERROR:', JSON.stringify(result, null, 2));
      return null;
    }
  }

  // Activar
  const activateRes = await fetch(`${N8N_URL}/workflows/${result.id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  if (!activateRes.ok) {
    console.log('  Nota: no se pudo activar automaticamente. Activalo manualmente en n8n.');
  }

  console.log('  Menu workflow OK (ID:', result.id, ')');
  console.log('  URL: http://localhost:5678/workflow/' + result.id);
  return result.id;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== Setup Archie Bot: Menu + Pendientes ===');

  const ok1 = await updatePendientes();
  if (!ok1) {
    console.error('\nFallo al actualizar Pendientes. Abortando.');
    process.exit(1);
  }

  const menuId = await createMenu();
  if (!menuId) {
    console.error('\nFallo al crear Menu. Abortando.');
    process.exit(1);
  }

  console.log('\n=== Setup completo ===');
  console.log('Pendientes Bot (sub-workflow):', PENDIENTES_WF_ID);
  console.log('Menu Bot (router):', menuId);
  console.log('\nProbalo en Telegram: mandale cualquier mensaje al bot.');
}

main().catch(e => { console.error(e); process.exit(1); });
