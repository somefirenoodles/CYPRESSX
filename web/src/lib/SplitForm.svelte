<script lang="ts">
  import { api, idempotencyKey } from './api';

  type User = { id: number; name?: string; email?: string; [key: string]: any };
  type Share = { userId: number; amount: string };
  type Participant = { userId: number; amount: string; isOwner: boolean };
  type Preview = { participants: Participant[]; total?: string; currency?: string };
  type Payload = {
    title: string;
    total: string;
    currency: string;
    participantIds: number[];
    includeOwner: boolean;
    shares?: Share[];
  };

  let { userId, users = [], onchange = async () => {} } = $props<{
    userId: number;
    users?: User[];
    onchange?: () => Promise<void>;
  }>();

  let title = $state('');
  let total = $state('');
  let currency = $state('USD');
  let includeOwner = $state(true);
  let mode = $state<'equal' | 'custom'>('equal');
  let checkedIds = $state<number[]>([]);
  let manualIds = $state('');
  let customLines = $state('');

  let preview = $state<Preview | null>(null);
  let snapshot = $state<Payload | null>(null);
  let key = $state(idempotencyKey());
  let loading = $state(false);
  let error = $state('');
  let notice = $state('');

  const others = $derived(users.filter((user) => user.id !== userId));

  function messageOf(cause: unknown) {
    return cause instanceof Error && cause.message ? cause.message : 'No se pudo completar la operación.';
  }

  /* Cualquier cambio de datos invalida el preview y renueva la clave de idempotencia. */
  function invalidate() {
    preview = null;
    snapshot = null;
    error = '';
    notice = '';
    key = idempotencyKey();
  }

  function toggleUser(id: number, checked: boolean) {
    checkedIds = checked ? [...checkedIds, id] : checkedIds.filter((value) => value !== id);
    invalidate();
  }

  /* IDs: solo parseInt; nunca se convierten importes a número. */
  function parseManualIds() {
    const parts = manualIds.split(',').map((part) => part.trim()).filter((part) => part !== '');
    const ids: number[] = [];
    for (const part of parts) {
      if (!/^\d+$/.test(part)) return { ids: [] as number[], error: `ID inválido: "${part}". Usa enteros separados por coma.` };
      const id = parseInt(part, 10);
      if (ids.includes(id)) return { ids: [] as number[], error: `ID duplicado en el campo manual: ${id}.` };
      if (id === userId) return { ids: [] as number[], error: `El propietario (${userId}) no puede participar.` };
      ids.push(id);
    }
    return { ids, error: '' };
  }

  /* Unión de casillas e IDs manuales, sin duplicados en la interfaz. */
  const selection = $derived.by(() => {
    const manual = parseManualIds();
    const ids = [...checkedIds];
    for (const id of manual.ids) if (!ids.includes(id)) ids.push(id);
    return { ids, error: manual.error };
  });

  /* Importes siempre como texto: una línea "id:importe" por usuario requerido. */
  function parseCustom(participantIds: number[]) {
    const required = includeOwner ? [userId, ...participantIds] : [...participantIds];
    const shares: Share[] = [];
    for (const line of customLines.split('\n').map((value) => value.trim()).filter((value) => value !== '')) {
      const at = line.indexOf(':');
      if (at < 0) return { shares: [] as Share[], error: `Línea inválida: "${line}". Formato id:importe.` };
      const idText = line.slice(0, at).trim();
      const amount = line.slice(at + 1).trim();
      if (!/^\d+$/.test(idText)) return { shares: [] as Share[], error: `ID inválido en "${line}".` };
      if (amount === '') return { shares: [] as Share[], error: `Falta el importe en "${line}".` };
      const id = parseInt(idText, 10);
      if (shares.some((share) => share.userId === id)) return { shares: [] as Share[], error: `ID repetido en los importes: ${id}.` };
      shares.push({ userId: id, amount });
    }
    for (const id of required) if (!shares.some((share) => share.userId === id)) return { shares: [] as Share[], error: `Falta el importe del usuario ${id}.` };
    for (const share of shares) if (!required.includes(share.userId)) return { shares: [] as Share[], error: `El usuario ${share.userId} no participa en el reparto.` };
    return { shares, error: '' };
  }

  function buildPayload() {
    if (selection.error) return { payload: null as Payload | null, message: selection.error };
    if (title.trim() === '') return { payload: null as Payload | null, message: 'El título es obligatorio.' };
    if (total.trim() === '') return { payload: null as Payload | null, message: 'El total es obligatorio.' };
    if (!/^\d+([.,]\d{1,2})?$/.test(total.trim())) return { payload: null as Payload | null, message: 'El total debe ser un número decimal, por ejemplo 25.00.' };
    const payload: Payload = {
      title: title.trim(),
      total: total.trim(),
      currency,
      participantIds: selection.ids,
      includeOwner,
    };
    if (mode === 'custom') {
      const custom = parseCustom(selection.ids);
      if (custom.error) return { payload: null as Payload | null, message: custom.error };
      payload.shares = custom.shares;
    }
    return { payload, message: '' };
  }

  async function review() {
    const built = buildPayload();
    if (!built.payload) {
      preview = null;
      snapshot = null;
      notice = '';
      error = built.message;
      return;
    }
    loading = true;
    error = '';
    notice = '';
    try {
      const result = await api.splitPreview(built.payload);
      preview = result as Preview;
      snapshot = built.payload;
    } catch (cause) {
      preview = null;
      snapshot = null;
      error = messageOf(cause);
    } finally {
      loading = false;
    }
  }

  /* Confirmar envía el snapshot del preview, no el formulario mutable. */
  async function confirm() {
    if (!preview || !snapshot) {
      error = 'Revisa el reparto antes de confirmar.';
      return;
    }
    loading = true;
    error = '';
    notice = '';
    try {
      const result = await api.split({ ...snapshot, idempotencyKey: key });
      notice = result?.message ?? 'Reparto creado.';
      preview = null;
      snapshot = null;
      key = idempotencyKey();
      await onchange();
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      loading = false;
    }
  }

  /* Cancelar solo descarta el preview; no crea solicitudes. */
  function cancel() {
    preview = null;
    snapshot = null;
    error = '';
    notice = '';
  }
