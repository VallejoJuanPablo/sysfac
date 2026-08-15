# Skill — Generación de Componentes Angular

## Descripción
Generación de componentes UI premium para Angular 18+ standalone con Tailwind CSS y PrimeNG. Inspirada en el catálogo de 21st.dev pero adaptada al stack del equipo.

## Stack de generación
- **Angular 18+** — Standalone components, signals, new control flow (@if, @for)
- **Tailwind CSS v3** — Utility-first, responsive, dark mode
- **PrimeNG** — Componentes complejos (tablas, dialogs, fileupload, calendar)
- **PrimeIcons** — Iconografía
- **TypeScript estricto** — Interfaces, sin `any`

## Categorías de componentes

### Marketing Blocks (secciones de página)
| Categoría | Descripción | Ejemplo de uso |
|-----------|-------------|----------------|
| **Hero** | Sección principal con CTA | Landing pages, home |
| **Features** | Grid de features/beneficios | Producto, servicios |
| **Pricing** | Tablas de precios | SaaS, planes |
| **Testimonials** | Carrusel/grid de testimonios | Social proof |
| **CTA** | Llamadas a la acción | Conversión |
| **Footer** | Pie de página | Todas las páginas |
| **Navbar** | Navegación principal | Header del sitio |
| **Stats** | Números destacados | Dashboard, landing |
| **Team** | Equipo/personas | About us |
| **FAQ** | Preguntas frecuentes | Soporte |
| **Gallery** | Galería de imágenes | Portfolio, productos |
| **Contact** | Formulario de contacto | Contacto |
| **Banner** | Anuncios/alertas | Promociones |

### UI Components (elementos reutilizables)
| Categoría | Descripción | Cuándo usar Tailwind vs PrimeNG |
|-----------|-------------|--------------------------------|
| **Button** | Botones con variantes | Tailwind (simple) o PrimeNG p-button (con icon/loading) |
| **Card** | Tarjetas de contenido | Tailwind siempre — más control visual |
| **Input** | Campos de texto | Tailwind + @tailwindcss/forms (simple) o PrimeNG (complejo) |
| **Select** | Selectores/dropdowns | PrimeNG p-select (búsqueda, multi) o Tailwind (básico) |
| **Table** | Tablas de datos | PrimeNG p-table (sort, filter, paginator) |
| **Dialog/Modal** | Ventanas modales | Tailwind (simple) o PrimeNG p-dialog (complejo) |
| **Tabs** | Pestañas de contenido | Tailwind (simple) o PrimeNG p-tabs |
| **Accordion** | Paneles colapsables | Tailwind con @if |
| **Alert/Toast** | Notificaciones | PrimeNG p-toast |
| **Badge** | Etiquetas de estado | Tailwind span con clases |
| **Avatar** | Imagen de usuario | Tailwind rounded-full |
| **Sidebar** | Panel lateral | Tailwind con translate-x |
| **Breadcrumb** | Navegación de ruta | Tailwind con flex |
| **Pagination** | Paginación | PrimeNG p-paginator o Tailwind |
| **Spinner/Loader** | Indicador de carga | Tailwind animate-spin |
| **Toggle** | Switch on/off | Tailwind o PrimeNG p-toggleSwitch |
| **Tooltip** | Texto emergente | PrimeNG pTooltip directiva |
| **FileUpload** | Subida de archivos | PrimeNG p-fileUpload |
| **Calendar** | Selector de fecha | PrimeNG p-calendar |
| **Empty State** | Estado vacío | Tailwind con ilustración |
| **Skeleton** | Placeholder de carga | Tailwind animate-pulse |
| **Carousel** | Carrusel de contenido | PrimeNG p-carousel o Tailwind custom |

## Reglas de generación

### Estructura de archivo
Cada componente se genera como un solo archivo `.ts` con template inline:
```typescript
// Componente presentacional (dumb)
@Component({
  selector: 'app-nombre',
  standalone: true,
  imports: [CommonModule, ...],
  template: `...`
})
export class NombreComponent {
  // Inputs con signal inputs cuando aplique
  // Outputs con EventEmitter
}
```

### Reglas de estilo
1. **Tailwind primero** — Para layout, spacing, colores, tipografía, responsive
2. **PrimeNG solo cuando agrega valor** — Tablas con sort/filter, dialogs complejos, calendars, file upload
3. **No mezclar** — Si un componente usa PrimeNG, no duplicar con Tailwind y viceversa
4. **Responsive obligatorio** — Todo componente debe funcionar en mobile
5. **Estados completos** — default, hover, active, disabled, loading, error, empty
6. **Accesibilidad** — aria-labels, roles, contraste AA mínimo

### Naming conventions
```
Componente:  app-nombre-variante     → NombreVarianteComponent
Archivo:     nombre-variante.ts
Ejemplo:     app-hero-centered       → HeroCenteredComponent
             app-card-product        → CardProductComponent
             app-button-primary      → ButtonPrimaryComponent
```

### Variantes por componente
Cada componente debe ofrecer variantes cuando tenga sentido:
- **Button:** primary, secondary, outline, ghost, danger, icon-only, loading
- **Card:** default, horizontal, overlay, stats, profile
- **Hero:** centered, split, image-bg, video-bg, minimal
- **Input:** default, with-icon, with-addon, floating-label, error
- **Table:** basic, striped, sortable, selectable, expandable

## Cómo solicitar un componente

### Formato de pedido
```
Necesito un [categoría] [variante] para [contexto/proyecto]
```

### Ejemplos
- "Necesito un hero centered para la landing de Braillin"
- "Necesito una card de producto con imagen, precio y botón"
- "Necesito una tabla de pedidos con filtros y paginación"
- "Necesito un formulario de contacto con validación"

### Lo que se genera
1. **Componente standalone** — Archivo .ts completo, copy-paste ready
2. **Tipos/Interfaces** — Si el componente necesita modelos de datos
3. **Instrucciones de uso** — Cómo importar y usar en el parent

## Anti-patrones (NO hacer)
- No generar NgModules — todo standalone
- No usar `any` — tipar todo
- No hardcodear textos — usar @Input() para contenido dinámico
- No estilos inline — usar clases Tailwind
- No componentes monolíticos — dividir si supera 150 líneas de template
- No PrimeNG para cosas simples — un botón no necesita p-button
- No ignorar mobile — breakpoints obligatorios
- No olvidar estados — un botón sin hover/disabled está incompleto

## Integración con el equipo
- Sigue los estándares de `angular.md` (standalone, tipado, estructura)
- Sigue la dirección estética de `diseño-ui.md` (intencionalidad, anti-genérico)
- Los componentes se ubican en `shared/components/` si son reutilizables
- Los componentes específicos van en `features/<modulo>/components/`
