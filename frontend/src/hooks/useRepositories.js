// Fetch and manage GitHub repository tracking state for the UI 
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient.js';

const DEFAULT_ENDPOINTS = Object.freeze({
  list: '/api/repositories',
  track: '/api/repositories/track',
  webhooks: '/api/webhooks',
  registerWebhook: '/api/webhooks/register',
});

function normalizeRepo(raw) {
  // State handling: normalize unknown backend shapes into a stable UI 
  const id = raw?.id ?? raw?._id ?? raw?.repoId;
  const name = raw?.name;
  const fullName = raw?.fullName ?? raw?.full_name ?? raw?.slug ?? name;

  const lastSyncAt = raw?.lastSyncedAt ?? raw?.lastSyncAt ?? raw?.last_sync_at ?? null;

  return {
    id,
    name: name ?? fullName ?? 'Unknown repository',
    fullName: fullName ?? name ?? 'unknown',
    description: raw?.description ?? '',
    language: raw?.language ?? raw?.primaryLanguage ?? '',
    url: raw?.url ?? '',
    isPrivate: Boolean(raw?.isPrivate),
    lastSyncAt,
    raw,
  };
}

function extractRepoArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.repositories)) return payload.repositories;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractPagination(payload) {
  const p = payload?.pagination;
  if (!p || typeof p !== 'object') return null;
  return {
    total: typeof p.total === 'number' ? p.total : null,
    limit: typeof p.limit === 'number' ? p.limit : null,
    skip: typeof p.skip === 'number' ? p.skip : null,
    pages: typeof p.pages === 'number' ? p.pages : null,
  };
}

function buildQuery(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function extractWebhooksArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function useRepositories(options = {}) {
  const endpoints = { ...DEFAULT_ENDPOINTS, ...(options.endpoints || {}) };
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalTracked, setTotalTracked] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [publicTotal, setPublicTotal] = useState(null);

  const fetchIdRef = useRef(0);

  const computePublicTotal = useCallback(
    async (reposPages) => {

      if (!reposPages || typeof reposPages !== 'number') return null;

      const maxPagesToScan = Math.min(reposPages, 10);
      let count = 0;

      for (let p = 1; p <= maxPagesToScan; p += 1) {
        const payload = await apiClient.get(`${endpoints.list}${buildQuery({ page: p, limit: 50 })}`);
        const reposRaw = extractRepoArray(payload);
        for (const r of reposRaw) {
          if (!r?.isPrivate) count += 1;
        }
      }

      return maxPagesToScan === reposPages ? count : null;
    },
    [endpoints.list],
  );

  const fetchRepositories = useCallback(async () => {
    // list repositories and normalize. 
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const reposPayload = await apiClient.get(
        `${endpoints.list}${buildQuery({ page, limit })}`,
      );

      const reposRaw = extractRepoArray(reposPayload);
      const reposNormalized = reposRaw.map(normalizeRepo);
      const reposPagination = extractPagination(reposPayload);

      // fetch webhooks so tracked reflects webhook presence 
      const webhookRepoIdToWebhookId = new Map();
      let webhookPage = 1;
      let webhookPages = 1;

      while (webhookPage <= webhookPages) {
        const webhooksPayload = await apiClient.get(
          `${endpoints.webhooks}${buildQuery({ page: webhookPage, limit: 50 })}`,
        );
        const webhooks = extractWebhooksArray(webhooksPayload);
        const wp = extractPagination(webhooksPayload);
        webhookPages = wp?.pages ?? webhookPages;

        for (const wh of webhooks) {
          if (!wh?.isActive) continue;

          const repoId =
            wh?.repositoryId?._id ?? wh?.repositoryId?.id ?? wh?.repositoryId ?? null;
          const webhookId = wh?._id ?? wh?.id ?? null;
          if (repoId && webhookId && !webhookRepoIdToWebhookId.has(String(repoId))) {
            webhookRepoIdToWebhookId.set(String(repoId), String(webhookId));
          }
        }

        if (webhookPage >= 10) break;
        webhookPage += 1;
      }

      const trackedRepoIds = new Set(webhookRepoIdToWebhookId.keys());
      const totalTracked = trackedRepoIds.size;

      const publicRepos = reposNormalized
        .filter((r) => !r.isPrivate)
        .map((r) => {
          const hasWebhook = r.id != null && webhookRepoIdToWebhookId.has(String(r.id));
          const webhookId = hasWebhook ? webhookRepoIdToWebhookId.get(String(r.id)) : null;
          const tracked = hasWebhook;
          return {
            ...r,
            webhookId: webhookId || null,
            tracked,
            trackingStatus: tracked ? 'enabled' : 'disabled',
          };
        });

      if (fetchId === fetchIdRef.current) {
        setTotalTracked(totalTracked);
        setData(publicRepos);
        setPagination(reposPagination);
      }

      if (reposPagination?.pages) {
        computePublicTotal(reposPagination.pages)
          .then((total) => {
            if (fetchId === fetchIdRef.current) setPublicTotal(total);
          })
          .catch(() => {
            if (fetchId === fetchIdRef.current) setPublicTotal(null);
          });
      } else if (fetchId === fetchIdRef.current) {
        setPublicTotal(null);
      }
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        setError(e);
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [endpoints.list, endpoints.webhooks, limit, page]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const refetch = useCallback(() => fetchRepositories(), [fetchRepositories]);

  const byFullName = useMemo(() => {
    const map = new Map();
    for (const repo of data) map.set(repo.fullName, repo);
    return map;
  }, [data]);

  const updateRepoOptimistic = useCallback((fullName, patch) => {
    // optimistic update while backend performs work
    const selector =
      typeof fullName === 'string' ? { fullName } : fullName && typeof fullName === 'object'
        ? fullName
        : null;
    if (!selector) return;

    setData((prev) =>
      prev.map((r) => {
        const matches =
          (selector.id != null && r.id === selector.id) ||
          (selector.fullName != null && r.fullName === selector.fullName);
        return matches ? { ...r, ...patch } : r;
      }),
    );
  }, []);

  const trackRepo = useCallback(
    async (fullName) => {
      // enable tracking for a repo
      await apiClient.patch(endpoints.track, { repoFullName: fullName });
    },
    [endpoints.track],
  );

  const registerWebhook = useCallback(
    async (repositoryId) => {
      // register webhook for a repository
      await apiClient.post(endpoints.registerWebhook, { repositoryId });
    },
    [endpoints.registerWebhook],
  );

  const untrackRepo = useCallback(async (repositoryId) => {
    // disable tracking for a repo by repositoryId
    await apiClient.patch(`/api/repositories/${repositoryId}/untrack`);
  }, []);

  const unregisterWebhook = useCallback(async (webhookId) => {
    // unregister/delete a webhook
    await apiClient.delete(`/api/webhooks/${webhookId}`);
  }, []);

  const enableTracking = useCallback(
    async ({ repositoryId, repoFullName }) => {
      // mark repository tracked and register webhook 
      await trackRepo(repoFullName);
      await registerWebhook(repositoryId);
    },
    [registerWebhook, trackRepo],
  );

  const disableTracking = useCallback(
    async ({ repositoryId, webhookId }) => {
      // unregister webhook and mark repository untracked
      if (webhookId) await unregisterWebhook(webhookId);
      await untrackRepo(repositoryId);
    },
    [unregisterWebhook, untrackRepo],
  );

  return {
    data,
    loading,
    error,
    pagination,
    page,
    limit,
    publicTotal,
    totalTracked,
    refetch,
    byFullName,
    updateRepoOptimistic,
    enableTracking,
    disableTracking,
    endpoints,
  };
}
