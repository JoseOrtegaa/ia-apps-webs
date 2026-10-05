# ia-apps-webs

Base para crear micro apps web responsive, visualmente cuidadas y funcionales con un workflow ligero de un solo agente.

## Estado inicial

Contextos y plantilla preparados. No hay apps, backend, servicios facturables ni credenciales configurados. Repositorio público creado en `JoseOrtegaa/ia-apps-webs`. Activación de Pages pendiente de verificar.

## Estructura

| Ruta | Propósito |
| --- | --- |
| `AGENTS.md` | Reglas comunes y punto de entrada |
| `WORKFLOW.md` | PROTOTYPE_FAST y QA mínimo |
| `COSTES.md` | Autorización, cuotas y corte de gasto |
| `templates/app/` | Contextos que se copian al crear una app |
| `apps/<slug>/` | Código y contexto independiente de cada app |
| `docs/` | Archivos públicos para GitHub Pages |

## Crear una app

Indicar: idea, usuario objetivo, flujo principal y cualquier referencia visual. El agente lee las instrucciones, copia la plantilla a `apps/<slug>/`, completa su contexto e implementa. React + Vite + TypeScript por defecto; backend únicamente si se necesita. Ninguna dependencia instalada en la base.

Prompt reutilizable:

> Trabaja en JoseOrtegaa/ia-apps-webs. Lee el AGENTS.md raíz y sigue PROTOTYPE_FAST. Crea una nueva app llamada [nombre]. Mi idea es [idea]. Debe permitir [flujo principal]. Respeta la política de costes y deja un enlace de prueba verificado.

## Publicación de pruebas

Una vez creado el repositorio público, configurar **Settings → Pages → Deploy from a branch → main → /docs**. `docs/index.html` es la portada inicial; `.nojekyll` evita procesamiento Jekyll. No hace falta un workflow personalizado para esta base estática.

Cada app publicará únicamente su salida frontend en `docs/<slug>/`. Para Vite, configurar `base: '/ia-apps-webs/<slug>/'` y copiar la salida de build a esa carpeta sin borrar otras apps. Preferir navegación hash si hay rutas SPA; verificar recargas y assets. No publicar fuentes del backend, secretos ni archivos `.env` en `docs/`.

La dirección prevista tras activar y verificar Pages es `https://joseortegaa.github.io/ia-apps-webs/`. Cada app tendrá la subruta correspondiente. Pages aloja contenido estático: el backend requiere otro proveedor y cumplir `COSTES.md`.

Fuentes de despliegue verificadas el 2026-10-05:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Apps

Todavía no hay apps. Añadir aquí nombre, descripción y enlace verificado al publicar la primera.
