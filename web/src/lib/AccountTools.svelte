<script lang="ts">
  import { onMount } from 'svelte';
  import {
    api,
    idempotencyKey,
    type AccountNotification,
    type BankAccount,
    type Contact,
    type InboundTransferResult,
    type UserSummary,
  } from './api';

  let { onchange = async () => {} }: { onchange?: () => Promise<void> | void } = $props();

  const tabs = [
    { id: 'contacts', label: 'Contactos' },
    { id: 'banks', label: 'Bancos' },
    { id: 'notifications', label: 'Notificaciones' },
    { id: 'transfer', label: 'Recibir' },
  ] as const;
  type TabId = (typeof tabs)[number]['id'];
  let activeTab = $state<TabId>('contacts');

  let contacts = $state<Contact[]>([]);
  let contactsLoading = $state(false);
  let contactsError = $state('');
  let searchQuery = $state('');
  let searchResults = $state<UserSummary[]>([]);
  let searchLoading = $state(false);
  let searchError = $state('');
  let contactBusyKey = $state<string | null>(null);
  const contactUserIds = $derived(new Set(contacts.map((contact) => contact.userId)));

  let banks = $state<BankAccount[]>([]);
  let banksLoading = $state(false);
  let banksError = $state('');
  let bankBusyId = $state<number | null>(null);
  let bankForm = $state({ bankName: '', accountNumber: '12345678', routingNumber: '123456789' });
  let bankSubmitting = $state(false);
  let bankFormError = $state('');

  let notifications = $state<AccountNotification[]>([]);
  let unreadCount = $state(0);
  let notificationsLoading = $state(false);
  let notificationsError = $state('');
  let notificationBusyId = $state<number | null>(null);

  type TransferDraft = {
    amount: string;
    currency: string;
    externalReference: string;
    sourceCountry: string;
    idempotencyKey: string;
  };
  let transferForm = $state({ amount: '', currency: 'USD', externalReference: '', sourceCountry: 'US' });
  let transferKey = $state(idempotencyKey());
  let review = $state<TransferDraft | null>(null);
  let transferLoading = $state(false);
  let transferError = $state('');
  let transferResult = $state<InboundTransferResult | null>(null);

  function errorText(error: unknown) {
    return error instanceof Error && error.message ? error.message : 'No se pudo completar la solicitud.';
  }

  async function loadContacts() {
    contactsLoading = true;
    contactsError = '';
    try {
      const data = await api.contacts();
      contacts = data.contacts;
    } catch (error) {
      contactsError = errorText(error);
    } finally {
      contactsLoading = false;
    }
  }

  async function loadBanks() {
    banksLoading = true;
    banksError = '';
    try {
      const data = await api.bankAccounts();
      banks = data.accounts;
    } catch (error) {
      banksError = errorText(error);
    } finally {
      banksLoading = false;
    }
  }

  async function loadNotifications() {
    notificationsLoading = true;
    notificationsError = '';
    try {
      const data = await api.notifications();
      notifications = data.notifications;
      unreadCount = data.unreadCount;
    } catch (error) {
      notificationsError = errorText(error);
    } finally {
      notificationsLoading = false;
    }
  }

  onMount(() => {
    void loadContacts();
    void loadBanks();
    void loadNotifications();
  });

  async function searchUsers(event: SubmitEvent) {
    event.preventDefault();
    searchLoading = true;
    searchError = '';
    try {
      const data = await api.users(searchQuery.trim());
      searchResults = data.users;
    } catch (error) {
      searchError = errorText(error);
    } finally {
      searchLoading = false;
    }
  }

  async function addContact(user: UserSummary) {
    if (contactUserIds.has(user.id)) return;
    const key = `add-${user.id}`;
    contactBusyKey = key;
    contactsError = '';
    try {
      const data = await api.addContact(user.id);
      if (!contacts.some((contact) => contact.id === data.contact.id)) {
        contacts = [...contacts, data.contact];
      }
    } catch (error) {
      contactsError = errorText(error);
    } finally {
      contactBusyKey = null;
    }
  }

  async function removeContact(contact: Contact) {
    const key = `remove-${contact.id}`;
    contactBusyKey = key;
    contactsError = '';
    try {
      await api.removeContact(contact.id);
      contacts = contacts.filter((item) => item.id !== contact.id);
    } catch (error) {
      contactsError = errorText(error);
    } finally {
      contactBusyKey = null;
    }
  }

  async function submitBankAccount(event: SubmitEvent) {
    event.preventDefault();
    const bankName = bankForm.bankName.trim();
    const accountNumber = bankForm.accountNumber.trim();
    const routingNumber = bankForm.routingNumber.trim();
    bankFormError = '';

    if (!bankName) {
      bankFormError = 'Indique el nombre del banco.';
      return;
    }
    if (!/^[0-9]{4,20}$/.test(accountNumber)) {
      bankFormError = 'Ingrese entre 4 y 20 dígitos para la cuenta.';
      return;
    }
    if (!/^[0-9]{9}$/.test(routingNumber)) {
      bankFormError = 'El número de ruta debe tener 9 dígitos.';
      return;
    }

    bankSubmitting = true;
    try {
      const data = await api.addBankAccount({ bankName, accountNumber: `TEST-${accountNumber}`, routingNumber });
      banks = [...banks, data.account];
      bankForm = { bankName: '', accountNumber: '12345678', routingNumber: '123456789' };
    } catch (error) {
      bankFormError = errorText(error);
    } finally {
      bankSubmitting = false;
    }
  }

  async function disableBankAccount(account: BankAccount) {
    bankBusyId = account.id;
    banksError = '';
    try {
      const data = await api.disableBankAccount(account.id);
      banks = banks.map((item) =>
        item.id === account.id ? { ...item, status: 'disabled', ...(data.account ?? {}) } : item,
      );
    } catch (error) {
      banksError = errorText(error);
    } finally {
      bankBusyId = null;
    }
  }

  async function markNotificationRead(item: AccountNotification) {
    if (item.read) return;
    notificationBusyId = item.id;
    notificationsError = '';
    try {
      await api.readNotification(item.id);
      notifications = notifications.map((current) => (current.id === item.id ? { ...current, read: true } : current));
      unreadCount = Math.max(0, unreadCount - 1);
    } catch (error) {
      notificationsError = errorText(error);
    } finally {
      notificationBusyId = null;
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : date.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function invalidateTransfer() {
    review = null;
    transferError = '';
    transferKey = idempotencyKey();
  }

  function reviewTransfer(event: SubmitEvent) {
    event.preventDefault();
    const amount = transferForm.amount.trim();
    const externalReference = transferForm.externalReference.trim();
    transferError = '';

    if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(amount) || !/[1-9]/.test(amount)) {
      transferError = 'Ingrese un importe válido mayor que cero, solo con dígitos.';
      return;
    }
    if (externalReference.length < 8 || externalReference.length > 80) {
      transferError = 'La referencia externa debe tener entre 8 y 80 caracteres.';
      return;
    }

    review = {
      amount: amount.replace(',', '.'),
      currency: transferForm.currency,
      externalReference,
      sourceCountry: transferForm.sourceCountry,
      idempotencyKey: transferKey,
    };
  }

  async function confirmTransfer() {
    const draft = review;
    if (!draft || transferLoading) return;
    transferLoading = true;
    transferError = '';
    try {
      const result = await api.inboundTransfer(draft);
      transferResult = result;
      review = null;
      transferKey = idempotencyKey();
      try {
        await onchange();
      } catch {
        // La recepción ya quedó registrada; un fallo al refrescar el panel no la invalida.
      }
    } catch (error) {
      transferError = errorText(error);
    } finally {
      transferLoading = false;
    }
  }

  function cancelTransfer() {
    review = null;
    transferError = '';
  }
</script>

<section class="at-card" aria-label="Herramientas de cuenta">
  <header class="at-header">
    <div>
      <h2>Herramientas de cuenta</h2>
      <p>Contactos, bancos y avisos de su cuenta.</p>
    </div>
  </header>

  <nav class="at-tabs" aria-label="Secciones de herramientas de cuenta">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        id={`at-tab-${tab.id}`}
        aria-controls={`at-panel-${tab.id}`}
        aria-pressed={activeTab === tab.id}
        class:active={activeTab === tab.id}
        class="at-tab"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
        {#if tab.id === 'notifications' && unreadCount > 0}
          <span class="at-badge" aria-label={`${unreadCount} sin leer`}>{unreadCount}</span>
        {/if}
      </button>
    {/each}
  </nav>

  {#if activeTab === 'contacts'}
    <section id="at-panel-contacts" aria-labelledby="at-tab-contacts" class="at-panel">
      <form class="at-search" onsubmit={searchUsers}>
        <label for="at-contact-search">Buscar usuarios por nombre o usuario</label>
        <div class="at-row">
          <input
            id="at-contact-search"
            type="search"
            bind:value={searchQuery}
            autocomplete="off"
            placeholder="Ej. ana o ana.gomez"
          />
          <button class="at-btn" type="submit" disabled={searchLoading}>
            {searchLoading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </form>

      {#if searchError}
        <p class="at-error" role="alert">{searchError}</p>
      {/if}

      {#if searchResults.length > 0}
        <ul class="at-list" aria-label="Resultados de búsqueda">
          {#each searchResults as user (user.id)}
            <li class="at-item">
              <div class="at-item-main">
                <strong>{user.firstName} {user.lastName}</strong>
                <small>@{user.username}</small>
              </div>
              <button
                type="button"
                class="at-btn at-btn-small"
                disabled={contactUserIds.has(user.id) || contactBusyKey === `add-${user.id}`}
                onclick={() => addContact(user)}
              >
                {contactUserIds.has(user.id)
                  ? 'Agregado'
                  : contactBusyKey === `add-${user.id}`
                    ? 'Añadiendo…'
                    : 'Añadir'}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="at-section-heading">
        <h3>Mis contactos</h3>
        <button type="button" class="at-link-btn" onclick={loadContacts} disabled={contactsLoading}>
          Actualizar
        </button>
      </div>

      {#if contactsLoading}
        <p class="at-muted" role="status">Cargando contactos…</p>
      {:else if contactsError}
        <div class="at-error-block">
          <p class="at-error" role="alert">{contactsError}</p>
          <button type="button" class="at-btn at-btn-small" onclick={loadContacts}>Reintentar</button>
        </div>
      {:else if contacts.length === 0}
        <p class="at-muted">No tiene contactos guardados.</p>
      {:else}
        <ul class="at-list" aria-label="Contactos guardados">
          {#each contacts as contact (contact.id)}
            <li class="at-item">
              <div class="at-item-main">
                <strong>{contact.firstName} {contact.lastName}</strong>
                <small>@{contact.username}</small>
              </div>
              <button
                type="button"
                class="at-btn at-btn-small at-btn-ghost"
                disabled={contactBusyKey === `remove-${contact.id}`}
                onclick={() => removeContact(contact)}
              >
                {contactBusyKey === `remove-${contact.id}` ? 'Eliminando…' : 'Eliminar'}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if activeTab === 'banks'}
    <section id="at-panel-banks" aria-labelledby="at-tab-banks" class="at-panel">
      <p class="at-note">En la lista solo se muestran los últimos 4 dígitos de cada cuenta.</p>

      <form class="at-form" onsubmit={submitBankAccount}>
        <div class="at-field">
          <label for="at-bank-name">Banco</label>
          <input id="at-bank-name" type="text" bind:value={bankForm.bankName} required placeholder="Nombre del banco" />
        </div>
        <div class="at-field">
          <label for="at-bank-account">Número de cuenta</label>
          <input
            id="at-bank-account"
            type="text"
            bind:value={bankForm.accountNumber}
            required
            pattern={"[0-9]{4,20}"}
            placeholder="12345678"
          />
        </div>
        <div class="at-field">
          <label for="at-bank-routing">Número de ruta</label>
          <input
            id="at-bank-routing"
            type="text"
            bind:value={bankForm.routingNumber}
            required
            pattern={"[0-9]{9}"}
            placeholder="123456789"
          />
        </div>
        <button class="at-btn" type="submit" disabled={bankSubmitting}>
          {bankSubmitting ? 'Añadiendo…' : 'Añadir cuenta'}
        </button>
      </form>

      {#if bankFormError}
        <p class="at-error" role="alert">{bankFormError}</p>
      {/if}

      <div class="at-section-heading">
        <h3>Cuentas vinculadas</h3>
        <button type="button" class="at-link-btn" onclick={loadBanks} disabled={banksLoading}>Actualizar</button>
      </div>

      {#if banksLoading}
        <p class="at-muted" role="status">Cargando cuentas…</p>
      {:else if banksError}
        <div class="at-error-block">
          <p class="at-error" role="alert">{banksError}</p>
          <button type="button" class="at-btn at-btn-small" onclick={loadBanks}>Reintentar</button>
        </div>
      {:else if banks.length === 0}
        <p class="at-muted">Todavía no hay cuentas vinculadas.</p>
      {:else}
        <ul class="at-list" aria-label="Cuentas bancarias">
          {#each banks as account (account.id)}
            <li class="at-item">
              <div class="at-item-main">
                <strong>{account.bankName}</strong>
                <small>•••• {account.last4}</small>
              </div>
              <div class="at-item-actions">
                <span class:at-status-off={account.status === 'disabled'} class="at-status">
                  {account.status === 'disabled' ? 'Deshabilitada' : 'Activa'}
                </span>
                <button
                  type="button"
                  class="at-btn at-btn-small at-btn-ghost"
                  disabled={account.status === 'disabled' || bankBusyId === account.id}
                  onclick={() => disableBankAccount(account)}
                >
                  {bankBusyId === account.id ? 'Deshabilitando…' : 'Deshabilitar'}
                </button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if activeTab === 'notifications'}
    <section id="at-panel-notifications" aria-labelledby="at-tab-notifications" class="at-panel">
      <div class="at-section-heading">
        <h3>Bandeja de notificaciones</h3>
        <div class="at-heading-actions">
          <span class="at-muted">{unreadCount} sin leer</span>
          <button type="button" class="at-link-btn" onclick={loadNotifications} disabled={notificationsLoading}>
            Actualizar
          </button>
        </div>
      </div>

      {#if notificationsLoading}
        <p class="at-muted" role="status">Cargando notificaciones…</p>
      {:else if notificationsError}
        <div class="at-error-block">
          <p class="at-error" role="alert">{notificationsError}</p>
          <button type="button" class="at-btn at-btn-small" onclick={loadNotifications}>Reintentar</button>
        </div>
      {:else if notifications.length === 0}
        <p class="at-empty">Bandeja vacía. No hay notificaciones por ahora.</p>
      {:else}
        <ul class="at-list" aria-label="Notificaciones">
          {#each notifications as item (item.id)}
            <li class:at-unread={!item.read} class="at-notification">
              <div class="at-notification-body">
                <div class="at-notification-title">
                  <strong>{item.title}</strong>
                  {#if !item.read}
                    <span class="at-unread-dot" aria-label="Sin leer"></span>
                  {/if}
                </div>
                <p>{item.message}</p>
                <small>
                  {item.referenceType} #{item.referenceId} · {formatDate(item.createdAt)}
                </small>
              </div>
              {#if !item.read}
                <button
                  type="button"
                  class="at-btn at-btn-small"
                  disabled={notificationBusyId === item.id}
                  onclick={() => markNotificationRead(item)}
                >
                  {notificationBusyId === item.id ? 'Marcando…' : 'Marcar leída'}
                </button>
              {:else}
                <span class="at-read-label">Leída</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if activeTab === 'transfer'}
    <section id="at-panel-transfer" aria-labelledby="at-tab-transfer" class="at-panel">
      <p class="at-note">Revise los datos de la recepción antes de confirmar.</p>

      <form class="at-form" onsubmit={reviewTransfer}>
        <div class="at-form-grid">
          <div class="at-field">
            <label for="at-transfer-amount">Importe</label>
            <input
              id="at-transfer-amount"
              type="text"
              bind:value={transferForm.amount}
              oninput={invalidateTransfer}
              required
              inputmode="decimal"
              pattern={"[0-9]+([.,][0-9]{1,2})?"}
              placeholder="100.00"
            />
          </div>
          <div class="at-field">
            <label for="at-transfer-currency">Moneda</label>
            <select id="at-transfer-currency" bind:value={transferForm.currency} onchange={invalidateTransfer}>
              <option value="USD">USD</option>
              <option value="COP">COP</option>
              <option value="CRC">CRC</option>
            </select>
          </div>
          <div class="at-field">
            <label for="at-transfer-reference">Referencia externa</label>
            <input
              id="at-transfer-reference"
              type="text"
              bind:value={transferForm.externalReference}
              oninput={invalidateTransfer}
              required
              minlength="8"
              maxlength="80"
              placeholder="REF-ENTRADA-001"
            />
          </div>
          <div class="at-field">
            <label for="at-transfer-country">País de origen</label>
            <select id="at-transfer-country" bind:value={transferForm.sourceCountry} onchange={invalidateTransfer}>
              <option value="US">Estados Unidos (US)</option>
              <option value="CO">Colombia (CO)</option>
              <option value="CR">Costa Rica (CR)</option>
            </select>
          </div>
        </div>
        <button class="at-btn" type="submit" disabled={transferLoading}>
          {transferLoading ? 'Procesando…' : 'Revisar recepción'}
        </button>
      </form>

      {#if transferError}
        <p class="at-error" role="alert">{transferError}</p>
      {/if}

      {#if review}
        <div class="at-review" aria-label="Resumen de la recepción">
          <h3>Revise la recepción</h3>
          <dl class="at-summary">
            <div><dt>Importe</dt><dd>{review.amount} {review.currency}</dd></div>
            <div><dt>Referencia externa</dt><dd>{review.externalReference}</dd></div>
            <div><dt>País de origen</dt><dd>{review.sourceCountry}</dd></div>
          </dl>
          <div class="at-actions">
            <button type="button" class="at-btn" disabled={transferLoading} onclick={confirmTransfer}>
              {transferLoading ? 'Confirmando…' : 'Confirmar recepción'}
            </button>
            <button
              type="button"
              class="at-btn at-btn-ghost"
              disabled={transferLoading}
              onclick={cancelTransfer}
            >
              Cancelar
            </button>
          </div>
        </div>
      {/if}

      {#if transferResult}
        <div class="at-success" role="status">
          <strong>Recepción registrada</strong>
          <p>{transferResult.message}</p>
          <dl class="at-summary">
            <div><dt>Comprobante</dt><dd>#{transferResult.id}</dd></div>
            <div><dt>Estado</dt><dd>{transferResult.status}</dd></div>
            <div><dt>Importe</dt><dd>{transferResult.amount} {transferResult.currency}</dd></div>
            <div><dt>Referencia</dt><dd>{transferResult.externalReference}</dd></div>
            <div><dt>Origen</dt><dd>{transferResult.sourceCountry}</dd></div>
          </dl>
        </div>
      {/if}
    </section>
  {/if}
</section>

<style>
  .at-card {
    background: var(--surface, #fff);
    border: 1px solid var(--line, #eaecf1);
    border-radius: 16px;
    padding: 22px;
    color: var(--ink, #202536);
  }
  .at-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .at-header h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.3px;
  }
  .at-header p {
    margin: 6px 0 0;
    color: var(--muted, #8790a2);
    font-size: 12px;
  }
  .at-tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin: 18px 0 20px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line, #eaecf1);
  }
  .at-tab {
    border: 0;
    background: transparent;
    color: #71798a;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .at-tab:hover {
    background: #f7f6ff;
    color: #574ad3;
  }
  .at-tab.active {
    background: #f0efff;
    color: #5a4ed7;
  }
  .at-badge {
    background: #e8e5ff;
    color: #574ad3;
    border-radius: 10px;
    padding: 1px 6px;
    font-size: 10px;
  }
  .at-panel {
    display: grid;
    gap: 14px;
  }
  .at-search label,
  .at-field label {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #555d6d;
  }
  .at-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .at-row input {
    flex: 1 1 220px;
  }
  input,
  select {
    height: 38px;
    border: 1px solid #e5e7ed;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 12px;
    background: #fff;
    color: var(--ink, #202536);
    min-width: 0;
  }
  input:focus,
  select:focus {
    outline: none;
    border-color: #8d83ee;
    box-shadow: 0 0 0 3px #f0efff;
  }
  .at-btn {
    border: 0;
    border-radius: 8px;
    background: var(--purple, #6558e8);
    color: #fff;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 700;
    min-height: 38px;
  }
  .at-btn:hover:not(:disabled) {
    background: var(--purple-dark, #5145d2);
  }
  .at-btn-small {
    padding: 7px 11px;
    font-size: 11px;
    min-height: 32px;
  }
  .at-btn-ghost {
    background: transparent;
    color: #5a4ed7;
    border: 1px solid #dedaf8;
  }
  .at-btn-ghost:hover:not(:disabled) {
    background: #f7f6ff;
  }
  .at-link-btn {
    border: 0;
    background: transparent;
    color: var(--purple, #6558e8);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 0;
  }
  .at-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .at-section-heading h3,
  .at-review h3 {
    margin: 0;
    font-size: 14px;
  }
  .at-heading-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .at-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .at-item,
  .at-notification {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 12px;
    border: 1px solid #eef0f4;
    border-radius: 10px;
    background: #fbfbfd;
  }
  .at-item-main {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .at-item-main strong {
    font-size: 12px;
  }
  .at-item-main small,
  .at-notification small {
    color: var(--muted, #8790a2);
    font-size: 10px;
    overflow-wrap: anywhere;
  }
  .at-item-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .at-status {
    color: var(--green, #16956b);
    font-size: 10px;
    font-weight: 700;
  }
  .at-status-off {
    color: #9ba1ae;
  }
  .at-notification {
    align-items: flex-start;
  }
  .at-notification.at-unread {
    border-color: #dcd9ff;
    background: #faf9ff;
  }
  .at-notification-body {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .at-notification-title {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .at-notification-title strong {
    font-size: 12px;
  }
  .at-notification-body p {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .at-unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--purple, #6558e8);
    flex: none;
  }
  .at-read-label {
    color: var(--muted, #8790a2);
    font-size: 10px;
    white-space: nowrap;
  }
  .at-form {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid #eef0f4;
    border-radius: 12px;
    background: #fbfbfd;
  }
  .at-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 11px;
  }
  .at-field {
    display: grid;
  }
  .at-note {
    margin: 0;
    padding: 10px 12px;
    border: 1px solid #e4e0ff;
    border-radius: 10px;
    background: #f7f6ff;
    color: #574ad3;
    font-size: 11px;
    line-height: 1.5;
  }
  .at-muted {
    margin: 0;
    color: var(--muted, #8790a2);
    font-size: 11px;
  }
  .at-empty {
    margin: 0;
    padding: 22px;
    border: 1px dashed #dfe2e9;
    border-radius: 10px;
    text-align: center;
    color: var(--muted, #8790a2);
    font-size: 12px;
  }
  .at-error {
    margin: 0;
    padding: 9px 11px;
    border: 1px solid #f2c9c9;
    border-radius: 8px;
    background: #fff4f4;
    color: #a33a3a;
    font-size: 11px;
    line-height: 1.5;
  }
  .at-error-block {
    display: grid;
    gap: 8px;
    justify-items: start;
  }
  .at-review,
  .at-success {
    display: grid;
    gap: 12px;
    padding: 15px;
    border: 1px solid #dcd9ff;
    border-radius: 12px;
    background: #f7f6ff;
  }
  .at-success {
    border-color: #bfe8d8;
    background: #f2fbf7;
  }
  .at-success strong {
    font-size: 13px;
  }
  .at-success p {
    margin: 0;
    color: #3f5c51;
    font-size: 11px;
    line-height: 1.5;
  }
  .at-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
    gap: 10px;
    margin: 0;
  }
  .at-summary div {
    display: grid;
    gap: 3px;
  }
  .at-summary dt {
    color: var(--muted, #8790a2);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .at-summary dd {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .at-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  @media (max-width: 560px) {
    .at-card {
      padding: 16px;
    }
    .at-item,
    .at-notification {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
