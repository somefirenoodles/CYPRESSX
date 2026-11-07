<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Casos de uso de Superpay

Línea base ERS-001. Los flujos definen el contrato objetivo; consultar la matriz para implementación y evidencia.

## CU-AUT-01 — Iniciar sesión

**Actor:** Usuario registrado. **Requisitos:** RF-AUT-01, RNF-COM-01, RNF-SEC-01, RNF-FLE-01.

**Precondiciones:**

- El usuario existe y está activo.
- El usuario conoce sus credenciales.

**Disparador:** El usuario envía usuario y contraseña desde la pantalla de acceso.

**Flujo principal:**

1. El sistema recibe las credenciales por canal local.
2. El servidor valida la contraseña contra el almacenamiento no reversible.
3. El servidor crea la sesión asociada al usuario correcto.
4. El sistema redirige al dashboard privado.

**Alternativas y excepciones:**

- Si ya existe una sesión válida, se reutiliza o se solicita reautenticación según política.

**Éxito:** La sesión queda asociada al usuario y el dashboard muestra solo sus datos.

**Fallo:** Las credenciales inválidas producen una respuesta no autenticada genérica sin revelar si el usuario existe.

## CU-AUT-02 — Registrar cuenta

**Actor:** Visitante. **Requisitos:** RF-AUT-02.

**Precondiciones:**

- El identificador no está registrado.
- El visitante dispone de datos obligatorios válidos.

**Disparador:** El visitante envía el formulario de registro.

**Flujo principal:**

1. El sistema valida campos obligatorios y formato.
2. El sistema comprueba contraseña y confirmación.
3. El servidor verifica unicidad del identificador.
4. El servidor almacena la contraseña de forma no reversible y crea el usuario.

**Alternativas y excepciones:**

- Si el identificador ya existe, se rechaza el registro sin crear un segundo usuario.

**Éxito:** El usuario queda registrado una sola vez y puede iniciar sesión.

**Fallo:** Campos inválidos, confirmación distinta o duplicado producen rechazo sin registro parcial.

## CU-TX-01 — Realizar pago

**Actor:** Usuario autenticado con saldo. **Requisitos:** RF-TX-01, RF-TX-06, RF-TX-07, RF-TX-08, RNF-FUN-01, RNF-COM-01, RNF-INT-01, RNF-REL-01, RNF-MAN-01, RNF-SAF-01, RNF-USO-01, RNF-SAT-01, RF-LED-01.

**Precondiciones:**

- El pagador tiene sesión válida.
- El destinatario existe.
- El importe es positivo y no supera el saldo.

**Disparador:** El pagador confirma un pago indicando destinatario, importe y moneda.

**Flujo principal:**

1. El cliente envía la orden con clave idempotente.
2. El servidor valida sesión, destinatario, importe, saldo y moneda.
3. El servidor debita al pagador, acredita al destinatario y registra el ledger en una transacción.
4. El servidor devuelve el resultado sin datos de terceros.

**Alternativas y excepciones:**

- Si la clave ya existe con el mismo payload, se devuelve el resultado original.
- Si la clave existe con payload distinto, se rechaza sin ejecutar.

**Éxito:** El pago se ejecuta exactamente una vez y los saldos y el ledger cuadran.

**Fallo:** Validación, saldo insuficiente, falta de autorización o conflicto de idempotencia impiden el movimiento.

## CU-TX-02 — Crear solicitud de pago

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-02, RF-TX-06, RF-TX-08, RNF-USO-01.

**Precondiciones:**

- El solicitante tiene sesión válida.
- El destinatario existe.

**Disparador:** El solicitante envía una solicitud de pago.

**Flujo principal:**

1. El servidor valida sesión, destinatario, importe y moneda.
2. El servidor crea la solicitud en estado pendiente.
3. El servidor asocia la clave idempotente y devuelve la solicitud.

**Alternativas y excepciones:**

- Si la clave se repite con el mismo payload, se devuelve la solicitud existente.
- Si el destinatario no existe, no se crea nada.