</script>

<div class="form-card">
  <h2>Dividir un pago</h2>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      review();
    }}
  >
    <div class="field-row">
      <label for="split-title">Título</label>
      <input id="split-title" type="text" bind:value={title} oninput={invalidate} disabled={loading} />
    </div>

    <div class="field-row">
      <label for="split-total">Total</label>
      <input id="split-total" type="text" inputmode="decimal" bind:value={total} oninput={invalidate} disabled={loading} />
      <p class="field-help">El importe se envía como texto; el servidor calcula las cuotas.</p>
    </div>

    <div class="field-row">
      <label for="split-currency">Moneda</label>
      <select id="split-currency" bind:value={currency} onchange={invalidate} disabled={loading}>
        <option value="USD">USD</option>
        <option value="COP">COP</option>
        <option value="CRC">CRC</option>
      </select>
    </div>

    <div class="field-row">
      <label>
        <input type="checkbox" bind:checked={includeOwner} onchange={invalidate} disabled={loading} />
        Incluirme en el reparto
      </label>
      <p class="field-help">El propietario se calcula aparte y nunca se envía en participantIds.</p>
    </div>

    {#if others.length > 0}
      <fieldset class="field-row">
        <legend>Participantes</legend>
        {#each others as user (user.id)}
          <label>
            <input
              type="checkbox"
              checked={checkedIds.includes(user.id)}
              onchange={(event) => toggleUser(user.id, event.currentTarget.checked)}
              disabled={loading}
            />
            {user.name ?? user.email ?? `Usuario ${user.id}`} (#{user.id})
          </label>
        {/each}
      </fieldset>
    {/if}

    <div class="field-row">
      <label for="split-manual">IDs adicionales</label>
      <input
        id="split-manual"
        type="text"
        inputmode="numeric"
        placeholder="12, 34"
        bind:value={manualIds}
        oninput={invalidate}
        disabled={loading}
      />
      <p class="field-help">Enteros separados por coma; repetir un ID es un error visible.</p>
    </div>

    <div class="field-row">
      <label>
        <input type="radio" value="equal" bind:group={mode} onchange={invalidate} disabled={loading} />
        Equitativo
      </label>
      <label>
        <input type="radio" value="custom" bind:group={mode} onchange={invalidate} disabled={loading} />
        Personalizado
      </label>
    </div>

    {#if mode === 'custom'}
      <div class="field-row">
        <label for="split-custom">Importes por usuario (id:importe)</label>
        <textarea id="split-custom" rows="5" bind:value={customLines} oninput={invalidate} disabled={loading}
          placeholder="1: 10.00"></textarea>
        <p class="field-help">Una línea exacta por usuario, incluido el propietario si está incluido. Los importes no se convierten a número.</p>
      </div>
    {/if}

    {#if error}
      <p class="alert" role="alert">{error}</p>
    {/if}
    {#if notice}
      <p class="alert" role="status">{notice}</p>
    {/if}

    <div class="field-row">
      <button class="primary" type="submit" disabled={loading}>Revisar reparto</button>
    </div>

    {#if preview}
      <div class="form-card">
        <h3>Reparto propuesto</h3>
        <ul>
          {#each preview.participants as participant (participant.userId)}
            <li>
              {participant.userId === userId ? 'Propietario' : `Usuario ${participant.userId}`}:
              {participant.amount}
              {preview.currency ?? currency}
              {#if participant.isOwner}(propietario){/if}
            </li>
          {/each}
        </ul>
        {#if preview.total !== undefined}
          <p class="field-help">Total: {preview.total} {preview.currency ?? currency}</p>
        {/if}
        <div class="field-row">
          <button class="primary" type="button" onclick={confirm} disabled={loading}>Confirmar reparto</button>
          <button class="secondary" type="button" onclick={cancel} disabled={loading}>Cancelar</button>
        </div>
      </div>
    {:else}
      <p class="field-help">Pulsa «Revisar reparto» para ver las cuotas exactas antes de confirmar.</p>
    {/if}
  </form>
</div>
