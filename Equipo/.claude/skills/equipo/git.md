# Skill — Git

## Descripción
Control de versiones y flujo de trabajo colaborativo.

## Regla de oro
**NUNCA commitear directamente en `main`, `master`, `develop` o `dev`.** Todo cambio, por mínimo que sea, requiere una rama.

## Estándares de commits
- Commits atómicos: un cambio lógico por commit
- Mensajes en español
- Formato:
  ```
  tipo: título breve

  Descripción de qué se hizo y por qué.

  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Tipos: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`
- El body explica el **qué y por qué**, no el cómo (el código ya lo muestra)
- Siempre incluir el tag Co-Authored-By de Claude

## Flujo de branches
- `main` / `master` — producción, **solo recibe merges**
- `develop` / `dev` — integración, **solo recibe merges**
- `feature/<nombre>` — desarrollo de funcionalidades
- `fix/<nombre>` — corrección de bugs
- `hotfix/<nombre>` — correcciones urgentes en producción
- `style/<nombre>` — cambios visuales/estéticos
- `docs/<nombre>` — documentación

### Naming de ramas
- Descriptivo y corto: `feature/galerias`, `fix/contador-imagenes`, `style/tipografias`
- Sin IDs de spec ni tickets: NO `feature/SPEC-004-galerias`
- Kebab-case siempre

### Flujo obligatorio
1. Crear rama desde `main` o `develop`
2. Trabajar y commitear en la rama
3. Pushear al terminar la feature/fix completa (no en cada commit)
4. Mergear cuando esté listo
5. Eliminar la rama local y remota después del merge

### Reglas de merge
- **A `develop` / `dev`:** Merge directo sin confirmación cuando el usuario lo pida
- **A `main` / `master`:** Requiere confirmación. Antes de mergear, mostrar:
  - Rama origen
  - Cantidad de commits
  - Lista de commits (hash + mensaje)
  - Archivos modificados (resumen)
  - Esperar aprobación explícita del usuario

### Limpieza de ramas
Después de cada merge, eliminar la rama:
```bash
git branch -d <rama>              # local
git push origin --delete <rama>   # remota
```

## Buenas prácticas
- No commitear archivos sensibles (.env, credenciales)
- `.gitignore` configurado desde el inicio
- Pull antes de push
- Resolver conflictos localmente antes de pushear
- No usar tags de versionado (sin v1.0.0, sin releases)