**Éxito:** Existe una solicitud pendiente y ningún saldo cambió.

**Fallo:** La validación o el conflicto de idempotencia impiden la creación y no dejan efectos parciales.

## CU-TX-03 — Consultar historial, detalle y estado

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-03, RF-TX-08, RF-TX-09, RF-TX-10, RNF-FUN-01, RNF-REL-01, RF-LED-01.

**Precondiciones:**

- El usuario tiene sesión válida.
- El usuario es participante o titular del recurso consultado.

**Disparador:** El usuario abre el historial o solicita el detalle de una transacción.

**Flujo principal:**

1. El servidor identifica al usuario de la sesión.
2. El servidor filtra movimientos y solicitudes por participación.
3. El servidor devuelve importe, tipo, fecha, participantes y estado.
4. El cliente muestra el historial o detalle permitido.

**Alternativas y excepciones:**

- Si no hay movimientos, se muestra un estado vacío.
- Si la transacción no existe o es ajena, se responde sin revelar datos.

**Éxito:** El usuario ve solo sus movimientos con datos completos y orden estable.

**Fallo:** Sin sesión, recurso ajeno o identificador inexistente se rechaza la consulta.

## CU-TX-04 — Aceptar solicitud de pago

**Actor:** Destinatario de la solicitud. **Requisitos:** RF-TX-04, RF-TX-06, RF-TX-08, RNF-PER-01.

**Precondiciones:**

- La solicitud está pendiente.
- El actor es el destinatario.
- El destinatario tiene saldo suficiente.

**Disparador:** El destinatario confirma la aceptación.

**Flujo principal:**

1. El servidor valida actor, estado y saldo.
2. El servidor debita al destinatario, acredita al solicitante y registra el ledger.
3. El servidor cambia el estado a aceptada.
4. El servidor devuelve el resultado idempotente.

**Alternativas y excepciones:**

- Una segunda aceptación devuelve conflicto o el resultado original sin nuevo débito.

**Éxito:** El pago se ejecuta una vez y la solicitud queda aceptada.

**Fallo:** Actor incorrecto, estado no pendiente o saldo insuficiente impiden el movimiento.

## CU-TX-05 — Rechazar solicitud de pago

**Actor:** Destinatario de la solicitud. **Requisitos:** RF-TX-05, RF-TX-06, RF-TX-08, RNF-SEC-01.

**Precondiciones:**

- La solicitud está pendiente.
- El actor es el destinatario.

**Disparador:** El destinatario confirma el rechazo.

**Flujo principal:**

1. El servidor valida actor y estado.
2. El servidor cambia el estado a rechazada.
3. El servidor registra el evento sin movimiento financiero.

**Alternativas y excepciones:**

- Un rechazo repetido devuelve el resultado original sin efectos adicionales.

**Éxito:** La solicitud queda rechazada y ningún saldo cambió.

**Fallo:** Actor incorrecto o estado no pendiente impiden el rechazo.

## CU-CTA-01 — Administrar cuentas bancarias de prueba

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-08, RF-CTA-01, RNF-SEC-01.

**Precondiciones:**

- El usuario tiene sesión válida.

**Disparador:** El usuario lista, asocia o deshabilita una cuenta vinculada.

**Flujo principal:**

1. El servidor valida sesión y titularidad.
2. El servidor valida los datos de asociación.
3. El servidor persiste el cambio de forma íntegra.
4. El sistema muestra los identificadores minimizados.

**Alternativas y excepciones:**

- Si la validación falla, no se persiste ningún cambio.

**Éxito:** El usuario administra solo sus cuentas vinculadas con datos minimizados.

**Fallo:** Datos inválidos, cuenta ajena o fallo de persistencia se rechazan sin estado parcial.

## CU-CON-01 — Gestionar contactos

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-08, RF-CON-01.

**Precondiciones:**

- El usuario tiene sesión válida.

**Disparador:** El usuario busca usuarios y agrega o elimina un contacto.

**Flujo principal:**

