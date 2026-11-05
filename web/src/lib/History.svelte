<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from './api';

  type Item = {
    id: number;
    kind: 'operation' | 'request';
    description: string;
    type: string;
    status: string;
    amount: string;
    currency: string;
    createdAt: string;
    counterparty: string;
  };

  const TYPES = ['funding', 'merchant', 'recurring', 'sent', 'received', 'request'];
  const STATUSES = ['completed', 'failed', 'pending', 'accepted', 'rejected'];

  let items: any[] = $state([]);
  let cursor: string | null = $state(null);
  let type = $state('');
  let status = $state('');
  let busy = $state(false);
  let error = $state('');
  let detail: any = $state(null);
  let detailBusy = $state(false);

  onMount(() => {
    void load(true);
  });

  function messageOf(cause: unknown): string {
    const err = cause as { message?: string; status?: number };
    if (err?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión para ver el historial.';
    return err?.message || 'No se pudo cargar el historial.';
  }

  function merge(current: any[], incoming: any[]): any[] {
    const seen = new Set(current.map((row) => `${row.kind}:${row.id}`));
    const merged = current.slice();
    for (const row of incoming) {
      const key = `${row.kind}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
    return merged;
  }

  async function load(reset = false) {
    if (busy) return;
    busy = true;
    error = '';
    const query: { cursor?: string; limit?: number; type?: string; status?: string } = { limit: 20 };
    if (type) query.type = type;
    if (status) query.status = status;
    if (!reset && cursor) query.cursor = cursor;
    try {
      const data = await api.transactions(query);
      const rows: Item[] = Array.isArray(data?.transactions) ? data.transactions : [];
      items = reset ? merge([], rows) : merge(items, rows);
      cursor = data?.nextCursor ?? null;
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      busy = false;
    }
  }

  function applyFilters() {
    if (busy) return;
    detail = null;
    void load(true);
  }

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  async function openDetail(item: any) {
    if (detailBusy) return;
    detailBusy = true;
    error = '';
    try {
      const data = await api.transaction(item.id, item.kind);
      detail = data?.transaction ?? data;
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      detailBusy = false;
    }
  }
</script>

<section class="form-card">
  <h2>Historial de movimientos</h2>
  <div class="field-row">
    <label for="history-type">Tipo</label>
    <select id="history-type" bind:value={type} onchange={applyFilters} disabled={busy}>
      <option value="">Todos los tipos</option>
      {#each TYPES as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </div>
  <div class="field-row">
    <label for="history-status">Estado</label>
    <select id="history-status" bind:value={status} onchange={applyFilters} disabled={busy}>
      <option value="">Todos los estados</option>
      {#each STATUSES as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </div>
  {#if busy}
    <p class="alert" role="status">Cargando historial…</p>
  {/if}
</section>

{#if error}
  <p class="alert error" role="alert">{error}</p>
{/if}

{#if detail}
  <section class="form-card">
    <h3>Detalle del movimiento</h3>
    <p><strong>Importe:</strong> {detail.amount} {detail.currency}</p>
    <p><strong>Contraparte:</strong> {detail.counterparty}</p>
    <p><strong>Tipo:</strong> {detail.type}</p>
    <p><strong>Estado:</strong> {detail.status}</p>
    <p><strong>Fecha:</strong> {formatDate(detail.createdAt)} (hora local del navegador)</p>
    <button class="button secondary" type="button" onclick={() => (detail = null)}>Cerrar detalle</button>
  </section>
{/if}

<section class="table-card">
  {#if items.length === 0}
    <p class="alert" role="status">
      {busy ? 'Cargando movimientos…' : 'No hay movimientos para los filtros seleccionados.'}
    </p>
  {:else}
    <table>
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col">Tipo</th>
          <th scope="col">Estado</th>
          <th scope="col">Importe</th>
          <th scope="col">Contraparte</th>
          <th scope="col">Fecha</th>
          <th scope="col">Acción</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item (item.kind + ':' + item.id)}
          <tr>
            <td>{item.description}</td>
            <td>{item.type}</td>
            <td>{item.status}</td>
            <td>{item.amount} {item.currency}</td>
            <td>{item.counterparty}</td>
            <td>{formatDate(item.createdAt)}</td>
            <td>
              <button
                class="button secondary"
                type="button"
                onclick={() => openDetail(item)}
                disabled={detailBusy}
                aria-label={`Ver detalle de ${item.description}`}
              >
                Ver detalle
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<div class="field-row">
  <button class="button primary" type="button" onclick={() => load(false)} disabled={busy || !cursor}>
    Cargar más
  </button>
</div>
