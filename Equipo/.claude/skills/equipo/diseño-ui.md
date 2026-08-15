# Skill — Diseño UI/UX

## Descripción
Diseño de interfaces de usuario y experiencia de uso. Cada interfaz debe tener identidad propia, una dirección estética intencional y ejecución precisa.

## Pensamiento de diseño
Antes de codificar, definir:
- **Propósito:** ¿Qué problema resuelve esta interfaz? ¿Quién la usa?
- **Tono:** Elegir una dirección clara: minimal, editorial, retro-futurista, orgánico, luxury, industrial, art deco, etc. La clave es intencionalidad.
- **Diferenciación:** ¿Qué hace memorable esta interfaz? ¿Qué va a recordar el usuario?

## Estándares
- Mobile-first: diseñar primero para móvil, luego escalar
- Sistema de espaciado consistente (múltiplos de 4px u 8px)
- Tipografía con jerarquía clara (máximo 2-3 tamaños por vista)
- Paleta de colores definida con variables CSS/SCSS
- Contraste mínimo AA según WCAG

## Tipografía
- Elegir fuentes con carácter que eleven la estética del proyecto
- Combinar una fuente display distintiva con una body refinada
- Evitar fuentes genéricas por defecto (Arial, Inter, Roboto, system fonts) a menos que haya una razón concreta
- La tipografía es el primer elemento que define la personalidad de la interfaz

## Color y tema
- Colores dominantes con acentos marcados superan a las paletas tímidas y distribuidas uniformemente
- Usar CSS variables para consistencia
- Comprometerse con un tema cohesivo — no mezclar direcciones estéticas

## Composición espacial
- Explorar layouts asimétricos, superposición, flujo diagonal, elementos que rompan la grilla
- Espacio negativo generoso O densidad controlada — ambos funcionan si son intencionales
- Evitar layouts predecibles y repetitivos

## Motion y micro-interacciones
- Priorizar soluciones CSS-only para animaciones
- Enfocar el esfuerzo en momentos de alto impacto: una entrada de página bien orquestada con reveals escalonados (animation-delay) genera más impacto que micro-interacciones dispersas
- Usar scroll-triggering y hover states que sorprendan
- Transiciones suaves (200-300ms) para cambios de estado

## Fondos y detalles visuales
- Crear atmósfera y profundidad — no defaults de colores sólidos
- Texturas que refuercen la estética: gradientes mesh, noise, patrones geométricos, transparencias, sombras dramáticas, bordes decorativos, grain overlays

## Anti-patrones (evitar)
- Estética genérica de IA: gradientes violetas sobre blanco, layouts predecibles, componentes cookie-cutter
- Convergencia en las mismas elecciones (misma fuente, mismo esquema de color en todos los proyectos)
- Complejidad visual sin propósito — más efectos no significa mejor diseño
- Diseños sin identidad: si podría ser de cualquier proyecto, falta dirección

## Patrones comunes
- Variables CSS para colores, tipografía y espaciados
- Breakpoints estándar: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- Componentes con estados visuales: default, hover, active, disabled, error
- Feedback visual para acciones del usuario (loading, success, error)

## Entregables
- Paleta de colores con nombres semánticos (primary, secondary, accent, etc.)
- Escala tipográfica definida
- Especificaciones de espaciado y layout
- Dirección estética documentada (tono, referencias, diferenciador)
- Guía de componentes cuando el proyecto lo amerite
