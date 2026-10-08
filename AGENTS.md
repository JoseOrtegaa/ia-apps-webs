# ia-apps-webs — reglas mínimas

Desarrolla directamente con una sola sesión de IA y GitHub: **sin subagentes, roles separados, fases ceremoniales ni documentos de contexto por app**.

- Objetivo: microapps web funcionales, sencillas, visualmente cuidadas y cómodas en iPhone/móvil y escritorio.
- Antes de editar, inspecciona la rama actual, el código afectado y el README de la app. Respeta cambios existentes. No modifiques otras apps.
- Prioriza HTML/CSS/JS para apps simples; React + Vite + TypeScript cuando aporte valor. Evita abstracciones, dependencias y backend innecesarios.
- **Presupuesto autorizado: 0 €.** Procesa archivos en el navegador siempre que sea viable. No añadas servicios de pago, APIs externas facturables ni infraestructura con coste sin autorización previa y límites verificables. Si se plantea backend, consulta [COSTES.md](COSTES.md). Nunca publiques secretos.
- Mantén accesibilidad, controles táctiles, diseño adaptable y estados de error útiles. No presentes funciones ficticias como operativas.
- Ejecuta pruebas proporcionales al cambio; build y flujo principal cuando corresponda. Corrige errores antes de integrar y no inventes pruebas realizadas.
- GitHub Pages publica desde `main:/docs`. Actualiza solo `docs/<app>/` usando su script de publicación; nunca borres otras apps. Confirma la URL publicada si es posible.
- Entrega un resumen breve: cambios, pruebas reales, commit y enlace. Modifica README solo si cambia la forma de usar o desarrollar la app.
