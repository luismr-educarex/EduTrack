# Verificación del sistema de calificación por criterios

Fecha: 2026-07-21  
Fuente: `integracion_sistema_criterios_sgacademico.md` y checklist exhaustivo v1.

## Resultado

La suite automatizada valida el motor con el `fixture_principal`, el caso de no degradación, el grafo oficial de 79 CE y el banco oficial de plantillas. Se ejecuta con `npm test`. La migración añade restricciones, auditoría y persistencia para configuración anual, niveles H/M/I, evidencias regenerables, plantillas, planes y rechazos de importación.

| Bloque | Estado                  | Evidencia                                                                                                          |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A      | Implementado            | FK, restricciones SQL, validación de escala 0–10 y `no_aplicable`                                                  |
| B      | Verificado              | A1=6, A2=8, A3=6, A4=6; CE repetido no duplica peso; relativos suman 1                                             |
| C      | Verificado              | A2=4,17; evidencia de c=4,50; exclusión de no aplicables; peso completo=8                                          |
| D–F    | Verificado              | Ponderada, última y móvil; modo específico de recuperación                                                         |
| G–I    | Verificado              | H/M/I, cierre, evidencia obligatoria derivada, máximo candidato, no degradación, Kahn y ciclos                     |
| J      | Verificado              | Corte activable, lista de básicos causantes y efectos orientativo/académico                                        |
| K      | Verificado              | Aviso solo cuando la global aprueba y enumera los CE retenidos                                                     |
| L      | Verificado              | 17 ejercicios para RA1–RA3 y 40 para el módulo; 7g primero y cubriendo 17 CE                                       |
| M      | Verificado              | 7/19 actividades, orden inverso, 9 hitos de tramo, refuerzos y partición completa                                  |
| N      | Verificado              | CE objetivo, desglose de básicos del hito, descriptores y solo plantillas validadas                                |
| O      | Verificado              | Sin evaluar=null, extremos 0/10, no aplicable, recuperación y valoración mínima/heredada                           |
| P      | Parcialmente verificado | Auditoría SQL, trazabilidad y prueba sintética 30×79; no se usa Redis, por lo que no existe caché externa obsoleta |
| Q      | Verificado              | 79 CE, 137 aristas (11 H, 85 M, 41 I), 7 rechazos, prioridades y cinco coberturas RA exactas                       |

## Verificación de los datos reales

Los dos JSON oficiales quedan versionados como fixtures de regresión. Las pruebas verifican L-01, L-02, M-01, M-02 y Q-01 a Q-05, incluidos los porcentajes RA7→RA4=70,0 %, RA4→RA2=60,9 %, RA5→RA1=52,0 %, RA3→RA1=32,0 % y RA2→RA1=12,0 %. El banco contiene tres plantillas estructuralmente válidas; se importan como borradores inactivos hasta la validación docente.

## Revisión manual requerida

Los puntos declarados no automatizables en el checklist deben revisarse en un entorno desplegado: redacción de justificaciones, jerarquía visual de notas, textos de discordancia y circuito docente de aprobación de plantillas. La antigua pantalla editable de relaciones RA se ha retirado de la navegación; la tabla histórica se conserva temporalmente para no destruir datos existentes y el sistema criterial no la utiliza como fuente.

## Criterio de despliegue

Antes de producción deben cumplirse todos estos pasos:

1. Ejecutar `npm test`, `npm run type-check` y `npm run build` sin errores.
2. Aplicar la migración en un entorno de preproducción y probar importación repetida del grafo real.
3. Completar la revisión manual del checklist y conservar una copia de la tabla histórica de relaciones RA antes de retirarla definitivamente.
