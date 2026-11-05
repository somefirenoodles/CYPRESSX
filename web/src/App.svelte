<script lang="ts">
  import { onMount } from 'svelte';
  import { api, idempotencyKey } from './lib/api';
  import AccountTools from './lib/AccountTools.svelte';
  import History from './lib/History.svelte';
  import SplitForm from './lib/SplitForm.svelte';

  type Page = 'overview' | 'history' | 'send' | 'requests' | 'split' | 'recurring' | 'tools' | 'merchant';
  let user: any = $state(null);
  let page: Page = $state('overview');
  let dashboard: any = $state(null);
  let recurrences: any[] = $state([]);
  let merchants: any[] = $state([]);
  let busy = $state(false);
  let notice = $state('');
  let error = $state('');
  let authMode: 'login' | 'register' = $state('login');
  let auth = $state({ username: '', password: '', confirmPassword: '', firstName: '', lastName: '', email: '' });
  let payment = $state({ recipientId: '', amount: '', currency: 'USD', toCurrency: 'USD' });
  let requestForm = $state({ recipientId: '', amount: '', currency: 'USD', note: '' });
  let recurrenceForm = $state({ recipientId: '', amount: '', currency: 'USD', frequency: 'monthly', consent: false });
  let merchantForm = $state({ merchantId: '', amount: '', currency: 'USD', toCurrency: 'USD' });
  let pendingPayment: any = $state(null);
  let pendingMerchantPayment: any = $state(null);

  let recurrenceEditId: number | null = $state(null);
  let recurrenceEdit = $state({ amount: '', consent: false });

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: '⌂' }, { id: 'history', label: 'Actividad', icon: '↗' },
    { id: 'send', label: 'Enviar dinero', icon: '⇧' }, { id: 'requests', label: 'Solicitudes', icon: '⇩' },
    { id: 'split', label: 'Dividir gasto', icon: '⊞' }, { id: 'recurring', label: 'Recurrentes', icon: '⟳' },
    { id: 'tools', label: 'Cuenta y notificaciones', icon: '☰' }, { id: 'merchant', label: 'Pagar comercio', icon: '▦' },
  ];
  const title = $derived(nav.find((item) => item.id === page)?.label ?? 'Resumen');

  const TOPUP = { amount: '250.00', currency: 'USD' };
  const keyCache = new Map<string, string>();

  onMount(async () => {
    try {
      const session = await api.session();
      user = session?.user ?? (session?.authenticated ? session : null);
      if (user) await loadPageData();
    } catch { /* Login screen is the expected state for an absent session. */ }
  });

  async function loadPageData() {
    const jobs: Promise<any>[] = [api.dashboard()];
    if (page === 'recurring') jobs.push(api.recurrences());
    if (page === 'merchant') jobs.push(api.merchants());
    const values = await Promise.all(jobs);
    dashboard = values[0]?.dashboard ?? values[0];
    if (page === 'recurring') recurrences = values[1]?.recurrences ?? values[1] ?? [];
    if (page === 'merchant') merchants = values[1]?.merchants ?? values[1] ?? [];
  }

  async function run(action: () => Promise<any>, success: string, refresh = true) {
    busy = true; error = ''; notice = '';
    try { const result = await action(); notice = result?.message ?? success; if (refresh && user) await loadPageData(); return result; }
    catch (e) { error = e instanceof Error ? e.message : 'No se pudo completar la operación.'; return null; }
    finally { busy = false; }
  }

  async function authenticate(event: SubmitEvent) {
    event.preventDefault();
    if (authMode === 'register' && auth.password !== auth.confirmPassword) {
      error = 'Las contraseñas no coinciden.';
      notice = '';
      return;
    }
    const result = await run(
      () => authMode === 'login'
        ? api.login({ username: auth.username, password: auth.password })
        : api.register({
            username: auth.username,
            password: auth.password,
            confirmPassword: auth.confirmPassword,
            firstName: auth.firstName,
            lastName: auth.lastName,
            email: auth.email,
          }),
      authMode === 'login' ? 'Sesión iniciada.' : 'Cuenta creada.',
      false,
    );
    if (result) { user = result.user ?? result; auth.password = ''; auth.confirmPassword = ''; page = 'overview'; await loadPageData(); }
  }

  async function logout() {
    const result = await run(async () => { await api.logout(); return { ok: true }; }, 'Sesión cerrada.', false);
    if (!result) return;
    user = null; dashboard = null; pendingPayment = null; pendingMerchantPayment = null;
    keyCache.clear(); auth.password = ''; auth.confirmPassword = '';
    payment = { recipientId: '', amount: '', currency: 'USD', toCurrency: 'USD' };
    requestForm = { recipientId: '', amount: '', currency: 'USD', note: '' };
    recurrenceForm = { recipientId: '', amount: '', currency: 'USD', frequency: 'monthly', consent: false };
    cancelRecurrenceEdit();
  }

  /* Importes siempre como texto validado; el backend es la autoridad del monto. */
  function validAmount(value: unknown) {
    const text = String(value ?? '').trim();
    if (!/^\d+([.,]\d{1,2})?$/.test(text) || !/[1-9]/.test(text)) return '';
    return text.replace(',', '.');
  }

  /* Los identificadores sí se envían como número. */
  function asId(value: unknown) {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) return 0;
    const id = Number(text);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  }

  /*
   * Clave de idempotencia por (scope, huella del payload). Se reutiliza en
   * reintentos y ante timeout; solo se renueva tras un éxito confirmado.
   */
  function stableKey(scope: string, fingerprint: unknown) {
    const id = `${scope}:${JSON.stringify(fingerprint)}`;
    let key = keyCache.get(id);
    if (!key) { key = idempotencyKey(); keyCache.set(id, key); }
    return key;
  }

  function consumeKey(scope: string, fingerprint: unknown) {
    keyCache.delete(`${scope}:${JSON.stringify(fingerprint)}`);
  }

  function invalidatePayment() { pendingPayment = null; }
  function invalidateMerchantPayment() { pendingMerchantPayment = null; }

  async function quoteAndSend() {
    if (busy) return;
    pendingPayment = null;
    const amount = validAmount(payment.amount);
    if (!amount) { error = 'Ingrese un importe válido mayor que cero, con máximo dos decimales.'; notice = ''; return; }
    const recipientId = asId(payment.recipientId);
    if (!recipientId) { error = 'Ingrese un ID de destinatario válido.'; notice = ''; return; }
    const fingerprint = { recipientId, amount, currency: payment.currency, toCurrency: payment.toCurrency };
    let quote: any;
    if (payment.toCurrency !== payment.currency) {
      quote = await run(() => api.quote({ amount, fromCurrency: payment.currency, toCurrency: payment.toCurrency }), 'Cotización lista.', false);
      if (!quote) return;
    } else {
      quote = { fromAmount: amount, fromCurrency: payment.currency, toAmount: amount, toCurrency: payment.currency, rate: '1.00000000', source: 'Sin conversión' };
    }
    pendingPayment = {
      ...quote,
      quoteId: quote.quoteId ?? quote.id,
      recipientId,
      amount,
      currency: payment.currency,
      fingerprint,
      idempotencyKey: stableKey('payment', fingerprint),
    };
  }

  async function confirmPayment() {
    if (!pendingPayment || busy) return;
    const current = pendingPayment;
    // Si falla, pending conserva la misma clave y el resumen; no se crea otra intención.
    const result = await run(() => api.payment({ recipientId: current.recipientId, amount: current.amount, currency: current.currency, quoteId: current.quoteId, idempotencyKey: current.idempotencyKey }), 'Pago enviado.');
    if (result) { consumeKey('payment', current.fingerprint); pendingPayment = null; }
  }

  async function quoteAndPayMerchant() {
    if (busy) return;
    pendingMerchantPayment = null;
    const amount = validAmount(merchantForm.amount);
    if (!amount) { error = 'Ingrese un importe válido mayor que cero, con máximo dos decimales.'; notice = ''; return; }
    const merchant = merchants.find((item) => String(item.id) === String(merchantForm.merchantId));
    if (!merchant) { error = 'Seleccione un comercio válido.'; notice = ''; return; }
    const toCurrency = merchant.currency;
    merchantForm.toCurrency = toCurrency;
    const fingerprint = { merchantId: Number(merchant.id), amount, currency: merchantForm.currency, toCurrency };
    let quote: any;
    if (toCurrency !== merchantForm.currency) {
      quote = await run(() => api.quote({ amount, fromCurrency: merchantForm.currency, toCurrency }), 'Cotización lista.', false);
      if (!quote) return;
    } else {
      quote = { fromAmount: amount, fromCurrency: merchantForm.currency, toAmount: amount, toCurrency, rate: '1.00000000', source: 'Sin conversión' };
    }
    pendingMerchantPayment = {
      ...quote,
      quoteId: quote.quoteId ?? quote.id,
      merchantId: Number(merchant.id),
      amount,
      currency: merchantForm.currency,
      fingerprint,
      idempotencyKey: stableKey('merchant', fingerprint),
    };
  }

  async function confirmMerchantPayment() {
    if (!pendingMerchantPayment || busy) return;
    const current = pendingMerchantPayment;
    const result = await run(() => api.merchantPayment({ merchantId: current.merchantId, amount: current.amount, currency: current.currency, quoteId: current.quoteId, idempotencyKey: current.idempotencyKey }), 'Compra completada.');
    if (result) { consumeKey('merchant', current.fingerprint); pendingMerchantPayment = null; }
  }

  async function addFunds() {
    const result = await run(() => api.topUp({ ...TOPUP, idempotencyKey: stableKey('topup', TOPUP) }), 'USD 250.00 ficticios añadidos.');
    if (result) consumeKey('topup', TOPUP);
  }

  async function createRequest(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    const recipientId = asId(requestForm.recipientId);
    if (!recipientId) { error = 'Ingrese un ID de usuario válido.'; notice = ''; return; }
    const amount = validAmount(requestForm.amount);
    if (!amount) { error = 'Ingrese un importe válido mayor que cero, con máximo dos decimales.'; notice = ''; return; }
    const fingerprint = { recipientId, amount, currency: requestForm.currency, note: requestForm.note.trim() };
    const result = await run(() => api.createRequest({ ...fingerprint, idempotencyKey: stableKey('request', fingerprint) }), 'Solicitud creada.');
    if (result) consumeKey('request', fingerprint);
  }

  async function createRecurrence(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    const recipientId = asId(recurrenceForm.recipientId);
    if (!recipientId) { error = 'Ingrese un ID de destinatario válido.'; notice = ''; return; }
    const amount = validAmount(recurrenceForm.amount);
    if (!amount) { error = 'Ingrese un importe válido mayor que cero, con máximo dos decimales.'; notice = ''; return; }
    if (!recurrenceForm.consent) { error = 'Debes autorizar el pago recurrente antes de crearlo.'; notice = ''; return; }
    const fingerprint = { recipientId, amount, currency: recurrenceForm.currency, frequency: recurrenceForm.frequency };
    const result = await run(
      () => api.createRecurrence({ ...fingerprint, consent: true, idempotencyKey: stableKey('recurrence', fingerprint) }),
      'Pago recurrente creado.',
    );
    if (result) {
      consumeKey('recurrence', fingerprint);
      recurrenceForm = { ...recurrenceForm, consent: false };
    }
  }

  async function changeRecurrenceStatus(item: any, status: 'active' | 'paused' | 'cancelled') {
    if (busy) return;
    // Reanudar exige consentimiento explícito; pausar/cancelar no.
    const payload = status === 'active' ? { status, consent: true } : { status };
    const message = status === 'cancelled' ? 'Recurrencia cancelada.' : status === 'active' ? 'Recurrencia reanudada.' : 'Recurrencia pausada.';
    const result = await run(() => api.updateRecurrence(item.id, payload), message);
    if (result && status === 'cancelled' && recurrenceEditId === item.id) recurrenceEditId = null;
  }

  function startRecurrenceEdit(item: any) {
    recurrenceEditId = item.id;
    recurrenceEdit = { amount: String(item.amount ?? ''), consent: false };
    error = ''; notice = '';
  }

  function cancelRecurrenceEdit() {
    recurrenceEditId = null;
    recurrenceEdit = { amount: '', consent: false };
  }

  async function saveRecurrenceAmount(item: any) {
    if (busy) return;
    const amount = validAmount(recurrenceEdit.amount);
    if (!amount) { error = 'Ingrese un importe válido mayor que cero, con máximo dos decimales.'; notice = ''; return; }
    if (!recurrenceEdit.consent) { error = 'Debes autorizar el nuevo importe de la recurrencia.'; notice = ''; return; }
    const result = await run(() => api.updateRecurrence(item.id, { amount, consent: true }), 'Importe de la recurrencia actualizado.');
    if (result) cancelRecurrenceEdit();
  }

  function list(value: any, key: string) { const data = value?.[key] ?? value?.transactions ?? value?.items ?? []; return Array.isArray(data) ? data : []; }

  function splitUsers() {
    return list(dashboard, 'users').map((person: any) => ({
      ...person,
      name: person.name ?? ([person.firstName, person.lastName].filter(Boolean).join(' ') || person.username),
    }));
  }

  /*
   * Presentación exacta del dinero a partir del texto recibido: sin Number,
   * sin Intl y sin aritmética financiera. Soporta bigints serializados y negativos.
   */
  function money(value: unknown, currency = 'USD') {
    let text = value === null || value === undefined || value === '' ? '0' : String(value).trim();
    let negative = false;
    if (text.startsWith('-')) { negative = true; text = text.slice(1); }
    else if (text.startsWith('+')) { text = text.slice(1); }
    text = text.replace(/\s/g, '');
    if (text.includes(',')) text = text.includes('.') ? text.replace(/,/g, '') : text.replace(',', '.');
    const [wholeRaw = '0', decimalsRaw = ''] = text.split('.');
    const whole = wholeRaw.replace(/\D/g, '') || '0';
    const decimals = (decimalsRaw.replace(/\D/g, '') + '00').slice(0, 2);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currency} ${negative ? '-' : ''}${grouped}.${decimals}`;
  }

  function formatUtc(value: unknown) {
    if (!value) return 'Sin fecha';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : `${date.toLocaleString('es-PA', { timeZone: 'UTC' })} UTC`;
  }

  function frequencyLabel(value: unknown) {
    return ({ weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral' } as Record<string, string>)[String(value)] ?? String(value ?? 'Programado');
  }

  function statusLabel(value: unknown) {
    return ({ active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado' } as Record<string, string>)[String(value)] ?? String(value ?? '—');
  }
</script>

{#if !user}
  <main class="auth-shell">
    <section class="auth-art" aria-label="Superpay">
      <a class="brand brand-light" href="/" aria-label="Inicio de Superpay"><span class="brand-mark">sp</span><span>Superpay</span></a>
      <div class="auth-copy"><span class="eyebrow">PAGOS SIN FRONTERAS</span><h1>Tu dinero,<br />en movimiento.</h1><p>Una forma simple de enviar y recibir pagos internacionales.</p></div>
      <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-card"><span>Vista previa de cuenta</span><strong>USD 2,450.00</strong><small>Saldo de ejemplo</small></div>
      <p class="art-foot">PAGOS DIGITALES, SIMPLES Y CLAROS</p>
    </section>
    <section class="auth-panel">
      <div class="auth-top"><span>¿Necesitas ayuda?</span><a href="mailto:soporte@example.test">Centro de ayuda</a></div>
      <p class="alert" role="status">Sandbox activo · fondos ficticios; no se mueve dinero real.</p>
      <form class="auth-form" onsubmit={authenticate}>
        <span class="eyebrow">BIENVENIDO A SUPERPAY</span><h2>{authMode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2><p>Accede a tu cuenta de Superpay.</p>
        {#if authMode === 'register'}
          <div class="field-row"><label>Nombre<input bind:value={auth.firstName} autocomplete="given-name" required /></label><label>Apellido<input bind:value={auth.lastName} autocomplete="family-name" required /></label></div>
          <label>Correo electrónico<input type="email" bind:value={auth.email} autocomplete="email" required /></label>
        {/if}
        <label>Usuario<input bind:value={auth.username} autocomplete="username" required /></label>
        <label>Contraseña<input type="password" bind:value={auth.password} autocomplete={authMode === 'login' ? 'current-password' : 'new-password'} minlength="8" required /></label>
        {#if authMode === 'register'}
          <label>Confirmar contraseña<input type="password" bind:value={auth.confirmPassword} autocomplete="new-password" minlength="8" required /></label>
        {/if}
        {#if error}<p class="alert error" role="alert">{error}</p>{/if}
        <button class="button primary full" disabled={busy}>{busy ? 'Un momento…' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} <span aria-hidden="true">→</span></button>
        <p class="switch-auth">{authMode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'} <button type="button" class="text-button" onclick={() => { authMode = authMode === 'login' ? 'register' : 'login'; error = ''; }}>{authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}</button></p>
      </form>
    </section>
  </main>
{:else}
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#overview" onclick={() => page = 'overview'}><span class="brand-mark">sp</span><span>Superpay</span></a>
      <div class="workspace-label">ESPACIO PERSONAL</div>
      <nav aria-label="Navegación principal">{#each nav as item}<button class:active={page === item.id} class="nav-item" onclick={() => { page = item.id; error = ''; loadPageData().catch((e) => error = e.message); }}><span class="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{#if item.id === 'requests' && list(dashboard, 'paymentRequests').length}<span class="nav-count">{list(dashboard, 'paymentRequests').length}</span>{/if}</button>{/each}</nav>
      <div class="sidebar-bottom"><button class="nav-item logout" onclick={logout}><span class="nav-icon" aria-hidden="true">↪</span>Cerrar sesión</button><div class="profile"><span class="avatar">{(user.firstName?.[0] ?? user.username?.[0] ?? 'U').toUpperCase()}</span><span><strong>{user.firstName ? `${user.firstName} ${user.lastName ?? ''}` : user.username}</strong><small>Cuenta · ID {user.id}</small></span><span class="more">•••</span></div></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div><span class="breadcrumb">SUPERPAY <span>/</span> {title.toUpperCase()}</span><h1>{title}</h1></div><div class="topbar-actions"><span class="sandbox-note topbar-sandbox">Sandbox activo · fondos ficticios; no se mueve dinero real.</span><button class="icon-button" aria-label="Notificaciones" onclick={() => { page = 'tools'; error = ''; loadPageData().catch((e) => error = e.message); }}>♧</button></div></header>
      <section class="content">
        <datalist id="available-users">{#each list(dashboard, 'users') as person}<option value={person.id}>{person.firstName} {person.lastName} · @{person.username}</option>{/each}</datalist>
        {#if notice}<div class="alert success" role="status">{notice}<button aria-label="Cerrar aviso" onclick={() => notice = ''}>×</button></div>{/if}
        {#if error}<div class="alert error" role="alert">{error}<button aria-label="Cerrar error" onclick={() => error = ''}>×</button></div>{/if}
        {#if page === 'overview'}
          {@const accounts = list(dashboard, 'accounts')}
          {@const transactions = list(dashboard, 'transactions')}
          <div class="welcome-row"><div><h2>Hola, {user.firstName ?? user.username} <span>✦</span></h2><p>Aquí tienes un resumen de tus movimientos.</p></div><div class="welcome-actions"><button class="button secondary" disabled={busy} onclick={addFunds}>＋ Añadir fondos ficticios</button><button class="button primary" onclick={() => page = 'send'}>Enviar pago →</button></div></div>
          <div class="stats-grid"><article class="stat-card balance-card"><div class="stat-label">SALDO DISPONIBLE <span class="mini-icon">◎</span></div><strong>{money(dashboard?.balance ?? accounts[0]?.balance, dashboard?.currency ?? accounts[0]?.currency ?? 'USD')}</strong><small>Disponible en la cuenta</small><small class="sandbox-note">Sandbox activo · fondos ficticios; no se mueve dinero real.</small><div class="balance-line"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></article><article class="stat-card"><div class="stat-label">OPERACIONES <span class="stat-icon violet">↗</span></div><strong>{dashboard?.transactionCount ?? transactions.length ?? 0}</strong><small>En tu historial</small></article><article class="stat-card"><div class="stat-label">SOLICITUDES PENDIENTES <span class="stat-icon yellow">⇩</span></div><strong>{list(dashboard, 'paymentRequests').filter((r: any) => r.status === 'pending').length}</strong><small>Esperando respuesta</small></article></div>
          <div class="section-heading"><div><h2>Actividad reciente</h2><p>Movimientos de tu cuenta</p></div><button class="link-button" onclick={() => page = 'history'}>Ver actividad <span>→</span></button></div>
          {@render TransactionTable(transactions.slice(0, 6), money)}
        {:else if page === 'history'}
          <div class="page-intro"><h2>Tu actividad</h2><p>Consulta tus operaciones recientes y anteriores.</p></div>
          <History />
        {:else if page === 'send'}
          <div class="page-intro"><h2>Enviar un pago</h2><p>Envía un pago a otro usuario.</p></div>
          <form class="form-card" onsubmit={(event) => { event.preventDefault(); quoteAndSend(); }}><div class="form-card-title"><span class="form-icon">⇧</span><div><h3>Datos del pago</h3><p>Completa los datos de la transferencia.</p></div></div><label>ID de usuario destinatario<input type="number" min="1" bind:value={payment.recipientId} list="available-users" oninput={invalidatePayment} disabled={busy} required placeholder="Ej. 2048" /></label><div class="field-row"><label>Importe<input type="text" inputmode="decimal" pattern={"[0-9]+([.,][0-9]{1,2})?"} bind:value={payment.amount} oninput={invalidatePayment} disabled={busy} required placeholder="0.00" /></label><label>Moneda de origen<select bind:value={payment.currency} onchange={invalidatePayment} disabled={busy}><option>USD</option><option>CRC</option><option>COP</option></select></label></div><label>Moneda de destino<select bind:value={payment.toCurrency} onchange={invalidatePayment} disabled={busy}><option>USD</option><option>CRC</option><option>COP</option></select></label><p class="form-hint">Si eliges otra moneda se solicitará una cotización antes del pago. Los importes corresponden a fondos ficticios.</p><button class="button primary full" disabled={busy}>{busy ? 'Preparando…' : 'Revisar pago'} <span>→</span></button>{#if pendingPayment}<div class="quote-review" aria-live="polite"><div><strong>Confirma los importes</strong><small>{money(pendingPayment.fromAmount, pendingPayment.fromCurrency)} → {money(pendingPayment.toAmount, pendingPayment.toCurrency)}</small><small>Tasa aplicada {pendingPayment.rate} · {pendingPayment.source}</small>{#if pendingPayment.expiresAt}<small>Válida hasta {formatUtc(pendingPayment.expiresAt)}</small>{/if}<small>Al editar los datos debes revisarlos nuevamente antes de confirmar.</small></div><button class="button primary" type="button" disabled={busy} onclick={confirmPayment}>Confirmar pago</button><button class="button secondary" type="button" disabled={busy} onclick={() => pendingPayment = null}>Cancelar</button></div>{/if}</form>
        {:else if page === 'requests'}
          {@const requests = list(dashboard, 'paymentRequests')}
          <div class="page-intro"><h2>Solicitudes de pago</h2><p>Solicita o responde pagos entre usuarios de Superpay.</p></div><div class="two-column"><form class="form-card" onsubmit={createRequest}><div class="form-card-title"><span class="form-icon">⇩</span><div><h3>Nueva solicitud</h3><p>Pide un pago a otro usuario.</p></div></div><label>ID de usuario<input type="number" min="1" bind:value={requestForm.recipientId} list="available-users" required /></label><div class="field-row"><label>Importe<input type="text" inputmode="decimal" pattern={"[0-9]+([.,][0-9]{1,2})?"} bind:value={requestForm.amount} required /></label><label>Moneda<select bind:value={requestForm.currency}><option value="USD">USD</option><option value="COP">COP</option><option value="CRC">CRC</option></select></label></div><label>Nota<input bind:value={requestForm.note} maxlength="160" placeholder="¿Por qué solicitas este pago?" /></label><button class="button primary full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button></form><div class="list-card"><div class="card-heading"><h3>Recibidas y enviadas</h3><span>{requests.length}</span></div>{#if requests.length}<div class="request-list">{#each requests as req}<div class="request-row"><div class="txn-avatar request-avatar">⇄</div><div class="request-info"><strong>{req.note || `Solicitud #${req.id}`}</strong><small>{req.status ?? 'Pendiente'} · {req.createdAt ? new Date(req.createdAt).toLocaleDateString('es-PA') : 'Solicitud'}</small></div><strong class="request-amount">{money(req.amount, req.currency)}</strong>{#if req.status === 'pending' && req.direction === 'incoming'}<div class="request-actions"><button class="button small primary" disabled={busy} onclick={() => run(() => api.resolveRequest(req.id, 'accept'), 'Solicitud aceptada.')}>Aceptar</button><button class="button small secondary" disabled={busy} onclick={() => run(() => api.resolveRequest(req.id, 'reject'), 'Solicitud rechazada.')}>Rechazar</button></div>{/if}</div>{/each}</div>{:else}{@render EmptyState('Aún no hay solicitudes recibidas ni enviadas.')}{/if}</div></div>
        {:else if page === 'split'}
          <div class="page-intro"><h2>Divide un gasto</h2><p>Registra y reparte un gasto entre varias personas.</p></div>
          <SplitForm userId={user.id} users={splitUsers()} onchange={loadPageData} />
        {:else if page === 'recurring'}
          <div class="page-intro"><h2>Pagos recurrentes</h2><p>Programa pagos periódicos a otros usuarios.</p></div><div class="two-column"><form class="form-card" onsubmit={createRecurrence}><div class="form-card-title"><span class="form-icon">⟳</span><div><h3>Nuevo pago recurrente</h3><p>Configura la frecuencia de tus pagos.</p></div></div><label>ID de destinatario<input type="number" min="1" bind:value={recurrenceForm.recipientId} list="available-users" required /></label><div class="field-row"><label>Importe<input type="text" inputmode="decimal" pattern={"[0-9]+([.,][0-9]{1,2})?"} bind:value={recurrenceForm.amount} required /></label><label>Moneda<select bind:value={recurrenceForm.currency}><option value="USD">USD</option><option value="COP">COP</option><option value="CRC">CRC</option></select></label></div><label>Frecuencia<select bind:value={recurrenceForm.frequency}><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option></select></label><label class="consent-field"><input type="checkbox" bind:checked={recurrenceForm.consent} required /> Autorizo este pago recurrente en sandbox (fondos ficticios).</label><button class="button primary full" disabled={busy}>{busy ? 'Creando…' : 'Crear programación'}</button></form><div class="list-card"><div class="card-heading"><h3>Tus programaciones</h3><button class="refresh-button" aria-label="Actualizar pagos recurrentes" onclick={() => api.recurrences().then((v) => recurrences = v.recurrences ?? v).catch((e) => error = e.message)}>↻</button></div>{#if recurrences.length}{#each recurrences as item}<div class="recurrence-row"><span class="form-icon">⟳</span><div class="request-info"><strong>{money(item.amount, item.currency)} · {frequencyLabel(item.frequency)}</strong><small>Destinatario #{item.recipientId} · Estado: {statusLabel(item.status)}</small><small>Próxima ejecución: {formatUtc(item.nextRunAt)}</small>{#if item.occurrenceAt}<small>Ocurrencia: {formatUtc(item.occurrenceAt)}</small>{/if}<small>Reintentos: {item.retryCount ?? 0}/{item.maxRetries ?? 3}</small>{#if item.lastError}<small class="error-text" role="alert">Último error: {item.lastError}</small>{/if}</div>{#if item.status === 'cancelled'}<span class="badge" aria-label="Recurrencia cancelada">Cancelado</span>{:else}<div class="request-actions">{#if item.status === 'paused'}<button class="button small primary" disabled={busy} onclick={() => changeRecurrenceStatus(item, 'active')}>Reanudar y autorizar</button>{:else}<button class="button small secondary" disabled={busy} onclick={() => changeRecurrenceStatus(item, 'paused')}>Pausar</button>{/if}<button class="button small secondary" disabled={busy} onclick={() => startRecurrenceEdit(item)}>Cambiar importe</button><button class="button small secondary" disabled={busy} onclick={() => changeRecurrenceStatus(item, 'cancelled')}>Cancelar</button></div>{/if}</div>{#if recurrenceEditId === item.id && item.status !== 'cancelled'}<div class="quote-review recurrence-edit" aria-live="polite"><div><strong>Cambiar importe · {statusLabel(item.status)}</strong><small>Autoriza el nuevo importe para continuar. La cancelación es definitiva.</small></div><label>Nuevo importe<input type="text" inputmode="decimal" pattern={"[0-9]+([.,][0-9]{1,2})?"} bind:value={recurrenceEdit.amount} required /></label><label class="consent-field"><input type="checkbox" bind:checked={recurrenceEdit.consent} /> Autorizo el nuevo importe.</label><div class="request-actions"><button class="button small primary" type="button" disabled={busy} onclick={() => saveRecurrenceAmount(item)}>Guardar importe</button><button class="button small secondary" type="button" disabled={busy} onclick={cancelRecurrenceEdit}>Cerrar</button></div></div>{/if}{/each}{:else}{@render EmptyState('Todavía no tienes pagos recurrentes.')}{/if}</div></div>
        {:else if page === 'tools'}
          <div class="page-intro"><h2>Cuenta y notificaciones</h2><p>Contactos, cuentas ficticias, avisos y recepción simulada.</p></div>
          <AccountTools onchange={loadPageData} />
          <p class="form-hint">Nota: la moneda y los roles se muestran como referencia de sandbox; no hay pantallas específicas adicionales.</p>
        {:else if page === 'merchant'}
          <div class="page-intro"><h2>Pago a comercios</h2><p>Paga con uno de los comercios disponibles.</p></div><form class="form-card" onsubmit={(event) => { event.preventDefault(); quoteAndPayMerchant(); }}><div class="form-card-title"><span class="form-icon">▦</span><div><h3>Detalles de la compra</h3><p>Revisa los datos antes de confirmar.</p></div></div><label>Comercio<select bind:value={merchantForm.merchantId} onchange={(event) => { const selected = merchants.find((item) => String(item.id) === event.currentTarget.value); if (selected) merchantForm.toCurrency = selected.currency; invalidateMerchantPayment(); }} disabled={busy} required><option value="" disabled>Selecciona un comercio</option>{#each merchants as merchant}<option value={merchant.id}>{merchant.name}</option>{/each}</select></label><div class="field-row"><label>Importe<input type="text" inputmode="decimal" pattern={"[0-9]+([.,][0-9]{1,2})?"} bind:value={merchantForm.amount} oninput={invalidateMerchantPayment} disabled={busy} required /></label><label>Moneda de origen<select bind:value={merchantForm.currency} onchange={invalidateMerchantPayment} disabled={busy}><option>USD</option><option>CRC</option><option>COP</option></select></label></div><p class="form-hint">Moneda del comercio: {merchantForm.toCurrency}. Revisa el importe y la moneda antes de confirmar; el backend valida el texto exacto.</p><button class="button primary full" disabled={busy || merchants.length === 0}>{busy ? 'Preparando…' : 'Revisar compra'} <span>→</span></button>{#if pendingMerchantPayment}<div class="quote-review" aria-live="polite"><div><strong>Confirma la compra</strong><small>{money(pendingMerchantPayment.fromAmount, pendingMerchantPayment.fromCurrency)} → {money(pendingMerchantPayment.toAmount, pendingMerchantPayment.toCurrency)}</small><small>Tasa aplicada: {pendingMerchantPayment.rate}</small>{#if pendingMerchantPayment.expiresAt}<small>Válida hasta {formatUtc(pendingMerchantPayment.expiresAt)}</small>{/if}<small>Al editar los datos se descarta esta revisión y se genera una nueva intención.</small></div><button class="button primary" type="button" disabled={busy} onclick={confirmMerchantPayment}>Confirmar compra</button><button class="button secondary" type="button" disabled={busy} onclick={() => pendingMerchantPayment = null}>Cancelar</button></div>{/if}{#if !merchants.length}<p class="form-hint">No se encontraron comercios. Comprueba que existan comercios ficticios disponibles.</p>{/if}</form>
        {/if}
        <footer class="content-footer"><span>© 2026 Superpay</span><span>Pagos digitales para tu día a día.</span></footer>
      </section>
    </main>
  </div>
{/if}

{#snippet EmptyState(text)}<div class="empty-state"><span>◇</span><p>{text}</p><small>Los datos aparecerán aquí cuando estén disponibles.</small></div>{/snippet}
{#snippet TransactionTable(transactions, money)}
  <div class="table-card"><div class="table-scroll"><table><thead><tr><th>OPERACIÓN</th><th>FECHA</th><th>TIPO</th><th>ESTADO</th><th class="amount-head">IMPORTE</th></tr></thead><tbody>{#if transactions.length}{#each transactions as tx}<tr><td><div class="transaction-name"><span class="txn-avatar" class:incoming={tx.type === 'received' || tx.type === 'incoming'}>{tx.type === 'received' || tx.type === 'incoming' ? '↙' : '↗'}</span><span><strong>{tx.description ?? tx.counterparty ?? tx.merchantName ?? tx.type ?? 'Pago'}</strong><small>Ref. {tx.id ?? tx.reference ?? '—'}</small></span></div></td><td>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td><td><span class="type-label">{tx.type ?? 'Pago'}</span></td><td><span class="badge" class:badge-success={['completed', 'accepted', 'success'].includes(tx.status)}>{tx.status ?? 'Completado'}</span></td><td class="amount-cell" class:negative={tx.type === 'sent' || tx.type === 'outgoing' || tx.type === 'merchant' || tx.type === 'recurring'}>{tx.type === 'sent' || tx.type === 'outgoing' ? '−' : '+'}{money(tx.amount, tx.currency)}</td></tr>{/each}{:else}<tr><td colspan="5"><div class="empty-inline">No hay operaciones para mostrar.</div></td></tr>{/if}</tbody></table></div></div>
{/snippet}

<style>
  .sandbox-note {
    display: block;
    margin-top: 6px;
    color: #574ad3;
    font-size: 10px;
    font-weight: 700;
  }
  .topbar-sandbox {
    margin-top: 0;
    align-self: center;
    white-space: nowrap;
  }
  .error-text {
    color: #a33a3a;
  }
  .consent-field {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
  }
  .consent-field input {
    margin-top: 2px;
  }
  .recurrence-edit {
    margin-top: 8px;
  }
</style>
