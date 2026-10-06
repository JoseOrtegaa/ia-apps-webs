# MyTools

Hereda AGENTS.md raíz y PROTOTYPE_FAST; un solo agente. **0 €**, sin backend, APIs, cuentas, analítica ni almacenamiento de documentos/datos personales/firmas.

## Producto
Colección ampliable de utilidades para archivos, mobile-first. Elegir → ajustar/previsualizar → descargar/reiniciar. Conservar diseño verde/crema, accesibilidad y límites. Validar archivos descargados, no solo mensajes.

## Arquitectura
React + TypeScript + Vite. `config.ts`: TOOLS y límites; `App.tsx`: catálogo y rutas hash, reinicia herramientas al navegar. `Workspace.tsx`/`engine.ts`: 11 operaciones originales. `PdfEditor.tsx`: firma visual y texto multipágina; `documentEngine.ts`: composición mediante transformación inversa del viewport (rotación/CropBox/UserUnit), texto WinAnsi español y paginación A4. `PdfPreview.tsx` renderiza el mismo PDF descargable, incluidas apariencias de anotaciones. `templates.ts`: registro determinista de campos/validación/textos; `Templates.tsx`: formulario → texto editable → PDF.

13 herramientas PDF y categoría Documentos con carta, solicitud y baja voluntaria española. Esta última no calcula preavisos/indemnizaciones; nota y referencia BOE en README. Firmar no incorpora certificado. Añadir texto no edita ni elimina contenido original. Formularios existentes pendientes: mantener bloqueo. Detectar firmas/campos de firma/ByteRange/DocMDP antes de cualquier modificación; no sugerir aplanar para preservar certificados.

pdf-lib, PDF.js local y fflate; cinco dependencias contando React/ReactDOM. Sin CDN. Datos solo en memoria; URLs revocadas, canvas/workers liberados.

## Límites
20 archivos, 15 MB/archivo, 40 MB total, 80 páginas; imágenes 24 MP, ajuste 2.400 px; exportar 30 páginas/1.800 px; salida 60 MB. Editor: 80 bloques, 2.000 caracteres/bloque, 20 firmas/40 MB preparados. Plantillas: 60.000 caracteres/80 páginas.

## Operación
`npm ci`; `npm run dev`; `npm run build`; `npm test`; `npm run publish:files` modifica solo `docs/mytools/`. Pages main:/docs.
Demo: https://joseortegaa.github.io/ia-apps-webs/mytools/.
QA, compatibilidad y fuentes: README. Pendiente Safari físico; ampliar solo a petición.
