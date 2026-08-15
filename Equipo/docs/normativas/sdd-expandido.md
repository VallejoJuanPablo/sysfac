# Política de SDD expandido

## Proyectos donde SDD es recomendado
| Proyecto | Razón |
|----------|-------|
| GymPulse (P01) | Multi-tenancy, rutinas, sesiones |
| AgroEnvios (P04) | Microservicios + integraciones externas |
| microTelco (P06) | Módulos interdependientes |
| AgroEnvioPanel (P08) | Panel que depende de API compleja |

## Proyectos donde SDD es opcional
Braillin, FrontKit, BarberiaElJefe, ArchieTeam — features directas, bajo riesgo.

## Regla de activación
- `/spec` activa SDD cuando el usuario quiera
- Archie **sugiere** SDD cuando detecta complejidad en proyecto recomendado
- Sugerencia: "Esta feature tiene complejidad para SDD. ¿Querés `/spec`?"
- Si dice no, trabajar normalmente sin insistir
