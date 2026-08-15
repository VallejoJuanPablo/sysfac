# /test-debt — Ver y gestionar deuda de testing

Consultar y actualizar la deuda de testing del proyecto activo.

## Pasos

1. **Leer** `docs/testing-debt.md` del proyecto activo
2. **Mostrar** tabla de deuda actual con prioridades
3. **Si el usuario quiere cubrir deuda:**
   - Identificar los items P0 primero
   - Sugerir si usar SDD (/spec) o implementación directa
   - Delegar a `testing/unit-backend` o `testing/e2e-cypress` según el tipo
4. **Si el usuario quiere agregar deuda:**
   - Agregar nueva entrada con feature, tipo de test, prioridad y SPEC origen
5. **Si el usuario quiere marcar como cubierta:**
   - Cambiar estado a "cubierto" y agregar referencia al commit

## Output
Tabla de deuda + resumen (total, P0 pendientes, cubiertas) + sugerencia de próxima acción.
