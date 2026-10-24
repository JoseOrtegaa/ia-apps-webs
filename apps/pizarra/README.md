# Koi Pizarra

Un lienzo para dibujar ideas, explicar flujos y planear juegos. Adaptado a móvil y escritorio, sin cuentas, backend, dependencias de ejecución ni servicios externos.

**Abrir:** https://joseortegaa.github.io/ia-apps-webs/pizarra/ · Disponible desde Koi Store.

## Uso

- Lápiz opaco, marcador semitransparente y resaltador. Seis colores, grosor ajustable y suavizado opcional. Las líneas casi rectas se enderezan; las curvas y la escritura conservan su forma.
- Borrador de partes del trazo: las zonas restantes conservan el color, la transparencia y la forma de las curvas, y siguen siendo un solo elemento al seleccionarlas; las líneas y flechas se eliminan como elementos completos. Los objetos se borran con Seleccionar → papelera.
- Texto, flechas, líneas y nueve objetos: base de datos, carpeta, documento, servidor, jugador, nota adhesiva, rectángulo, elipse y decisión.
- Seleccionar permite mover dibujos y objetos. Los objetos se redimensionan por la esquina inferior derecha y su texto crece o disminuye a la vez. Edición de texto, duplicado, color y orden de capas.
- Selecciona un texto u objeto para ajustar **Letra** con el deslizador o el campo numérico. En objetos, el máximo depende de la forma, el tamaño y el texto; la etiqueta queda dentro de su región. En Texto puedes elegir el tamaño antes de escribir. La figura de jugador contiene su etiqueta dentro del torso.
- Deshacer/rehacer hasta 40 estados, sujeto al límite de memoria del historial. Menú → Vaciar o Cargar ejemplo siempre pide confirmación y admite deshacer.
- El lienzo continúa más allá de la pantalla: arrastra con Mano o dos dedos para descubrir nuevas zonas. Junta los dedos para alejar y ver más espacio; sepáralos para acercar. También admite rueda, Ctrl/⌘ + rueda, Ctrl/⌘ + `+`/`−`/`0`, botones de zoom y Ver todo. Zoom del lienzo entre 5 % y 800 %. Shift mantiene líneas/flechas en ángulos de 45°.
- Los gestos no amplían la página ni sus controles. Las herramientas quedan fijas mientras se mueve o amplía la pizarra. El segundo dedo cancela cualquier trazo provisional y permite navegar incluso con Texto activo.
- Exportar una imagen PNG de todo el contenido (sin controles) o un archivo `.koi.json` editable que otra persona puede abrir desde el menú. Incluye un ejemplo de diseño de juego que se carga solo bajo petición.
- La app ocupa el área visible completa. El botón Pantalla completa usa la API del navegador; donde no está disponible muestra una vista despejada. En iPhone se puede añadir a inicio para ocultar la interfaz del navegador.
- Atajos: V seleccionar, H mano, P dibujar, E borrar, A flecha, L línea, T texto, O objetos, Ctrl/⌘ Z deshacer, Ctrl/⌘ Mayús Z rehacer, Ctrl/⌘ S guardar, Ctrl/⌘ D duplicar. Flechas mueven el elemento seleccionado, Shift + flechas mueve 10 unidades y Supr lo elimina.

## Datos y límites

Copia automática en `localStorage`, clave `koi-pizarra-v1`, incluyendo posición y zoom. No sale del navegador. La copia es específica de este dispositivo/perfil y puede desaparecer al borrar los datos del sitio; exporta un archivo para conservarla o compartirla. Vaciar pizarra sustituye la copia automática por una pizarra vacía. Si el almacenamiento falla, se indica y se ofrece exportar.

Esta versión no incorpora colaboración simultánea, sincronización remota, ajuste de presión del lápiz ni conectores anclados a objetos: las flechas se mueven independientemente. El historial no se conserva al recargar.

Máximo 1.500 elementos, 150.000 puntos, 12.000 puntos por trazo y archivo editable de 4 MB. El historial mantiene hasta 40 estados / aproximadamente 12 MB de texto (al menos los dos estados recientes). PNG limitado a 4.096 px por lado y 12 megapíxeles. Los objetos tienen tamaños mínimos para evitar geometrías ilegibles. Los textos demasiado largos para el objeto se muestran con puntos suspensivos: amplía el objeto; el texto completo permanece editable.

## Desarrollo y publicación

HTML/CSS/JavaScript nativo y SVG. `model.js` contiene geometría, historial, límites y validación; `text-layout.js` ajusta y limita las etiquetas; `viewport.js` contiene los cálculos de cámara y los bloqueos de zoom nativo; `render.js` dibuja elementos y compone SVG para PNG; `app.js` gestiona interacción, persistencia y archivos. Los textos importados se insertan como nodos de texto, nunca como HTML.

Desde la raíz del repositorio:

```sh
node --test apps/pizarra/scripts/*.test.mjs
node apps/pizarra/scripts/publish.mjs
```

El script copia únicamente archivos públicos a `docs/pizarra/`. GitHub Pages publica `main:/docs`. Para servir en desarrollo fuera de Work Mode, usa un servidor estático sobre `docs/` y abre `/pizarra/`; los módulos ES requieren HTTP. No se publican tests ni dependencias.

## Verificación

2026-10-24: 22 pruebas automatizadas pasan: dibujo y borrado, historial, importación y límites, geometría, escalado y ajuste de etiquetas, compatibilidad de tamaños con pizarras antiguas, cámara, pellizco y bloqueo de gestos nativos; borrado repetido de resaltadores, curvas, movimiento de todas las partes, deshacer/rehacer y persistencia de trazos con huecos. Comprobación sintáctica con Node de todos los módulos.

`scripts/browser-qa.html` añade 17 comprobaciones de interacción sobre una instancia real de la app: cancelación del trazo al iniciar pellizco, zoom solo en el lienzo, continuidad con un dedo, herramientas fijas, Texto durante pellizco, etiqueta de jugador dentro del torso, redimensionado con fuente proporcional, límite de letra y texto libre. Ejecutadas en Chromium a 390 × 844, 320 × 720, 844 × 390 y 1366 × 900. Abrir esta página de prueba desde un servidor sobre `apps/pizarra/`; usa la copia local del origen de desarrollo y deja los elementos creados para inspección. No se copia a `docs/`.

QA en Chromium con interfaz de escritorio y ventanas de app de 390 × 844 y 320 × 720 mediante iframes: dibujo, borrado parcial, deshacer, inserción/edición/movimiento/redimensionado de base de datos, zoom y ajuste, menús y diálogos. Descargados PNG real y JSON; PNG decodificado como 1898 × 828, JSON validado y reimportado. Archivo inválido rechazado manteniendo el contenido. Restauración tras recarga comprobada. Miniatura obtenida del ejemplo funcional. Los gestos de las comprobaciones usan Pointer Events sintéticos; no probado en Safari/iPhone físico ni con gestos multitáctiles reales.

`scripts/eraser-browser-qa.html` reproduce el borrado de un trazo que pasa varias veces por la misma zona. Doce comprobaciones en Chromium verifican que el color no cambia fuera del borrado con opacidades de 28 %, 65 % y 100 %, que los huecos se conservan tras guardar/abrir y exportar, y que la curva mantiene su forma (tolerancia de un píxel en el borde suavizado). Flujo de dibujar, borrar, deshacer, rehacer y recargar comprobado también en la app. Esta página de prueba no se publica.
