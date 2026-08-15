#!/usr/bin/env node
// Hook pre-bash: Valida que no se haga commit en ramas protegidas
// Se ejecuta antes de cada comando bash vía Claude Code hooks

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Leer input del hook (viene por stdin en formato JSON)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = data.tool_input?.command || '';

    // Solo verificar si el comando es git commit o git merge
    if (!command.match(/git\s+(commit|merge)/i)) {
      // No es un commit/merge, dejar pasar
      process.exit(0);
    }

    // Obtener la rama actual
    try {
      const branch = execSync('git branch --show-current 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();

      const protectedBranches = ['main', 'master', 'dev', 'develop', 'development'];

      if (protectedBranches.includes(branch.toLowerCase())) {
        // BLOQUEAR: estamos en rama protegida
        console.error(`⛔ BLOQUEADO: Intentando ${command.includes('commit') ? 'commitear' : 'mergear'} en rama protegida "${branch}".`);
        console.error(`   Crear una rama de trabajo primero: git checkout -b feature/nombre-descriptivo`);
        process.exit(2); // Exit code 2 = bloquear el comando
      }
    } catch {
      // No es un repo git o no tiene rama, dejar pasar
    }

    process.exit(0);
  } catch {
    // Error parseando, dejar pasar
    process.exit(0);
  }
});
