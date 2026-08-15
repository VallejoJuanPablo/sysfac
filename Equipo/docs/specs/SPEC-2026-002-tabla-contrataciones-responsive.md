# Spec: Tabla de Contrataciones responsive (reducir ancho sin perder información)

- **Fecha:** 2026-07-07
- **Solicitado por:** desarrollo@idoneo.com
- **Estado:** borrador

## Contexto
La vista "Todas las contrataciones" es una tabla de **13 columnas** (checkbox, alerta, Referencia, Agente, Broker, Financiera, Cliente, Vehículo, Documentos, Última actualización, Últ. act. etapa, Etapa, Acciones). Solo se ve completa en un monitor ultrawide; en monitores estándar (≤1440px) obliga a scroll horizontal para recorrer toda la fila, lo que rompe la lectura y esconde columnas clave como Etapa y Acciones.

El ancho excesivo viene de tres focos concretos:
1. **Tres columnas de entidad seguidas** (Agente / Broker / Financiera) con estructura repetida (nombre + sub-referencia).
2. **Dos columnas de fecha casi idénticas** (Última actualización / Últ. act. etapa), ambas fecha + persona.
3. **Columna Vehículo** con la versión completa del modelo en texto plano largo ("Evolution Eco-G 74 kW (100CV) GLP (2026)") más badges.

## Objetivo
Reducir el ancho total de la tabla para que entre sin scroll horizontal en monitores de hasta 1440px (idealmente 1280px), consolidando columnas redundantes y difiriendo información secundaria, sin perder ningún dato (queda accesible por expandir fila / tooltip / selector de columnas). En pantallas chicas, la tabla degrada a vista de tarjetas.

## User stories

### US-1: Fusionar las dos columnas de fecha en una sola
**Como** usuario que revisa contrataciones en un monitor estándar
**Quiero** ver "Última actualización" y "Últ. act. etapa" en una única columna
**Para** recuperar ancho sin perder ninguna de las dos fechas ni sus responsables

**Criterios de aceptación:**
- [ ] **Given** una fila con ambas fechas **When** se renderiza la tabla **Then** aparece una sola columna "Actualización" con dos líneas etiquetadas: `Actualización: 07/07/2026 · Support DBM` y `Etapa: 15/12/2025 · Xavi Gorchs`
- [ ] **Given** una fila sin fecha de etapa **When** se renderiza **Then** la línea "Etapa" se omite sin dejar hueco vacío
- [ ] **Given** el ordenamiento actual por "Últ. act. etapa" **When** se fusiona la columna **Then** el sort por esa fecha se conserva (accesible desde el header de la columna fusionada)

### US-2: Agrupar Agente / Broker / Financiera en una columna "Gestión"
**Como** usuario
**Quiero** ver agente, broker y financiera apilados en una sola columna
**Para** eliminar dos columnas de ancho sin perder los datos

**Criterios de aceptación:**
- [ ] **Given** una fila con los tres datos **When** se renderiza **Then** se muestran apilados con etiqueta: nombre del agente arriba, `Broker: …` y `Financiera: …` debajo en texto secundario
- [ ] **Given** un dato faltante (ej. sin broker) **When** se renderiza **Then** esa línea se omite
- [ ] **Given** la sub-referencia que hoy acompaña a cada entidad **When** se agrupa **Then** sigue visible (en línea o vía tooltip)

### US-3: Truncar la versión del vehículo con detalle bajo demanda
**Como** usuario
**Quiero** ver el vehículo de forma compacta
**Para** que la columna más ancha deje de dominar la tabla

**Criterios de aceptación:**
- [ ] **Given** una versión larga **When** se renderiza **Then** se muestra `Marca Modelo` + badges (Renting/Nuevo) y la versión truncada a una línea con `…`
- [ ] **Given** el usuario pasa el mouse sobre la celda **When** hay texto truncado **Then** un tooltip muestra la versión completa
- [ ] **Given** el tag de color del vehículo (ej. "MBZ CAPTUR (Rojo)") **When** se compacta **Then** se conserva como chip

### US-4: Selector de columnas visibles
**Como** usuario
**Quiero** elegir qué columnas ver
**Para** adaptar la tabla a mi pantalla y a mi trabajo

