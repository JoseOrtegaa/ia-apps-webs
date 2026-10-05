# PROTOTYPE_FAST

1. **Recuperar:** revisar estado de git, instrucciones y avances de la app. Continuar desde el siguiente pendiente; no repetir fases ya verificadas.
2. **Concretar:** resumir objetivo, usuario, flujo principal y 3–5 criterios de aceptación. Resolver decisiones reversibles sin consultas innecesarias. Preguntar solo por bloqueos reales, datos imprescindibles o gasto no autorizado.
3. **Diseñar e implementar:** elegir una dirección visual y el stack mínimo; completar primero un flujo usable. Reutilizar patrones dentro de la app. No incorporar proveedores, analítica, login ni backend sin necesidad.
4. **Verificar:** build cuando exista; flujo principal y un error relevante; estados vacíos/carga; móvil (~390 px) y escritorio (~1440 px); controles táctiles/teclado; consola, rutas y assets bajo la subruta de Pages. Si hay backend, comprobar validación, acceso, cuotas y corte de gasto con proveedores simulados, sin hacer pruebas masivas contra servicios facturables.
5. **Corregir:** una ronda focalizada como objetivo. Si quedan fallos bloqueantes, corregirlos o detener la publicación indicando el bloqueo. El ahorro de tokens nunca justifica publicar con un fallo de seguridad/costes conocido.
6. **Integrar:** revisar diff y secretos, actualizar contexto y README, commit/push y despliegue si están autorizados. Verificar URL y flujo principal publicado. Si falta acceso, preparar todo lo posible e informar exactamente qué falta.

## Presupuesto de complejidad

Objetivo por prototipo: hasta 25 archivos propios, 4 dependencias de ejecución y 5 endpoints. Excluir lockfiles, assets y herramientas de desarrollo del recuento orientativo. Simplificar alcance antes de excederlo; justificar cualquier excepción. Sin agentes paralelos por defecto ni documentos repetidos para cada fase.

## Contexto persistente

`apps/<slug>/AGENTS.md`: máximo 300 palabras con objetivo, arquitectura real, comandos, restricciones y siguiente pendiente. `README.md`: uso, pruebas y enlaces. Cuando haya servicios facturables, registrar autorización y límites en `apps/<slug>/COSTES.md`, sin datos privados innecesarios. No cargar contextos de otras apps.
