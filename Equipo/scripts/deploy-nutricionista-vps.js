/**
 * Deploy remoto: Modulo Nutricionista en VPS via n8n SSH
 *
 * 1. Crea un workflow temporal con webhook trigger + SSH nodes
 * 2. Lo activa y dispara via HTTP
 * 3. Espera resultado
 * 4. Limpia el workflow temporal
 *
 * El workflow SSH:
 *   a) Crea la DB nutricionista en MySQL (docker exec)
 *   b) Seedea los 36 menus
 *   c) Actualiza archie-db-server.js con nutriPool + acciones
 *   d) Rebuild del container archie-db
 *
 * Ejecutar: node scripts/deploy-nutricionista-vps.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.bowin.com.ar/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiOGRlNGU4Ni1mMDY4LTQ4ZDMtOTcwNi1mMWYxNDYxZDg1YjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNTE1YTMxZWYtZTgzNC00M2RkLWEzM2EtYzBkZjRjYWM0YTE5IiwiaWF0IjoxNzg2MDY4MTI2fQ.q5SlhZA-8SsCNzUISD9CjCkzXktHEYK55DL2AWUSsVo';
const N8N_WEBHOOK_BASE = 'https://n8n.bowin.com.ar';
const SSH_CRED_ID = 'nBRqAMF3Vl4LjNDD';

// Read the updated server.js and base64 encode it
const serverJs = fs.readFileSync(path.join(__dirname, '..', 'deploy', 'archie-db', 'archie-db-server.js'), 'utf8');
const serverJsB64 = Buffer.from(serverJs).toString('base64');

// SQL to create database, table, and seed data
const setupSQL = `
CREATE DATABASE IF NOT EXISTS nutricionista CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutricionista;
CREATE TABLE IF NOT EXISTS nutri_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dia VARCHAR(20) NOT NULL,
  comida VARCHAR(30) NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dia_comida (dia, comida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
TRUNCATE TABLE nutri_menus;
INSERT INTO nutri_menus (dia, comida, descripcion) VALUES
('lunes','desayuno','Te o cafe con 250 ml de leche descremada + omelette de 2 huevos + tostada + 1 banana'),
('lunes','almuerzo','200 g pechuga de pollo + ensalada de tomate, cebolla y morron + 5 cucharadas soperas de arroz cocido'),
('lunes','almuerzo_alt','200 g de pescado blanco (como merluza o boga) al horno + ensalada de zanahoria rallada y rucula + 5 cucharadas soperas de quinoa o trigo burgol'),
('lunes','merienda','200 g de yogur descremado + 1 manzana'),
('lunes','cena','200 g carne magra + zapallo y zapallito al horno + acelga salteada'),
('lunes','cena_alt','200 g de pechuga de pavo (o pollo) a la plancha + pure de calabaza + brocoli al vapor'),
('martes','desayuno','Te con leche + 200 g yogur descremado + 1 naranja'),
('martes','almuerzo','200 g lomo de cerdo + 200 g papa hervida + ensalada de tomate'),
('martes','almuerzo_alt','200 g de pechuga de pollo + 200 g de batata al horno (o mandioca) + ensalada de lechuga y pepino'),
('martes','merienda','2 huevos duros + 1 banana'),
('martes','cena','200 g atun al natural + ensalada de espinaca, cebolla y tomate'),
('martes','cena_alt','200 g de filet de merluza al limon + ensalada de chauchas, zanahoria y huevo (solo claras)'),
('miercoles','desayuno','Cafe con leche + revuelto de 2 huevos + tostada'),
('miercoles','almuerzo','200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de tomate y morron'),
('miercoles','almuerzo_alt','200 g de lomo de cerdo + 6 cucharadas de garbanzos cocidos + ensalada de repollo blanco y morron'),
('miercoles','merienda','Yogur descremado + 1 manzana'),
('miercoles','cena','200 g pollo + zapallo asado + zapallitos salteados'),
('miercoles','cena_alt','200 g de carne magra (nalga o peceto) + berenjenas y morrones asados al horno'),
('jueves','desayuno','Te con leche + omelette con espinaca + 1 naranja'),
('jueves','almuerzo','200 g pollo + 60 g de fideos secos (aprox 1 1/2 taza cocidos) + salsa de tomate casera con cebolla'),
('jueves','almuerzo_alt','200 g de carne picada magra (albondigas al horno) + 60 g de fideos integrales o monitos + salsa de tomate natural'),
('jueves','merienda','Yogur descremado + 1 banana'),
('jueves','cena','200 g carne magra + ensalada de tomate, cebolla y acelga'),
('jueves','cena_alt','200 g de lomo de cerdo + ensalada de rucula, tomates cherry y champinones frescos'),
('viernes','desayuno','Cafe con leche + 2 huevos + 1 manzana + tostada'),
('viernes','almuerzo','200 g atun + 5 cucharadas de arroz cocido + ensalada de tomate y morron'),
('viernes','almuerzo_alt','200 g de pollo desmenuzado + 5 cucharadas de choclo en grano + ensalada de apio y manzana verde'),
('viernes','merienda','Yogur + 1 naranja'),
('viernes','cena','200 g lomo de cerdo + zapallo al horno + espinaca salteada'),
('viernes','cena_alt','200 g de pescado (filet) a las finas hierbas + coliflor al horno + acelga salteada con ajo'),
('sabado','desayuno','Cafe con leche + revuelto de 2 huevos + tostada'),
('sabado','almuerzo','200 g pollo + 200 g papa hervida + ensalada de tomate y cebolla'),
('sabado','almuerzo_alt','200 g de carne magra (cuadril) al plato + 200 g de mandioca o batata hervida + ensalada de repollo colorado y zanahoria'),
('sabado','merienda','Yogur descremado + 1 manzana'),
('sabado','cena','200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de espinaca'),
('sabado','cena_alt','200 g de pechuga de pollo + 6 cucharadas de arvejas o porotos alubia + ensalada caprese (tomate y albahaca fresca)');
`.trim();

// SSH Command 1: Create DB + Grant + Seed
const sshCmd1 = `cat > /tmp/nutri-setup.sql << 'SQLEOF'
${setupSQL}
SQLEOF
docker cp /tmp/nutri-setup.sql archie-mysql:/tmp/nutri-setup.sql
docker exec archie-mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" < /tmp/nutri-setup.sql && echo "SQL OK"'
docker exec archie-mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON nutricionista.* TO \\"\\'\\$MYSQL_USER\\'\\""@\\"%\\"; FLUSH PRIVILEGES;" 2>/dev/null || true'
docker exec archie-mysql rm -f /tmp/nutri-setup.sql
rm -f /tmp/nutri-setup.sql
echo "STEP1_DONE"`;

// SSH Command 2: Update server.js via base64
const sshCmd2 = `echo '${serverJsB64}' | base64 -d > /opt/docker/n8n/db-server/server.js
echo "STEP2_DONE"`;

// SSH Command 3: Rebuild archie-db container
const sshCmd3 = `cd /opt/docker/n8n && docker compose build archie-db 2>&1 && docker compose up -d archie-db 2>&1
echo "STEP3_DONE"`;

const sshCred = { sshPassword: { id: SSH_CRED_ID, name: 'SSH Password account 2' } };

const workflow = {
  name: 'TEMP - Deploy Nutricionista',
  nodes: [
    {
      parameters: { path: 'deploy-nutri', httpMethod: 'GET', responseMode: 'lastNode', options: {} },
      id: 'deploy-001', name: 'Webhook',
      type: 'n8n-nodes-base.webhook', typeVersion: 2,
      position: [200, 300], webhookId: 'deploy-nutri'
    },
    {
      parameters: { command: sshCmd1 },
      id: 'deploy-002', name: 'Setup DB',
      type: 'n8n-nodes-base.ssh', typeVersion: 1,
      position: [420, 300],
      credentials: sshCred
    },
    {
      parameters: { command: sshCmd2 },
      id: 'deploy-003', name: 'Update Server',
      type: 'n8n-nodes-base.ssh', typeVersion: 1,
      position: [640, 300],
      credentials: sshCred
    },
    {
      parameters: { command: sshCmd3 },
      id: 'deploy-004', name: 'Rebuild Container',
      type: 'n8n-nodes-base.ssh', typeVersion: 1,
      position: [860, 300],
      credentials: sshCred
    }
  ],
  connections: {
    'Webhook': { main: [[{ node: 'Setup DB', type: 'main', index: 0 }]] },
    'Setup DB': { main: [[{ node: 'Update Server', type: 'main', index: 0 }]] },
    'Update Server': { main: [[{ node: 'Rebuild Container', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' }
};

async function main() {
  console.log('=== Deploy Nutricionista via n8n SSH ===\n');

  // 1. Check if temp workflow exists and delete it
  console.log('1. Limpiando workflows temporales...');
  const listRes = await fetch(`${N8N_URL}/workflows`, { headers: { 'X-N8N-API-KEY': N8N_KEY } });
  const list = await listRes.json();
  const wfs = list.data || list;
  const existing = Array.isArray(wfs) ? wfs.find(w => w.name === 'TEMP - Deploy Nutricionista') : null;
  if (existing) {
    await fetch(`${N8N_URL}/workflows/${existing.id}/deactivate`, {
      method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
    await fetch(`${N8N_URL}/workflows/${existing.id}`, {
      method: 'DELETE', headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
    console.log('  Workflow anterior eliminado');
  }

  // 2. Create workflow
  console.log('2. Creando workflow de deploy...');
  const createRes = await fetch(`${N8N_URL}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_KEY },
    body: JSON.stringify(workflow)
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    console.error('  ERROR creando workflow:', JSON.stringify(created, null, 2));
    process.exit(1);
  }
  const wfId = created.id;
  console.log('  Workflow creado (ID:', wfId, ')');

  // 3. Activate it
  console.log('3. Activando workflow...');
  await fetch(`${N8N_URL}/workflows/${wfId}/activate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });

  // 4. Trigger webhook
  console.log('4. Ejecutando deploy (esto puede tomar ~60s)...');
  const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook/deploy-nutri`;
  try {
    const triggerRes = await fetch(webhookUrl, { signal: AbortSignal.timeout(120000) });
    const result = await triggerRes.json();
    console.log('\n  Resultado:', JSON.stringify(result, null, 2));
  } catch (e) {
    if (e.name === 'TimeoutError') {
      console.log('  Timeout esperando respuesta (el deploy puede seguir en background)');
    } else {
      console.error('  Error:', e.message);
    }
  }

  // 5. Cleanup
  console.log('\n5. Limpiando workflow temporal...');
  await fetch(`${N8N_URL}/workflows/${wfId}/deactivate`, {
    method: 'POST', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  await fetch(`${N8N_URL}/workflows/${wfId}`, {
    method: 'DELETE', headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  console.log('  Workflow temporal eliminado');

  console.log('\n=== Deploy completado ===');
  console.log('Verificar en Telegram: Menu > Nutricionista > Menu aleatorio');
}

main().catch(e => { console.error(e); process.exit(1); });
