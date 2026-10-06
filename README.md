# ia-apps-webs

Base para crear micro apps web responsive, visualmente cuidadas y funcionales con un workflow ligero de un solo agente.

## Estado

Koi Store reúne juegos y apps en un catálogo público estático. MyTools: 11 herramientas PDF con procesamiento local. Contextos y plantilla disponibles para futuras apps; sin backend ni servicios facturables. Repositorio público creado en `JoseOrtegaa/ia-apps-webs`. Pages activo y portada verificada el 2026-10-06 (Europe/Madrid): https://joseortegaa.github.io/ia-apps-webs/.

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

Configuración activa: **Settings → Pages → Deploy from a branch → main → /docs**. `docs/index.html` es la portada inicial; `.nojekyll` evita procesamiento Jekyll. No hace falta un workflow personalizado para esta base estática.

Cada app publicará únicamente su salida frontend en `docs/<slug>/`. Para Vite, configurar `base: '/ia-apps-webs/<slug>/'` y copiar la salida de build a esa carpeta sin borrar otras apps. Preferir navegación hash si hay rutas SPA; verificar recargas y assets. No publicar fuentes del backend, secretos ni archivos `.env` en `docs/`.

La portada publicada y verificada está en `https://joseortegaa.github.io/ia-apps-webs/`. Cada app tendrá la subruta correspondiente. Pages aloja contenido estático: el backend requiere otro proveedor y cumplir `COSTES.md`.

Fuentes de despliegue verificadas el 2026-10-05:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Apps

| App | Descripción | Demo |
| --- | --- | --- |
| MyTools | Herramientas de archivos; MVP con 11 utilidades PDF, 100 % local | [Abrir MyTools](https://joseortegaa.github.io/ia-apps-webs/mytools/) |


| Koi Store | Catálogo público de juegos y apps, con búsqueda y miniaturas reales | [Abrir Koi Store](https://joseortegaa.github.io/ia-apps-webs/koi-store/) |
