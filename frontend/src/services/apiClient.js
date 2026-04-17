// API client with cookie-based authentication
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

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
};

