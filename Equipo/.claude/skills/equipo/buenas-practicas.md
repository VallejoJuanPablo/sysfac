# Skill — Buenas Prácticas

## Descripción
Principios universales de código limpio, aplicables a cualquier lenguaje o framework.

## Principios fundamentales

### SOLID
- **S — Single Responsibility:** Una clase/función hace una sola cosa
- **O — Open/Closed:** Abierto a extensión, cerrado a modificación
- **L — Liskov Substitution:** Las subclases deben poder reemplazar a sus padres sin romper nada
- **I — Interface Segregation:** Interfaces pequeñas y específicas, no una gigante
- **D — Dependency Inversion:** Depender de abstracciones, no de implementaciones concretas

### DRY (Don't Repeat Yourself)
- Si copiás y pegás, probablemente necesitás una función o servicio
- Pero no abstraer antes de tiempo — 3 repeticiones es el umbral razonable
- Duplicación es mejor que una mala abstracción

### KISS (Keep It Simple, Stupid)
- La solución más simple que funcione es la correcta
- Si no podés explicar tu código en una frase, es demasiado complejo
- Evitar over-engineering y complejidad especulativa

### YAGNI (You Aren't Gonna Need It)
- No construir para requisitos que no existen todavía
- No agregar configurabilidad "por si acaso"
- Resolver el problema actual, no el hipotético

## Clean Code

### Naming
- Nombres descriptivos y pronunciables
- Variables: sustantivos (`userName`, `orderList`)
- Funciones: verbos (`getUser`, `calculateTotal`, `validateInput`)
- Booleanos: prefijo `is/has/can` (`isActive`, `hasPermission`)
- Constantes: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- Evitar abreviaciones crípticas (`usr`, `mgr`, `tmp`)

### Funciones
- Cortas: idealmente menos de 20 líneas
- Un solo nivel de abstracción por función
- Máximo 3 parámetros — si necesitás más, usar un objeto
- Sin side effects inesperados
- Early return para evitar anidamiento excesivo

### Archivos y módulos
- Un archivo = una responsabilidad clara
- Imports ordenados: externos primero, internos después
- No mezclar lógica de negocio con lógica de infraestructura

## Manejo de errores
- Fallar rápido y explícito — no tragar errores silenciosamente
- Mensajes de error útiles para debugging
- Validar en los bordes del sistema (inputs del usuario, APIs externas)
- Confiar en el código interno y las garantías del framework
- Errores tipados/personalizados cuando aporten contexto

## Checklist de code review
Preguntas que todo review de código debe responder:

### Funcionalidad
- [ ] ¿El código cumple con lo que se supone que debe hacer?
- [ ] ¿Hay algún caso de uso en el que no se comporte como se espera?
- [ ] ¿Hay inputs o eventos externos que podrían romperlo?

### Simplicidad
- [ ] ¿Se puede simplificar esta solución?
- [ ] ¿Está en el nivel de abstracción correcto?
- [ ] ¿Es suficientemente modular?

### Dependencias
- [ ] ¿Agrega dependencias innecesarias?
- [ ] ¿Se usa algún framework/librería que no debería usarse?
- [ ] ¿Hay algún framework/librería que mejoraría la solución?

### Calidad
- [ ] ¿Existe una mejor solución en mantenibilidad, legibilidad, rendimiento o seguridad?
- [ ] ¿Ya existe funcionalidad similar en el codebase? ¿Por qué no se reutiliza?
- [ ] ¿Hay patrones de diseño o best practices que mejorarían sustancialmente el código?
- [ ] ¿Cumple con los principios SOLID?

## Code smells — Señales de alerta
| Smell | Qué indica |
|---|---|
| Función de más de 50 líneas | Necesita descomposición |
| Más de 3 niveles de indentación | Extraer lógica a funciones |
| Comentario que explica "qué" hace el código | El código debería ser autoexplicativo |
| Booleano como parámetro | Probablemente son dos funciones distintas |
| Código comentado | Eliminarlo — Git tiene el historial |
| `any` en TypeScript | Definir el tipo correcto |
| Copy-paste con variaciones | Extraer y parametrizar |
| Catch vacío o genérico | Manejar el error específico |
| Función con más de 3 parámetros | Usar un objeto de configuración |
| Clase/servicio que hace demasiado | Dividir responsabilidades |
| Import circular | Reorganizar dependencias |
| Hardcoded values | Extraer a constantes o config |
| Lógica de negocio en controladores | Mover a servicios |
| Subscripción sin unsubscribe | Memory leak potencial |
| Query sin índice en campo de búsqueda | Problema de performance |