**Criterios de aceptación:**
- [ ] **Given** la tabla **When** abro el selector de columnas (ícono en la toolbar) **Then** puedo mostrar/ocultar columnas no esenciales (Documentos, Gestión, fechas)
- [ ] **Given** columnas esenciales (Referencia, Cliente, Vehículo, Etapa, Acciones) **When** abro el selector **Then** no puedo ocultarlas
- [ ] **Given** una preferencia de columnas elegida **When** recargo la página **Then** la selección persiste (localStorage o preferencia de usuario)

### US-5: Fila expandible para información secundaria
**Como** usuario
**Quiero** expandir una fila para ver el detalle completo
**Para** acceder a lo que se movió fuera de la vista compacta sin scroll horizontal

**Criterios de aceptación:**
- [ ] **Given** una fila compacta **When** hago click en la fila (o en un chevron) **Then** se despliega un panel con todos los campos completos (agente/broker/financiera, ambas fechas con persona, documentos)
- [ ] **Given** una fila expandida **When** hago click de nuevo **Then** se colapsa

### US-6: Vista de tarjetas en pantallas chicas
**Como** usuario en una pantalla angosta
**Quiero** que la tabla se convierta en tarjetas apiladas
**Para** no depender de scroll horizontal

**Criterios de aceptación:**
- [ ] **Given** un viewport por debajo del breakpoint definido **When** se renderiza la vista **Then** cada contratación se muestra como una card con los campos esenciales
- [ ] **Given** la vista de tarjetas **When** toco una card **Then** puedo ver el detalle completo

## Requisitos no funcionales
- **Compatibilidad:** la tabla debe entrar sin scroll horizontal en viewport de 1440px con todas las columnas esenciales; objetivo secundario 1280px.
- **Performance:** truncado y tooltips no deben degradar el render de 25 filas por página; expandir fila no debe recargar datos del servidor si ya están en memoria.
- **Accesibilidad:** columnas ocultas siguen accesibles vía teclado; tooltips con `aria-label`; el selector de columnas es navegable por teclado.
- **Sin pérdida de dato:** ningún campo actual se elimina; todo lo que sale de la vista compacta queda accesible por tooltip, expandir fila o selector de columnas.

## Fuera de alcance
- Rediseño visual/estético de la tabla (colores, tipografía) más allá de lo necesario para compactar.
- Cambios en el backend o en los endpoints que alimentan la tabla.
- Paginación, filtros o buscador (se mantienen como están).
- Exportar/Importar (se mantienen).

## Edge cases
| # | Escenario | Comportamiento esperado |
|---|-----------|------------------------|
| 1 | Fila sin broker o sin financiera | Se omite la línea correspondiente en "Gestión", sin hueco |
| 2 | Versión de vehículo muy corta (no necesita truncar) | Se muestra completa, sin `…` ni tooltip |
| 3 | Fila con chips de estado múltiples (SIN ORDEN DE ENVIO + Agendado) | Los chips se agrupan bajo Referencia; si desbordan, se compactan a ícono+tooltip |
| 4 | Columna Documentos vacía | Se muestra ícono neutro / guion; no ocupa ancho reservado grande |
| 5 | Usuario oculta todas las columnas opcionales | Quedan visibles solo las esenciales, tabla en su mínimo ancho |
| 6 | Redimensionar la ventana cruzando el breakpoint | La vista alterna entre tabla y tarjetas sin recargar la página |
| 7 | Sort activo sobre una columna que se oculta | El sort se resetea a un default definido o se conserva accesible |

## Dependencias
- Componente de tabla existente (identificar en el repo del proyecto: probable data-grid Angular Material / PrimeNG).
- Mecanismo de persistencia de preferencias (localStorage o servicio de usuario ya existente).
- Definir el breakpoint objetivo con el usuario (1440px / 1280px) antes de implementar US-6.

## Notas
- Prioridad de ahorro de ancho: **US-2 (Gestión) > US-1 (fechas) > US-3 (vehículo)**. Son las tres que más ancho recuperan con menor riesgo; se pueden implementar y entregar primero.
- US-4, US-5 y US-6 son la solución de fondo (progressive disclosure) y pueden ir en una segunda iteración si se necesita entregar rápido.
- Falta confirmar el repositorio/proyecto donde vive esta tabla y el breakpoint objetivo — bloquean el inicio de implementación.
- Stack asumido: Angular (frontend del equipo). Ajustar si la tabla vive en otro stack.
