// API client with cookie-based authentication
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

let refreshPromise = null;

async function refreshSession() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http')
    ? path
    : API_BASE_URL
      ? `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
      : path;

  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const contentType = res.headers.get('content-type') || '';

  const isAuthRoute = path.includes('/api/auth/login') ||
    path.includes('/api/auth/refresh') || path.includes('/api/auth/exchange');
  const isMeRoute = path.includes('/api/auth/me');

  if (res.status === 401 && !options._retry && !isAuthRoute && !isMeRoute) {
    options._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshSession()
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      // Retry original request
      return request(path, options);
    } catch (refreshError) {
      window.location.replace('/login');
      throw refreshError;
    }
  }

  if (!res.ok) {
    const errBody = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '');

    const error = new Error(errBody?.message || 'Request failed');
    error.status = res.status;
    error.body = errBody;
    throw error;
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const apiClient = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) =>
    request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path, body) =>
    request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
};