/**
 * Micro-servidor HTTP para base de datos del equipo Archie.
 * Version dockerizada — usa variables de entorno para conexion.
 *
 * Puerto: 3456
 */

const http = require('http');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3456;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'archie-mysql',
  user: process.env.DB_USER || 'archie',
  password: process.env.DB_PASSWORD || '',
  database: 'archie_team',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

const coachPool = mysql.createPool({
  host: process.env.DB_HOST || 'archie-mysql',
  user: process.env.DB_USER || 'archie',
  password: process.env.DB_PASSWORD || '',
  database: 'coach',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

const nutriPool = mysql.createPool({
  host: process.env.DB_HOST || 'archie-mysql',
  user: process.env.DB_USER || 'archie',
  password: process.env.DB_PASSWORD || '',
  database: 'nutricionista',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

async function handleAction(body) {
  const { action } = body;

  switch (action) {
    case 'read_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const [stateRows] = await pool.query('SELECT step, proyecto_id, titulo, IFNULL(descripcion,"") AS descripcion FROM chat_states WHERE chat_id = ?', [chatId]);
      const [projRows] = await pool.query('SELECT id, codigo, nombre FROM proyectos ORDER BY nombre');
      return {
        state: stateRows[0] || null,
        projects: projRows
      };
    }

    case 'save_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const projId = parseInt(body.proyecto_id) || 0;
      const step = body.step || '';
      await pool.query('REPLACE INTO chat_states (chat_id, proyecto_id, step) VALUES (?, ?, ?)', [chatId, projId, step]);
      return { ok: true };
    }

    case 'update_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const sets = [];
      const vals = [];
      if (body.titulo !== undefined) { sets.push('titulo = ?'); vals.push(body.titulo); }
      if (body.descripcion !== undefined) { sets.push('descripcion = ?'); vals.push(body.descripcion); }
      if (body.step !== undefined) { sets.push('step = ?'); vals.push(body.step); }
      if (sets.length > 0) {
        vals.push(chatId);
        await pool.query(`UPDATE chat_states SET ${sets.join(', ')} WHERE chat_id = ?`, vals);
      }
      return { ok: true };
    }

    case 'insert_pendiente': {
      const projId = parseInt(body.proyecto_id) || 0;
      const titulo = body.titulo || '';
      const descripcion = body.descripcion || '';
      const tipo = body.tipo || 'spec';
      const prioridad = body.prioridad || 'media';
      const fuente = body.fuente || 'telegram';
      const chatId = parseInt(body.chat_id) || 0;

      const [result] = await pool.query(
        'INSERT INTO pendientes (proyecto_id, titulo, descripcion, tipo, prioridad, fuente) VALUES (?, ?, ?, ?, ?, ?)',
        [projId, titulo, descripcion, tipo, prioridad, fuente]
      );
      if (chatId) {
        await pool.query('DELETE FROM chat_states WHERE chat_id = ?', [chatId]);
      }
      return { ok: true, id: result.insertId };
    }

    case 'delete_state': {
      const chatId = parseInt(body.chat_id) || 0;
      await pool.query('DELETE FROM chat_states WHERE chat_id = ?', [chatId]);
      return { ok: true };
    }

    // ---- Coach ----
    case 'coach_panel': {
      const chatId = parseInt(body.chat_id) || 0;
      await coachPool.query('INSERT IGNORE INTO coach_users (chat_id) VALUES (?)', [chatId]);
      const [rows] = await coachPool.query(
        'SELECT ejercicio FROM coach_log WHERE chat_id = ? AND fecha = CURDATE()',
        [chatId]
      );
      return { done: rows.map(r => r.ejercicio) };
    }

    case 'coach_toggle': {
      const chatId = parseInt(body.chat_id) || 0;
      const ejercicio = body.ejercicio || '';
      const [existing] = await coachPool.query(
        'SELECT id FROM coach_log WHERE chat_id = ? AND ejercicio = ? AND fecha = CURDATE()',
        [chatId, ejercicio]
      );
      if (existing.length > 0) {
        await coachPool.query('DELETE FROM coach_log WHERE id = ?', [existing[0].id]);
      } else {
        await coachPool.query(
          'INSERT INTO coach_log (chat_id, ejercicio, fecha) VALUES (?, ?, CURDATE())',
          [chatId, ejercicio]
        );
      }
      const [rows] = await coachPool.query(
        'SELECT ejercicio FROM coach_log WHERE chat_id = ? AND fecha = CURDATE()',
        [chatId]
      );
      return { done: rows.map(r => r.ejercicio) };
    }

    case 'coach_summary': {
      const chatId = parseInt(body.chat_id) || 0;
      const [rows] = await coachPool.query(
        `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, GROUP_CONCAT(ejercicio) as ejercicios
         FROM coach_log
         WHERE chat_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY fecha ORDER BY fecha`,
        [chatId]
      );
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const fecha = d.toISOString().split('T')[0];
        const row = rows.find(r => r.fecha === fecha);
        days.push({
          fecha: fecha,
          ejercicios: row ? row.ejercicios.split(',') : []
        });
      }
      return { days };
    }

    case 'coach_get_users_today': {
      const [rows] = await coachPool.query(
        `SELECT u.chat_id, GROUP_CONCAT(l.ejercicio) as ejercicios
         FROM coach_users u
         LEFT JOIN coach_log l ON u.chat_id = l.chat_id AND l.fecha = CURDATE()
         GROUP BY u.chat_id`
      );
      const reminders = rows.map(r => ({
        chat_id: r.chat_id,
        done: r.ejercicios ? r.ejercicios.split(',') : []
      }));
      return { reminders };
    }

    // ---- Nutricionista ----
    case 'nutri_random_menu': {
      const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const dia = dias[Math.floor(Math.random() * dias.length)];
      const [rows] = await nutriPool.query(
        'SELECT dia, comida, descripcion FROM nutri_menus WHERE dia = ? ORDER BY FIELD(comida, "desayuno","almuerzo","almuerzo_alt","merienda","cena","cena_alt")',
        [dia]
      );
      return { dia, menus: rows };
    }

    case 'nutri_day_menu': {
      const dia = (body.dia || '').toLowerCase();
      const [rows] = await nutriPool.query(
        'SELECT dia, comida, descripcion FROM nutri_menus WHERE dia = ? ORDER BY FIELD(comida, "desayuno","almuerzo","almuerzo_alt","merienda","cena","cena_alt")',
        [dia]
      );
      return { dia, menus: rows };
    }

    case 'nutri_list_dias': {
      const [rows] = await nutriPool.query(
        'SELECT DISTINCT dia FROM nutri_menus ORDER BY FIELD(dia, "lunes","martes","miercoles","jueves","viernes","sabado")'
      );
      return { dias: rows.map(r => r.dia) };
    }

    case 'nutri_seed': {
      // Crear tabla y seedear datos (para deploy sin recrear container)
      const conn = await nutriPool.getConnection();
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS nutri_menus (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dia VARCHAR(20) NOT NULL,
            comida VARCHAR(30) NOT NULL,
            descripcion TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_dia_comida (dia, comida)
          )
        `);
        await conn.query('TRUNCATE TABLE nutri_menus');
        const menus = [
          ['lunes', 'desayuno', 'Te o cafe con 250 ml de leche descremada + omelette de 2 huevos + tostada + 1 banana'],
          ['lunes', 'almuerzo', '200 g pechuga de pollo + ensalada de tomate, cebolla y morron + 5 cucharadas soperas de arroz cocido'],
          ['lunes', 'almuerzo_alt', '200 g de pescado blanco (como merluza o boga) al horno + ensalada de zanahoria rallada y rucula + 5 cucharadas soperas de quinoa o trigo burgol'],
          ['lunes', 'merienda', '200 g de yogur descremado + 1 manzana'],
          ['lunes', 'cena', '200 g carne magra + zapallo y zapallito al horno + acelga salteada'],
          ['lunes', 'cena_alt', '200 g de pechuga de pavo (o pollo) a la plancha + pure de calabaza + brocoli al vapor'],
          ['martes', 'desayuno', 'Te con leche + 200 g yogur descremado + 1 naranja'],
          ['martes', 'almuerzo', '200 g lomo de cerdo + 200 g papa hervida + ensalada de tomate'],
          ['martes', 'almuerzo_alt', '200 g de pechuga de pollo + 200 g de batata al horno (o mandioca) + ensalada de lechuga y pepino'],
          ['martes', 'merienda', '2 huevos duros + 1 banana'],
          ['martes', 'cena', '200 g atun al natural + ensalada de espinaca, cebolla y tomate'],
          ['martes', 'cena_alt', '200 g de filet de merluza al limon + ensalada de chauchas, zanahoria y huevo (solo claras)'],
          ['miercoles', 'desayuno', 'Cafe con leche + revuelto de 2 huevos + tostada'],
          ['miercoles', 'almuerzo', '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de tomate y morron'],
          ['miercoles', 'almuerzo_alt', '200 g de lomo de cerdo + 6 cucharadas de garbanzos cocidos + ensalada de repollo blanco y morron'],
          ['miercoles', 'merienda', 'Yogur descremado + 1 manzana'],
          ['miercoles', 'cena', '200 g pollo + zapallo asado + zapallitos salteados'],
          ['miercoles', 'cena_alt', '200 g de carne magra (nalga o peceto) + berenjenas y morrones asados al horno'],
          ['jueves', 'desayuno', 'Te con leche + omelette con espinaca + 1 naranja'],
          ['jueves', 'almuerzo', '200 g pollo + 60 g de fideos secos (aprox 1 1/2 taza cocidos) + salsa de tomate casera con cebolla'],
          ['jueves', 'almuerzo_alt', '200 g de carne picada magra (albondigas al horno) + 60 g de fideos integrales o monitos + salsa de tomate natural'],
          ['jueves', 'merienda', 'Yogur descremado + 1 banana'],
          ['jueves', 'cena', '200 g carne magra + ensalada de tomate, cebolla y acelga'],
          ['jueves', 'cena_alt', '200 g de lomo de cerdo + ensalada de rucula, tomates cherry y champinones frescos'],
          ['viernes', 'desayuno', 'Cafe con leche + 2 huevos + 1 manzana + tostada'],
          ['viernes', 'almuerzo', '200 g atun + 5 cucharadas de arroz cocido + ensalada de tomate y morron'],
          ['viernes', 'almuerzo_alt', '200 g de pollo desmenuzado + 5 cucharadas de choclo en grano + ensalada de apio y manzana verde'],
          ['viernes', 'merienda', 'Yogur + 1 naranja'],
          ['viernes', 'cena', '200 g lomo de cerdo + zapallo al horno + espinaca salteada'],
          ['viernes', 'cena_alt', '200 g de pescado (filet) a las finas hierbas + coliflor al horno + acelga salteada con ajo'],
          ['sabado', 'desayuno', 'Cafe con leche + revuelto de 2 huevos + tostada'],
          ['sabado', 'almuerzo', '200 g pollo + 200 g papa hervida + ensalada de tomate y cebolla'],
          ['sabado', 'almuerzo_alt', '200 g de carne magra (cuadril) al plato + 200 g de mandioca o batata hervida + ensalada de repollo colorado y zanahoria'],
          ['sabado', 'merienda', 'Yogur descremado + 1 manzana'],
          ['sabado', 'cena', '200 g carne magra + 6 cucharadas de lentejas cocidas + ensalada de espinaca'],
          ['sabado', 'cena_alt', '200 g de pechuga de pollo + 6 cucharadas de arvejas o porotos alubia + ensalada caprese (tomate y albahaca fresca)']
        ];
        for (const row of menus) {
          await conn.query('INSERT INTO nutri_menus (dia, comida, descripcion) VALUES (?, ?, ?)', row);
        }
        return { ok: true, inserted: menus.length };
      } finally {
        conn.release();
      }
    }

    default:
      return { error: 'Unknown action: ' + action };
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', async () => {
    try {
      const body = JSON.parse(data);
      const result = await handleAction(body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Archie DB Server corriendo en http://localhost:${PORT}`);
});
