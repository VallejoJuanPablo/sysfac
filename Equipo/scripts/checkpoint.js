#!/usr/bin/env node
// Checkpoint Manager: Guarda snapshot del estado de un proyecto antes de merge/deploy
// Uso: node scripts/checkpoint.js <ruta-proyecto> [motivo]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EQUIPO_DIR = path.resolve(__dirname, '../');
const CHECKPOINTS_DIR = path.join(EQUIPO_DIR, 'registro/checkpoints');

function main() {
  const projectPath = process.argv[2];
  const reason = process.argv[3] || 'checkpoint manual';

  if (!projectPath) {
    console.log('Uso: node scripts/checkpoint.js <ruta-proyecto> [motivo]');
    process.exit(1);
  }

  const fullPath = path.resolve(EQUIPO_DIR, projectPath);
  const projectName = path.basename(fullPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: No existe ${fullPath}`);
    process.exit(1);
  }

  // Leer archie-context.md si existe
  const contextFile = path.join(fullPath, 'docs/archie-context.md');
  let context = 'Sin archie-context.md';
  if (fs.existsSync(contextFile)) {
    context = fs.readFileSync(contextFile, 'utf8');
  }

  // Obtener estado git
  let gitInfo = 'No es repo git';
  try {
    const branch = execSync('git branch --show-current', { cwd: fullPath, encoding: 'utf8' }).trim();
    const log = execSync('git log -5 --oneline', { cwd: fullPath, encoding: 'utf8' }).trim();
    const status = execSync('git status --short', { cwd: fullPath, encoding: 'utf8' }).trim();
    gitInfo = `Branch: ${branch}\n\nÚltimos commits:\n${log}\n\nArchivos modificados:\n${status || '(limpio)'}`;
  } catch { /* no git */ }

  // Generar checkpoint
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const filename = `${ts}-${projectName}.md`;

  const checkpoint = `# Checkpoint — ${projectName}

**Fecha:** ${now.toISOString()}
**Motivo:** ${reason}

## Estado Git
${gitInfo}

## Contexto Operativo
${context}
`;

  // Asegurar directorio
  if (!fs.existsSync(CHECKPOINTS_DIR)) {
    fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
  }

  const filePath = path.join(CHECKPOINTS_DIR, filename);
  fs.writeFileSync(filePath, checkpoint);
  console.log(`Checkpoint guardado: ${filePath}`);

  // Limpiar checkpoints viejos (mantener últimos 20)
  const files = fs.readdirSync(CHECKPOINTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  if (files.length > 20) {
    files.slice(20).forEach(f => {
      fs.unlinkSync(path.join(CHECKPOINTS_DIR, f));
    });
    console.log(`Limpiados ${files.length - 20} checkpoints antiguos`);
  }
}

main();
