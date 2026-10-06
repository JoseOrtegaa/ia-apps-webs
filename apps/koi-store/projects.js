// Añade una entrada y su captura en assets/. El orden menor aparece primero.
export const projects = [
  {
    id: 'huroner-survivor', name: 'Huroner Survivor', type: 'juego',
    description: 'Un hurón, una espada y diez minutos frente a hordas mutantes. Elige mejoras y enfréntate a sus jefes.',
    url: 'https://joseortegaa.github.io/ai-web-games-automata/huroner-survivor/',
    thumbnail: './assets/huroner-survivor.webp',
    alt: 'Pantalla de Huroner Survivor, con su hurón armado y el bosque de El último claro.',
    tags: ['Supervivencia', 'Acción'], status: 'testing', order: 1,
  },
  {
    id: 'ferret-jump', name: 'Ferret Jump', type: 'juego',
    description: 'Una casa enorme para un pequeño hurón. Salta entre plataformas, recoge croquetas y descubre pasadizos.',
    url: 'https://joseortegaa.github.io/ai-web-games-automata/huroner-platformer/dist/',
    thumbnail: './assets/ferret-jump.webp',
    alt: 'Pantalla de Ferret Jump: La casa dormida, un plataformas de estética pixel art.',
    tags: ['Plataformas', 'Pixel art'], status: 'testing', order: 2,
  },
  {
    id: 'mytools', name: 'MyTools', type: 'app',
    description: 'Convierte imágenes a PDF, une, divide y organiza páginas. Tus archivos se procesan en tu dispositivo.',
    url: 'https://joseortegaa.github.io/ia-apps-webs/mytools/',
    thumbnail: './assets/mytools.webp',
    alt: 'Interfaz real de MyTools con su colección de herramientas para archivos PDF.',
    tags: ['PDF', 'Productividad', 'Archivos'], status: 'testing', order: 3,
  },
];
