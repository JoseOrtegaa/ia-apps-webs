# MyTools

Colección de herramientas para archivos. MVP PDF con diseño propio, responsive y procesamiento **100 % local**. Infraestructura: **0 €**; sin backend, APIs, cuentas ni analítica.

**Demo:** https://joseortegaa.github.io/ia-apps-webs/mytools/

## Uso y alcance

Elige herramienta → selecciona o arrastra archivos → revisa miniaturas y ajustes → procesa → descarga. El botón «Procesar otro archivo» libera el resultado anterior. La ordenación admite asas de arrastre y flechas táctiles/teclado.

- JPG/PNG → PDF: uno o varios archivos, A4 o tamaño de imagen.
- PDF → JPG/PNG: páginas seleccionadas, ZIP para múltiples imágenes.
- Unir, dividir (por página o grupos), extraer, eliminar, reordenar y rotar.
- Numeración consecutiva, marca de agua textual y recorte simétrico por porcentaje.

**Límites:** 20 archivos; 15 MB por archivo; 40 MB en total; 80 páginas por operación. Exportación de imágenes: 30 páginas, lado máximo 1.800 px/3 MP. Entrada de imágenes: 24 MP, ajustada a 2.400 px al crear PDF. Resultado máximo: 60 MB. Configuración central en `src/config.ts`.

**Limitaciones:** recortar modifica CropBox, no elimina información oculta; no usarlo para censura. PDFs cifrados no compatibles. Formularios/firmas interactivas se rechazan antes de editar para evitar perder campos; no se conservan garantías de firmas digitales. Copiar páginas puede perder marcadores/enlaces internos a otras páginas. Marca de agua: letras latinas y signos WinAnsi, sin emojis. Numeración al pie y marca diagonal, sin editor visual. Archivos muy complejos pueden exceder la memoria disponible incluso bajo los límites: se recomienda dividirlos. En iOS la descarga puede abrir una vista previa: Compartir → Guardar en Archivos.

## Desarrollo

Node 22.12+ o 24. `npm ci`, `npm run dev`, `npm run build`, `npm run preview`. Para QA: `npx playwright install --with-deps chromium webkit`, después `npm test`. Proyectos: `chromium-desktop` (1440 px), `chromium-mobile` (390 px, táctil), `webkit-mobile` (perfil iPhone 13). Se puede indicar `CHROMIUM_EXECUTABLE` si el entorno aporta un navegador y `QA_ISOLATED_BROWSER=1` para contenedores que requieran un proceso por prueba; `DEMO_URL` permite comprobar la publicación.

`npm run publish:files` copia el build únicamente a `docs/mytools/`; commit/push activa el Pages existente (main:/docs). No requiere Actions propio. Rutas hash compatibles con recarga y base de Vite configurada.

`src/config.ts` registra herramientas; `App.tsx` genera catálogo/rutas; `Workspace.tsx` comparte interacción; `engine.ts` implementa operaciones. PDF.js y motor cargados bajo demanda; miniaturas y exportaciones secuenciales. Todo recurso de PDF.js es local. No se guarda contenido en localStorage, IndexedDB o servidores. CSP restringe conexiones al propio origen.

## QA

Pruebas de navegador con fixtures pequeños generados en memoria; se abren los PDF y ZIP descargados para comprobar cantidad/orden, dimensiones, rotación, contenido de marca/numeración y CropBox. También inválidos/dañados/cifrados, formularios, rangos, límites de archivos/tamaño/páginas/resolución, reintento, selección/arrastre, responsive, recarga, consola y ausencia de uploads/terceros. `tests/fixtures/protected.pdf` es un PDF vacío de prueba, sin datos de usuarios.

Build correcto. Matriz de 30 casos en escritorio y 30 en móvil validada con Chromium; se comprueban archivos descargados y no solo mensajes de éxito. Capturas revisadas a 1440 y 390 px, sin desbordamiento horizontal. WebKit descargado, pero su arranque está bloqueado por bibliotecas del sistema ausentes; la instalación automática falló por restricciones del entorno. No confundir viewport iPhone en Chromium con una prueba de Safari físico.

## Fase 2: evaluación breve (2026-10-06)

| Función | Decisión del MVP |
| --- | --- |
| Word → PDF | Próximamente: docx-preview convierte a HTML, con límites de paginación; no garantiza fidelidad de documentos arbitrarios. |
| PowerPoint → PDF | Próximamente: PPTXjs renderiza HTML y añade dependencias; requiere validar temas, fuentes y gráficos antes de ofrecer conversión fiel. |
| Excel → PDF | Próximamente: SheetJS permite datos/HTML, pero impresión fiel de hojas, gráficos y áreas requiere trabajo adicional. |
| PDF → Word / PowerPoint / Excel | Próximamente: extraer texto no reconstruye estructura, tablas o diapositivas; escaneados necesitan OCR. No se simulan conversiones. |
| HTML → PDF | Próximamente: impresión nativa no asegura descarga uniforme en iOS; renderizar HTML arbitrario requiere aislar scripts, recursos externos y paginación. |
| PDF → PDF/A | Próximamente: requiere conformidad de fuentes, perfiles y metadatos, más validación; cambiar la extensión no basta. |
| Edición de contenido / formularios avanzados | Próximamente: pdf-lib admite AcroForms básicos, no reflujo/edición general de texto. XFA y firmas requieren tratamiento específico. |

Fuentes primarias: [pdf-lib y limitaciones](https://github.com/Hopding/pdf-lib#limitations), [PDF.js](https://mozilla.github.io/pdf.js/examples/), [docx-preview](https://github.com/VolodymyrBaydalka/docxjs), [PPTXjs](https://github.com/meshesha/PPTXjs), [SheetJS](https://docs.sheetjs.com/docs/solutions/output/), [PDF/A](https://pdfa.org/pdfa-faq/), [AcroForms](https://pdf-lib.js.org/docs/api/classes/pdfform).

Dependencias: React/ReactDOM, pdf-lib y fflate (MIT), PDF.js (Apache-2.0), incluidas con avisos de licencia en el build. La quinta dependencia, fflate, evita un ZIP propio y solo se carga al descargar varios resultados.
