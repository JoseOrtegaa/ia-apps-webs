# MyTools

Colección de herramientas para archivos. Herramientas PDF y plantillas de documentos con diseño propio, responsive y procesamiento **100 % local**. Infraestructura: **0 €**; sin backend, APIs, cuentas ni analítica.

**Demo:** https://joseortegaa.github.io/ia-apps-webs/mytools/

## Uso y alcance

Elige herramienta → selecciona o arrastra archivos → revisa miniaturas y ajustes → procesa → descarga. El botón «Procesar otro archivo» libera el resultado anterior. La ordenación admite asas de arrastre y flechas táctiles/teclado.

- JPG/PNG → PDF: uno o varios archivos, A4 o tamaño de imagen.
- PDF → JPG/PNG: páginas seleccionadas, ZIP para múltiples imágenes.
- Unir, dividir (por página o grupos), extraer, eliminar, reordenar y rotar.
- Numeración consecutiva, marca de agua textual y recorte simétrico por porcentaje.
- **Firmar PDF:** dibuja con ratón/dedo o carga PNG/JPG; selecciona página, mueve y ajusta ancho conservando proporciones; controles numéricos y teclado además del arrastre. Es una firma visual, sin certificado.
- **Añadir texto:** varios bloques/páginas, texto, tamaño, color, ancho, posición y eliminación. Añade contenido; no edita ni borra el texto original.
- **Plantillas (categoría Documentos):** carta genérica, solicitud formal y baja voluntaria laboral para España. Formulario → revisión de texto editable → PDF A4 directo, paginación automática y espacio para firma. Sin DNI ni dirección, IA ni conversor HTML.

Firma/texto muestran el PDF generado con PDF.js; se descarga ese mismo archivo. La transformación inversa del viewport contempla rotación, CropBox y UserUnit. Se renderizan también las apariencias de anotaciones existentes. Hasta 80 bloques (2.000 caracteres cada uno); máximo 20 firmas y 40 MB de PDF + imágenes preparadas; plantillas hasta 60.000 caracteres / 80 páginas. Los cierres de las cartas conservan juntas las últimas seis líneas. Cambiar de herramienta o reiniciar descarta el contenido; regresar al formulario descarta solo la edición del texto final.

Baja voluntaria: revisa el preaviso en contrato y convenio. No se calculan plazos, indemnizaciones ni obligaciones. Referencia oficial verificada el 2026-10-06: [Estatuto de los Trabajadores, artículo 49.1.d, BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a49). No se presupone un plazo universal.

**Límites:** 20 archivos; 15 MB por archivo; 40 MB en total; 80 páginas por operación. Exportación de imágenes: 30 páginas, lado máximo 1.800 px/3 MP. Entrada de imágenes: 24 MP, ajustada a 2.400 px al crear PDF. Resultado máximo: 60 MB. Configuración central en `src/config.ts`.

**Limitaciones:** recortar modifica CropBox, no elimina información oculta; no usarlo para censura. PDFs cifrados no compatibles. Se bloquean PDFs con formularios y firmas digitales antes de modificarlos. Se inspeccionan campos de firma, diccionarios de firma, ByteRange y DocMDP, incluso sin AcroForm; no se validan certificados ni se pretende conservar firmas al modificar. Para firmar visualmente, utiliza el original sin firmar. Rellenar formularios existentes queda pendiente. Copiar páginas puede perder marcadores/enlaces internos a otras páginas. Textos: letras latinas/WinAnsi (tildes, ñ, ü, €), normalización NFC, sin emojis ni alfabetos no compatibles. Numeración al pie y marca diagonal, sin editor visual. Archivos muy complejos pueden exceder la memoria disponible incluso bajo los límites: se recomienda dividirlos. En iOS la descarga puede abrir una vista previa: Compartir → Guardar en Archivos.

## Desarrollo

Node 22.12+ o 24. `npm ci`, `npm run dev`, `npm run build`, `npm run preview`. Para QA: `npx playwright install --with-deps chromium webkit`, después `npm test`. Proyectos: `chromium-desktop` (1440 px), `chromium-mobile` (390 px, táctil), `webkit-mobile` (perfil iPhone 13). Se puede indicar `CHROMIUM_EXECUTABLE` si el entorno aporta un navegador y `QA_ISOLATED_BROWSER=1` para contenedores que requieran un proceso por prueba; `DEMO_URL` permite comprobar la publicación.

`npm run publish:files` copia el build únicamente a `docs/mytools/`; commit/push activa el Pages existente (main:/docs). No requiere Actions propio. Rutas hash compatibles con recarga y base de Vite configurada.

`src/config.ts` registra herramientas; `App.tsx` genera catálogo/rutas; `Workspace.tsx` comparte interacción; `engine.ts` implementa operaciones. `PdfEditor.tsx` comparte firma/texto; `documentEngine.ts` coloca contenido y pagina documentos; `PdfPreview.tsx` renderiza el resultado. `templates.ts` registra campos, validación y funciones deterministas: añadir una entrada incorpora otra plantilla sin cambiar el flujo. `Templates.tsx` gestiona formulario y revisión. PDF.js y motor cargados bajo demanda; miniaturas y exportaciones secuenciales. Todo recurso de PDF.js es local. No se guarda contenido en localStorage, IndexedDB o servidores. CSP restringe conexiones al propio origen.

## QA

Pruebas de navegador con fixtures pequeños generados en memoria; se abren los PDF y ZIP descargados para comprobar cantidad/orden, dimensiones, rotación, contenido de marca/numeración y CropBox. También inválidos/dañados/cifrados, formularios, rangos, límites de archivos/tamaño/páginas/resolución, reintento, selección/arrastre, responsive, recarga, consola y ausencia de uploads/terceros. `tests/fixtures/protected.pdf` es un PDF vacío de prueba, sin datos de usuarios.

Build correcto. **76 pruebas pasadas** (38 escritorio + 38 móvil) en Chromium: 60 regresiones originales y 16 casos nuevos. Firma dibujada con ratón y eventos táctiles emulados por CDP; PNG/JPG, arrastre, controles accesibles, tamaño, reinicio y descarga. Texto multipágina/multibloque, tildes/ñ, teclado, errores y recuperación. Posiciones verificadas mediante píxeles en rotaciones 0/90/180/270, CropBox desplazado, tamaños distintos y UserUnit=2; PDF descargado reabierto y comparado con el raster de previsualización. Anotaciones con apariencia conservadas. Firmas/campos de firma y formularios bloqueados con fixtures estructurales (no validación criptográfica). Tres plantillas, campos vacíos/obligatorios, edición final, A4 y texto largo multipágina. Sin uploads/terceros, localStorage vacío, sin errores de consola; navegación rápida también descarta datos.

Capturas revisadas a 1440 y 390 px, sin desbordamientos; selectores de archivo visibles y acceso entre vista/controles en móvil. Comando de este entorno: `CHROMIUM_EXECUTABLE=/workspace/scratch/browser-qa/chromium QA_ISOLATED_BROWSER=1 npm test -- --project=chromium-desktop --project=chromium-mobile`. No se ha probado Safari físico ni WebKit en esta iteración: la descarga de navegadores devolvió archivos incompletos y el WebKit disponible carece de bibliotecas de sistema. El perfil móvil de Chromium no equivale a Safari real.

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
