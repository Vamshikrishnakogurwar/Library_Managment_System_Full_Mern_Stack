const BASE_URL = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('libraflow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getProfile: () => apiRequest('/auth/me'),

  // Catalog
  getBooks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog${query ? `?${query}` : ''}`);
  },
  getCategories: () => apiRequest('/catalog/categories'),
  getBookById: (id) => apiRequest(`/catalog/${id}`),
  createBook: (bookData) => apiRequest('/catalog', { method: 'POST', body: JSON.stringify(bookData) }),
  addCopy: (bookId, copyData) => apiRequest(`/catalog/${bookId}/copies`, { method: 'POST', body: JSON.stringify(copyData) }),
  updateCopyStatus: (copyId, data) => apiRequest(`/catalog/copies/${copyId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomerById: (id) => apiRequest(`/customers/${id}`),
  toggleSuspension: (id, isSuspended) => apiRequest(`/customers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ isSuspended }) }),

  // Circulation
  getActiveLoans: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/circulation/loans${query ? `?${query}` : ''}`);
  },
  issueBook: (data) => apiRequest('/circulation/issue', { method: 'POST', body: JSON.stringify(data) }),
  previewReturn: (loanId) => apiRequest(`/circulation/return-preview/${loanId}`),
  returnBook: (data) => apiRequest('/circulation/return', { method: 'POST', body: JSON.stringify(data) }),

  // Billing
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/billing/invoices${query ? `?${query}` : ''}`);
  },
  getInvoiceDetails: (id) => apiRequest(`/billing/invoices/${id}`),
  recordPayment: (paymentData) => apiRequest('/billing/payments', { method: 'POST', body: JSON.stringify(paymentData) }),
  waiveFine: (fineId, waiverData) => apiRequest(`/billing/fines/${fineId}/waive`, { method: 'POST', body: JSON.stringify(waiverData) }),

  // System & Reports
  getDashboardMetrics: () => apiRequest('/system/metrics'),
  getSettings: () => apiRequest('/system/settings'),
  updateSettings: (settings) => apiRequest('/system/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getMembershipPlans: () => apiRequest('/system/memberships'),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/system/audit-logs${query ? `?${query}` : ''}`);
  },
  askAiAssistant: (query) => apiRequest('/system/ai/ask', { method: 'POST', body: JSON.stringify({ query }) }),
};