1. El servidor busca solo usuarios visibles.
2. El servidor muestra información mínima permitida.
3. El servidor crea o elimina la relación propia sin duplicados.
4. El servidor conserva usuarios y transacciones históricas.

**Alternativas y excepciones:**

- Si la relación ya existe, no se duplica.
- Si la operación no está implementada, se declara no disponible.

**Éxito:** La relación de contacto queda gestionada solo por su propietario.

**Fallo:** Usuario no visible, relación duplicada o acceso ajeno se rechazan sin borrar historial.

## CU-GAS-01 — Dividir un gasto

**Actor:** Organizador autenticado. **Requisitos:** RF-TX-07, RF-TX-08, RF-GAS-01, RNF-INT-01, RNF-USO-01, RNF-SAT-01.

**Precondiciones:**

- El organizador tiene sesión válida.
- El importe es positivo.
- Los participantes son usuarios válidos y únicos.

**Disparador:** El organizador define importe, participantes y política de inclusión propia.

**Flujo principal:**

1. El sistema calcula el reparto exacto en centavos.
2. El sistema muestra el desglose antes de confirmar.
3. El organizador confirma con clave idempotente.
4. El servidor crea solicitudes pendientes individuales sin mover saldos.

**Alternativas y excepciones:**

- Si el organizador se incluye, no se crea solicitud contra sí mismo.
- Si el remanente no es divisible, se aplica el orden determinista.

**Éxito:** Las participaciones suman el total y existen solicitudes pendientes coherentes.

**Fallo:** Importe inválido, participantes duplicados, reintento o fallo de creación no dejan solicitudes parciales.

## CU-NOT-01 — Consultar notificaciones

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-08, RF-NOT-01, RNF-SEC-01.

**Precondiciones:**

- El usuario tiene sesión válida.

**Disparador:** El usuario abre su bandeja de notificaciones.

**Flujo principal:**

1. El servidor filtra eventos por destinatario.
2. El servidor devuelve solo eventos permitidos.
3. El cliente muestra la lista o el estado vacío.

**Alternativas y excepciones:**

- Si no hay eventos, se muestra un estado vacío explícito.

**Éxito:** El usuario ve solo sus notificaciones sin eventos de terceros.

**Fallo:** Sin sesión o con error de filtrado no se exponen eventos ajenos.

## CU-FX-01 — Cotizar conversión

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-07, RF-FX-01.

**Precondiciones:**

- El usuario tiene sesión válida.
- El par de monedas es soportado.

**Disparador:** El usuario solicita una cotización para un pago.

**Flujo principal:**

1. El servidor valida el par y el importe.
2. El servidor calcula la tasa y la vigencia en unidades menores.
3. El servidor devuelve la cotización.
4. El pago puede aplicar la cotización de forma opcional.

**Alternativas y excepciones:**

- Si la cotización vence, el pago se rechaza y debe solicitarse otra.

**Éxito:** El pago aplica exactamente el importe cotizado y el ledger cuadra.

**Fallo:** Par inválido, cotización vencida o error de cálculo impiden el pago.

## CU-REC-01 — Programar pago recurrente

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-07, RF-TX-08, RF-REC-01.

**Precondiciones:**

- El usuario tiene sesión válida.
- El destinatario existe.

**Disparador:** El usuario crea o modifica una recurrencia.

**Flujo principal:**

1. El servidor valida periodicidad, importe, moneda y fecha UTC.
2. El servidor persiste la recurrencia y su próxima ejecución.
3. El worker de 30 segundos procesa las ocurrencias vencidas.
4. El sistema registra pago y asiento una sola vez por ocurrencia.

**Alternativas y excepciones:**

- Con saldo insuficiente se marca failed y se aplican hasta tres reintentos visibles 1h/24h/72h.
- El propietario puede pausar o reanudar; otro usuario no.

**Éxito:** La recurrencia se ejecuta según calendario UTC con efectos únicos y visibles.

**Fallo:** Datos inválidos, falta de autorización o fallo de ejecución no duplican pagos ni dejan estados inconsistentes.

