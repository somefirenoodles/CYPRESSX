export type ApiError = { message: string; status?: number };

export type UserSummary = { id: number; username: string; firstName: string; lastName: string };
export type Contact = UserSummary & { userId: number };
export type BankAccount = { id: number; bankName: string; last4: string; status: string };
export type AccountNotification = {
  id: number;
  title: string;
  message: string;
  referenceType: string;
  referenceId: number;
  read: boolean;
  createdAt: string;
};
export type InboundTransferResult = {
  id: number;
  status: string;
  amount: string;
  currency: string;
  externalReference: string;
  sourceCountry: string;
  message: string;
};

const jsonHeaders = { 'Content-Type': 'application/json' };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { ...jsonHeaders, ...init.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? body?.error ?? `La solicitud falló (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status }) as ApiError;
  }
  return body as T;
}

export const api = {
  session: () => request<any>('/api/session'),
  register: (data: {
    username: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    email: string;
  }) => request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  dashboard: () => request<any>('/api/dashboard'),
  quote: (data: { amount: string; fromCurrency: string; toCurrency: string }) =>
    request<any>('/api/fx/quotes', { method: 'POST', body: JSON.stringify(data) }),
  payment: (data: { recipientId: number; amount: string; currency: string; quoteId?: string; idempotencyKey: string }) =>
    request<any>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
  createRequest: (data: { recipientId: number; amount: string; currency: string; note: string; idempotencyKey: string }) =>
    request<any>('/api/payment-requests', { method: 'POST', body: JSON.stringify(data) }),
  resolveRequest: (id: number, action: 'accept' | 'reject') =>
    request<any>(`/api/payment-requests/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) }),
  split: (data: {
    title: string;
    total: string;
    currency: string;
    participantIds: number[];
    includeOwner: boolean;
    shares?: { userId: number; amount: string }[];
    idempotencyKey: string;
  }) => request<any>('/api/splits', { method: 'POST', body: JSON.stringify(data) }),
  splitPreview: (data: {
    title: string;
    total: string;
    currency: string;
    participantIds: number[];
    includeOwner: boolean;
    shares?: { userId: number; amount: string }[];
  }) => request<any>('/api/splits/preview', { method: 'POST', body: JSON.stringify(data) }),
  recurrences: () => request<any>('/api/recurrences'),
  createRecurrence: (data: {
    recipientId: number;
    amount: string;
    currency: string;
    frequency: string;
    consent: boolean;
    idempotencyKey: string;
  }) => request<any>('/api/recurrences', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurrence: (id: number, data: { status?: string; amount?: string; consent?: boolean } | string) => {
    const payload = typeof data === 'string' ? { status: data } : data;
    return request<any>(`/api/recurrences/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  merchants: () => request<any>('/api/merchants'),
  merchantPayment: (data: { merchantId: number; amount: string; currency: string; quoteId?: string; idempotencyKey: string }) =>
    request<any>('/api/merchant-payments', { method: 'POST', body: JSON.stringify(data) }),
  topUp: (data: { amount: string; currency: string; idempotencyKey: string }) =>
    request<any>('/api/sandbox/topups', { method: 'POST', body: JSON.stringify(data) }),
  transactions: (query: { cursor?: string; limit?: number; type?: string; status?: string } = {}) => {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') parameters.set(key, String(value));
    return request<any>(`/api/transactions?${parameters}`);
  },
  transaction: (id: number, kind: string) =>
    request<any>(`/api/transactions/${id}?kind=${encodeURIComponent(kind)}`),
  users: (search = '') => request<{ users: UserSummary[] }>(`/api/users?search=${encodeURIComponent(search)}`),
  contacts: () => request<{ contacts: Contact[] }>('/api/contacts'),
  addContact: (userId: number) =>
    request<{ contact: Contact }>('/api/contacts', { method: 'POST', body: JSON.stringify({ userId }) }),
  removeContact: (id: number) => request<void>(`/api/contacts/${id}`, { method: 'DELETE' }),
  bankAccounts: () => request<{ accounts: BankAccount[] }>('/api/bank-accounts'),
  addBankAccount: (data: { bankName: string; accountNumber: string; routingNumber: string }) =>
    request<{ account: BankAccount }>('/api/bank-accounts', { method: 'POST', body: JSON.stringify(data) }),
  disableBankAccount: (id: number) =>
    request<{ account?: BankAccount }>(`/api/bank-accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'disabled' }),
    }),
  notifications: () => request<{ notifications: AccountNotification[]; unreadCount: number }>('/api/notifications'),
  readNotification: (id: number) =>
    request<{ notification?: AccountNotification }>(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    }),
  inboundTransfer: (data: {
    amount: string;
    currency: string;
    externalReference: string;
    sourceCountry: string;
    idempotencyKey: string;
  }) => request<InboundTransferResult>('/api/sandbox/inbound-transfers', { method: 'POST', body: JSON.stringify(data) }),
};

export function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
