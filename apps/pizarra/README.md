# Koi Pizarra

Un lienzo para dibujar ideas, explicar flujos y planear juegos. Adaptado a móvil y escritorio, sin cuentas, backend, dependencias de ejecución ni servicios externos.

**Abrir:** https://joseortegaa.github.io/ia-apps-webs/pizarra/ · Disponible desde Koi Store.

## Uso

- Lápiz opaco, marcador semitransparente y resaltador. Seis colores, grosor ajustable y suavizado opcional. Las líneas casi rectas se enderezan; las curvas y la escritura conservan su forma.
- Borrador de partes del trazo; las líneas y flechas se eliminan como elementos completos. Los objetos se borran con Seleccionar → papelera.
- Texto, flechas, líneas y nueve objetos: base de datos, carpeta, documento, servidor, jugador, nota adhesiva, rectángulo, elipse y decisión.
- Seleccionar permite mover dibujos y objetos. Los objetos se redimensionan por la esquina inferior derecha. Edición de texto, duplicado, color y orden de capas.
- Deshacer/rehacer hasta 40 estados, sujeto al límite de memoria del historial. Menú → Vaciar o Cargar ejemplo siempre pide confirmación y admite deshacer.
- Mano, rueda y dos dedos para desplazar el lienzo; pellizco o Ctrl/⌘ + rueda para ampliar. Botones de zoom y Ver todo. Shift mantiene líneas/flechas en ángulos de 45°.
- Exportar una imagen PNG de todo el contenido (sin controles) o un archivo `.koi.json` editable que otra persona puede abrir desde el menú. Incluye un ejemplo de diseño de juego que se carga solo bajo petición.
- La app ocupa el área visible completa. El botón Pantalla completa usa la API del navegador; donde no está disponible muestra una vista despejada. En iPhone se puede añadir a inicio para ocultar la interfaz del navegador.
- Atajos: V seleccionar, H mano, P dibujar, E borrar, A flecha, L línea, T texto, O objetos, Ctrl/⌘ Z deshacer, Ctrl/⌘ Mayús Z rehacer, Ctrl/⌘ S guardar, Ctrl/⌘ D duplicar. Flechas mueven el elemento seleccionado, Shift + flechas mueve 10 unidades y Supr lo elimina.

## Datos y límites

Copia automática en `localStorage`, clave `koi-pizarra-v1`, incluyendo posición y zoom. No sale del navegador. La copia es específica de este dispositivo/perfil y puede desaparecer al borrar los datos del sitio; exporta un archivo para conservarla o compartirla. Vaciar pizarra sustituye la copia automática por una pizarra vacía. Si el almacenamiento falla, se indica y se ofrece exportar.

Esta versión no incorpora colaboración simultánea, sincronización remota, ajuste de presión del lápiz ni conectores anclados a objetos: las flechas se mueven independientemente. El historial no se conserva al recargar.

Máximo 1.500 elementos, 150.000 puntos, 12.000 puntos por trazo y archivo editable de 4 MB. El historial mantiene hasta 40 estados / aproximadamente 12 MB de texto (al menos los dos estados recientes). PNG limitado a 4.096 px por lado y 12 megapíxeles. Los objetos tienen tamaños mínimos para evitar geometrías ilegibles. Los textos demasiado largos para el objeto se muestran con puntos suspensivos: amplía el objeto; el texto completo permanece editable.

## Desarrollo y publicación

HTML/CSS/JavaScript nativo y SVG. `model.js` contiene geometría, historial, límites y validación; `render.js` dibuja elementos y compone SVG para PNG; `app.js` gestiona interacción, persistencia y archivos. Los textos importados se insertan como nodos de texto, nunca como HTML.

Desde la raíz del repositorio:

```sh
node --test apps/pizarra/scripts/model.test.mjs
node apps/pizarra/scripts/publish.mjs
node apps/koi-store/scripts/publish.mjs
```

El script copia únicamente archivos públicos a `docs/pizarra/`. GitHub Pages publica `main:/docs`. Para servir en desarrollo fuera de Work Mode, usa un servidor estático sobre `docs/` y abre `/pizarra/`; los módulos ES requieren HTTP. No se publican tests ni dependencias.

## Verificación

2026-10-24: siete pruebas automatizadas pasan (líneas nerviosas, curvas, borrador de segmentos y puntos, historial/ramificación, validación de importación y límites, movimiento y geometría). Comprobación sintáctica con Node de todos los módulos.

QA en Chromium con interfaz de escritorio y ventanas de app de 390 × 844 y 320 × 720 mediante iframes: dibujo, borrado parcial, deshacer, inserción/edición/movimiento/redimensionado de base de datos, zoom y ajuste, menús y diálogos. Descargados PNG real y JSON; PNG decodificado como 1898 × 828, JSON validado y reimportado. Archivo inválido rechazado manteniendo el contenido. Restauración tras recarga comprobada. Miniatura obtenida del ejemplo funcional. No probado en Safari/iPhone físico ni con gestos multitáctiles reales.
