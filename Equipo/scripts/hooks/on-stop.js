#!/usr/bin/env node
// Hook on-stop: Se ejecuta cada vez que Claude termina de responder
// Registra última actividad (proyecto, timestamp, modelo)

const fs = require('fs');
const path = require('path');

const EQUIPO_DIR = path.resolve(__dirname, '../../');
const CHECKPOINTS_DIR = path.join(EQUIPO_DIR, 'registro', 'checkpoints');

// Asegurar que existe el directorio de checkpoints
if (!fs.existsSync(CHECKPOINTS_DIR)) {
  fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
}

// Consumir stdin para evitar EPIPE
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    let data = {};
    if (input.trim()) {
      data = JSON.parse(input);
    }

    // Registrar timestamp de última actividad
    const activityFile = path.join(EQUIPO_DIR, 'registro', 'last-activity.json');
    const cwd = data.cwd || data.workspace?.current_dir || process.cwd();
    const projectName = cwd.split(/[/\\]/).filter(Boolean).pop() || 'Equipo';

    const activity = {
      timestamp: new Date().toISOString(),
      project: projectName,
      cwd: cwd,
      model: data.model || 'unknown'
    };

    fs.writeFileSync(activityFile, JSON.stringify(activity, null, 2));
  } catch {
    // Silenciar errores — el hook no debe interrumpir el flujo
  }

  process.exit(0);
});

// Timeout: si stdin no cierra en 5s, salir igual
setTimeout(() => process.exit(0), 5000);