## CU-COM-01 — Pagar a comercio

**Actor:** Usuario autenticado. **Requisitos:** RF-TX-08, RF-COM-01, RNF-SAF-01, RF-LED-01.

**Precondiciones:**

- El usuario tiene sesión válida.
- El comercio existe y está activo.

**Disparador:** El usuario confirma un pago a comercio.

**Flujo principal:**

1. El servidor valida sesión, comercio, importe y moneda.
2. El servidor debita al pagador y acredita al comercio.
3. El servidor registra el asiento en el ledger.
4. El sistema muestra el resultado con importe, moneda y estado.

**Alternativas y excepciones:**

- Si el comercio no existe o está inactivo, se rechaza sin movimiento.

**Éxito:** El pago al comercio se registra una vez y los saldos cuadran.

**Fallo:** Validación, saldo insuficiente o comercio inválido impiden el movimiento.

## CU-SBX-01 — Realizar operaciones de saldo

**Actor:** Usuario autenticado. **Requisitos:** RF-SBX-01, RNF-FLE-01, RF-LED-01.

**Precondiciones:**

- El usuario tiene sesión válida.

**Disparador:** El usuario solicita una recarga de saldo.

**Flujo principal:**

1. El servidor valida sesión y límites.
2. El servidor acredita el saldo y registra el asiento de origen correspondiente.
3. El sistema muestra el importe, la moneda y el estado de la operación.

**Alternativas y excepciones:**

- Un reintento con la misma clave no duplica la recarga.

**Éxito:** El saldo y el ledger reflejan una única operación registrada.

**Fallo:** Sin sesión, fuera de límite o con error de persistencia no se acredita saldo.

## CU-ING-01 — Recibir un ingreso externo

**Actor:** Usuario autenticado o servicio de recepción. **Requisitos:** RF-TX-08, RF-ING-01, RNF-SAF-01, RF-LED-01.

**Precondiciones:**

- Existe una referencia externa única.
- La cuenta destino pertenece al usuario autorizado.

**Disparador:** Se registra un ingreso externo con referencia única.

**Flujo principal:**

1. El servidor valida referencia, importe, moneda y cuenta destino.
2. El servidor verifica que la referencia no haya sido aplicada.
3. El servidor acredita el saldo y registra el asiento de origen externo.
4. El sistema muestra el importe, la moneda, la referencia y el estado.

**Alternativas y excepciones:**

- Si la referencia ya existe con el mismo payload, se devuelve el resultado original.
- Si la referencia existe con datos distintos, se rechaza.

**Éxito:** El ingreso se aplica una sola vez con referencia única y trazabilidad.

**Fallo:** Referencia duplicada en conflicto, datos inválidos o cuenta ajena impiden el crédito.

## CU-LED-01 — Contabilizar una operación confirmada

**Actor:** Sistema, por instrucción de un usuario autorizado. **Requisitos:** RF-LED-01.

**Precondiciones:**

- Operación confirmada y autorizada; importes exactos y cuentas válidas.

**Disparador:** El flujo confirmado solicita contabilización.

**Flujo principal:**

1. Reservar la intención por acción y clave, y comparar la huella del payload.
2. Construir las partidas con contrapartidas explícitas y validar suma cero por moneda.
3. Bloquear las cuentas afectadas en orden estable y comprobar disponibilidad desde el ledger.
4. Persistir el asiento, sus partidas y su contabilización, y actualizar las proyecciones de saldo.
5. Persistir estado y notificaciones locales y confirmar la transacción corta.

**Alternativas y excepciones:**

- Misma intención y payload: devolver el resultado guardado.
- Payload distinto, asiento desbalanceado o saldo insuficiente: rechazar y revertir todos los efectos.
- Fallo técnico antes del commit: revertir; el mismo comando puede reintentarse sin duplicar efectos.

**Éxito:** Un único asiento contabilizado, balanceado e inmutable; saldo proyectado conciliado y operación trazable.

**Fallo:** No queda efecto financiero parcial ni una intención completada sin su asiento.
