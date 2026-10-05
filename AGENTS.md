# ia-apps-webs — instrucciones comunes

## Objetivo
Crear micro apps web responsive para móvil y escritorio: prototipos funcionales, visualmente cuidados y fáciles de probar. Priorizar simplicidad y consumo reducido de contexto. Idioma predeterminado: español.

## Lectura y alcance
Leer este archivo y `WORKFLOW.md`; después únicamente `apps/<slug>/AGENTS.md` y archivos necesarios. Antes de añadir backend o servicios externos, leer `COSTES.md`. Respetar trabajo parcial, revisar git y no modificar otras apps. Una carpeta independiente por app. Copiar los contextos de `templates/app/` al iniciar una.

## Arquitectura
Frontend predeterminado: React + Vite + TypeScript; HTML/CSS/JS para utilidades que no necesiten framework. Backend solo si aporta valor: Cloudflare Workers + Hono; D1/KV únicamente si se justifican. Verificar condiciones actuales antes de elegir servicios. Frontends de prueba en GitHub Pages; backend separado. Sin microservicios, monorepo tooling ni abstracciones preventivas.

## Calidad visual
Definir una dirección visual coherente. Cuidar tipografía, espaciado, jerarquía, contraste, estados vacíos/carga/error y controles táctiles. Comprobar móvil y escritorio, teclado, foco visible y ausencia de desbordamientos. No usar botones ficticios ni presentar mocks como funciones reales.

## Costes: requisito obligatorio
Presupuesto inicial autorizado: 0 €. Informar SIEMPRE de cualquier función que pueda generar cargos a Jose. Antes de activarla, obtener autorización explícita para el servicio y límite concreto. Ni una solicitud de funcionalidad ni de despliegue autoriza pagar. Aplicar `COSTES.md`: límites en servidor, cuota global y corte al agotarse. Sin protección verificable, mantener la función desactivada y explicar el bloqueo. Nunca publicar secretos.

## Ejecución
Un solo agente por defecto. Seguir `WORKFLOW.md`, realizar QA proporcional y actualizar el contexto de la app. Entregar cambios, comprobaciones, limitaciones reales y enlace verificado. No afirmar que está desplegado sin comprobarlo.
