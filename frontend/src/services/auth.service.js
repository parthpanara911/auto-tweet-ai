import { apiClient } from './apiClient.js';

export async function fetchMe() {
  return apiClient.get('/api/auth/me');
}

export async function logoutRequest() {
  return apiClient.post('/api/auth/logout');
}

