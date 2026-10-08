# ia-apps-webs

Microapps web independientes, sencillas y funcionales, diseñadas para móvil y escritorio. Desarrollo directo con una sesión de IA + GitHub, **sin workflow multiagente** ni plantillas de contexto. Reglas mínimas en [AGENTS.md](AGENTS.md); política de costes y protección frente a abusos en [COSTES.md](COSTES.md).

## Aplicaciones

| App | Código | Enlace |
| --- | --- | --- |
| MyTools | [`apps/mytools/`](apps/mytools/) | [Abrir MyTools](https://joseortegaa.github.io/ia-apps-webs/mytools/) |
| Koi Store | [`apps/koi-store/`](apps/koi-store/) | [Abrir Koi Store](https://joseortegaa.github.io/ia-apps-webs/koi-store/) |

**MyTools:** herramientas PDF y plantillas de documentos, con procesamiento local en el navegador. **Koi Store:** catálogo público estático de juegos y apps con búsqueda y miniaturas.

## Desarrollo y publicación

- Cada app vive en `apps/<slug>/`. Su README explica funcionalidades, dependencias, comandos y pruebas; el código es la fuente de verdad.
- Para MyTools: entrar en `apps/mytools`, ejecutar `npm ci`, `npm test` y `npm run publish:files` (compila y actualiza únicamente `docs/mytools/`).
- Para Koi Store: desde la raíz ejecutar `node apps/koi-store/scripts/publish.mjs`; QA en `apps/koi-store/README.md`.
- GitHub Pages sirve `main:/docs`. La portada está en [GitHub Pages](https://joseortegaa.github.io/ia-apps-webs/). Cada publicación debe conservar los otros directorios de `docs/` y verificar las rutas reales.
- Los prototipos parten de **0 €**, sin backend por defecto. Antes de incorporar infraestructura, funciones facturables o servicios externos, aplicar `COSTES.md` y solicitar autorización explícita.

Para pedir cambios: indica el repositorio, la app, el comportamiento esperado y solicita «inspecciona, implementa, prueba y publica». No es necesario nombrar roles ni ejecutar fases de agentes. Evita documentación de estado por cada intervención; los commits y tests registran el trabajo.
