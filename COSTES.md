# Política obligatoria de costes y abuso

## Autorización

Presupuesto inicial: **0 €**. No contratar, activar facturación, añadir tarjetas, cambiar planes ni habilitar llamadas facturables sin autorización explícita de Jose. Informar SIEMPRE antes de activar o modificar una función que pueda generar gasto: proveedor, unidad facturable, estimación, máximo previsto, controles y riesgos residuales. La autorización debe indicar servicio, importe máximo y periodo. No aumentar esos límites silenciosamente.

Comprobar condiciones vigentes y sus fuentes antes de cada proveedor nuevo o cambio de plan. Una etiqueta «gratis» no prueba que exista un corte de facturación. Alertas de presupuesto no equivalen a límites duros.

## Controles para cualquier backend

- Aplicar límites de frecuencia en servidor por identidad cuando exista y por IP como complemento, además de un límite global. No confiar en contadores del navegador, CORS ni claves públicas como protección de gasto.
- Validar esquema, tamaño de cuerpo, paginación, rango de consultas y cantidad de resultados. Acotar duración, concurrencia, reintentos y fan-out. Evitar polling continuo; usar caché cuando proceda.
- Antes de cada operación facturable, reservar atómicamente una cuota global persistente y consistente, además de la cuota por usuario. Incluir concurrencia y reintentos; usar idempotencia cuando evite cobros duplicados. Nunca basar una cuota estricta solo en memoria o almacenamiento eventualmente consistente.
- Limitar unidades facturables por operación (tokens, duración, bytes, filas, etc.). Reservar el máximo posible y reconciliar únicamente con consumo confirmado; ante incertidumbre mantener la reserva.
- Si se supera una cuota o falla su comprobación, rechazar sin invocar al proveedor. Tener un interruptor de apagado en servidor y mensajes útiles de límite alcanzado.
- Proteger también las operaciones del propio limitador, almacenamiento, logs, transferencia y ejecución. Un rechazo en el handler puede seguir generando cargos de infraestructura. Preferir planes sin sobrecoste automático y límites del proveedor o del perímetro anteriores al cómputo facturable. Si no se puede acotar el gasto, no activar sin explicar esa limitación y acordar una alternativa.
- Autenticar cuando lo requieran los datos o funciones; para acceso anónimo costoso, añadir controles antiabuso adecuados sin considerar que sustituyen la cuota global. Secretos exclusivamente en servidor, nunca en variables `VITE_*`.

No prometer bloquear todas las peticiones de un atacante ni un coste cero garantizado por rate limiting. El objetivo verificable es impedir trabajo facturable fuera de las cuotas y reducir exposición a abuso.

## Ficha mínima por app con backend

Registrar en `apps/<slug>/COSTES.md`:

| Campo | Valor requerido |
| --- | --- |
| Servicio / plan / fuente / fecha | Condiciones verificadas |
| Función y unidad facturable | Qué puede cobrar al propietario |
| Autorización de Jose | Servicio, importe, periodo y fecha; pendiente por defecto |
| Cuota por usuario e IP | Límites concretos y ventana |
| Cuota global | Unidades, presupuesto y periodo |
| Máximo por operación | Consumo, concurrencia, timeout y reintentos |
| Control de infraestructura | Corte real disponible y limitaciones |
| Apagado | Ubicación del control y procedimiento |
| QA | Límite, concurrencia y fallo del contador verificados sin cargos |

Sin ficha completa y protección implementada, el endpoint facturable permanece desactivado. Esta base solo establece instrucciones: todavía no hay backend ni limitador implementado.
