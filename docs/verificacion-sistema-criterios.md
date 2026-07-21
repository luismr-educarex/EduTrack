# Verificación del sistema de calificación por criterios

Fecha: 2026-07-21  
Fuente: `integracion_sistema_criterios_sgacademico.md` y checklist exhaustivo v1.

## Resultado

La suite automatizada valida el motor con el `fixture_principal` y el caso de no degradación. Se ejecuta con `npm test` y cubre los cálculos de las categorías B–O que no dependen del catálogo real. La migración añade restricciones, auditoría y persistencia para configuración anual, niveles H/M/I, evidencias regenerables, plantillas, planes y rechazos de importación.

| Bloque | Estado                          | Evidencia                                                                                                          |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A      | Implementado                    | FK, restricciones SQL, validación de escala 0–10 y `no_aplicable`                                                  |
| B      | Verificado                      | A1=6, A2=8, A3=6, A4=6; CE repetido no duplica peso; relativos suman 1                                             |
| C      | Verificado                      | A2=4,17; evidencia de c=4,50; exclusión de no aplicables; peso completo=8                                          |
| D–F    | Verificado                      | Ponderada, última y móvil; modo específico de recuperación                                                         |
| G–I    | Verificado                      | H/M/I, cierre, evidencia obligatoria derivada, máximo candidato, no degradación, Kahn y ciclos                     |
| J      | Verificado                      | Corte activable, lista de básicos causantes y efectos orientativo/académico                                        |
| K      | Verificado                      | Aviso solo cuando la global aprueba y enumera los CE retenidos                                                     |
| L      | Verificado con fixture reducido | Cobertura única, objetivos pendientes y trazabilidad directa/H/M                                                   |
| M      | Verificado con fixture reducido | Orden inverso, refuerzos, máximo de fases y partición completa                                                     |
| N      | Verificado                      | CE objetivo, desglose de básicos del hito, descriptores y solo plantillas validadas                                |
| O      | Verificado                      | Sin evaluar=null, extremos 0/10, no aplicable, recuperación y valoración mínima/heredada                           |
| P      | Parcialmente verificado         | Auditoría SQL, trazabilidad y prueba sintética 30×79; no se usa Redis, por lo que no existe caché externa obsoleta |
| Q      | Pendiente de datos reales       | El importador está implementado, pero falta `grafo_0485_v2.json` para contrastar recuentos y porcentajes           |

## Comprobaciones pendientes por ausencia de fixtures

No estaban disponibles `grafo_0485_v2.json` ni `banco_plantillas_0485.json`. Por ello no se consideran ejecutadas las aserciones exactas L-01, L-02, M-01, M-02 y Q-01 a Q-05 (17/40 ejercicios, particiones 7/19, 137 aristas, 79 CE y porcentajes RA). El importador ignora los campos calculados del JSON, valida referencias y ciclos H/M, conserva H/M/I, registra rechazos y usa claves de conflicto idempotentes.

## Revisión manual requerida

Los puntos declarados no automatizables en el checklist deben revisarse en un entorno desplegado: redacción de justificaciones, jerarquía visual de notas, textos de discordancia y circuito docente de aprobación de plantillas. La antigua pantalla editable de relaciones RA se ha retirado de la navegación; la tabla histórica se conserva temporalmente para no destruir datos existentes y el sistema criterial no la utiliza como fuente.

## Criterio de despliegue

Antes de producción deben cumplirse todos estos pasos:

1. Ejecutar `npm test`, `npm run type-check` y `npm run build` sin errores.
2. Aplicar la migración en un entorno de preproducción y probar importación repetida del grafo real.
3. Incorporar los dos JSON de referencia y convertir las aserciones pendientes en pruebas bloqueantes.
4. Completar la revisión manual del checklist y conservar una copia de la tabla histórica de relaciones RA antes de retirarla definitivamente.
