#!/usr/bin/env node
// Hook auto-memory: Persiste contexto del proyecto automáticamente
// Se ejecuta como parte del hook Stop para verificar cambios pendientes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EQUIPO_DIR = path.resolve(__dirname, '../../');

// Consumir stdin para evitar EPIPE (Claude Code envía datos por stdin)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    run();
  } catch {
    // Silenciar — no interrumpir
  }
  process.exit(0);
});

// Timeout: si stdin no cierra en 5s, salir igual
setTimeout(() => process.exit(0), 5000);

function getProjectDirs() {
  const proyectosFile = path.join(EQUIPO_DIR, 'registro', 'proyectos.md');
  if (!fs.existsSync(proyectosFile)) return [];

  const content = fs.readFileSync(proyectosFile, 'utf8');
  const lines = content.split('\n').filter(l =>
    l.startsWith('|') && !l.includes('---') && !l.includes('Ruta') && !l.includes('Proyecto')
  );

  return lines.map(line => {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      const ruta = cols[2]; // Columna "Ruta"
      return path.resolve(EQUIPO_DIR, ruta);
    }
    return null;
  }).filter(Boolean);
}

function gitCmd(cmd, dir) {
  try {
    return execSync(cmd, {
      cwd: dir,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'] // Capturar stderr para no mostrarlo
    }).trim();
  } catch {
    return null;
  }
}

function checkGitStatus(dir) {
  const status = gitCmd('git status --porcelain', dir);
  if (status === null) return null;

  const branch = gitCmd('git branch --show-current', dir) || '';
  const lastCommit = gitCmd('git log -1 --format="%h %s"', dir) || '';

  return {
    dirty: status.length > 0,
    changedFiles: status.split('\n').filter(Boolean).length,
    branch,
    lastCommit
  };
}

function run() {
  const dirs = getProjectDirs();
  const pendingChanges = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const git = checkGitStatus(dir);
    if (git && git.dirty) {
      pendingChanges.push({
        project: path.basename(dir),
        branch: git.branch,
        changedFiles: git.changedFiles,
        lastCommit: git.lastCommit
      });
    }
  }

  // Guardar estado de cambios pendientes
  const pendingFile = path.join(EQUIPO_DIR, 'registro', 'pending-changes.json');
  fs.writeFileSync(pendingFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    projects_with_changes: pendingChanges
  }, null, 2));
}
