import { apiClient } from './apiClient.js';

export async function fetchMe() {
  return apiClient.get('/api/auth/me');
}

export async function syncRepositories() {
  return apiClient.post('/api/repositories/sync?force=true');
}

export async function logoutRequest() {
  return apiClient.post('/api/auth/logout');
}