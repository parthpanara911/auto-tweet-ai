/**
 * useCommits — loads commits for ONE repository via GET /api/commits scoped by repositoryId
 * Server filters isProcessed & tweeted
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient.js';

const DEFAULT_LIMIT = 100;

function buildQuery(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function normalizeCommit(raw) {
  const id = raw?._id != null ? String(raw._id) : raw?.id != null ? String(raw.id) : null;
  const repositoryId =
    raw?.repositoryId != null
      ? String(raw.repositoryId?._id ?? raw.repositoryId)
      : null;
  return {
    id,
    repositoryId,
    message: raw?.message ?? '',
    githubSha: raw?.githubSha ?? '',
    additions: typeof raw?.additions === 'number' ? raw.additions : 0,
    deletions: typeof raw?.deletions === 'number' ? raw.deletions : 0,
    filesChanged: typeof raw?.filesChanged === 'number' ? raw.filesChanged : 0,
    timestamp: raw?.timestamp ?? null,
    url: raw?.url ?? '',
    isProcessed: Boolean(raw?.isProcessed),
    tweeted: Boolean(raw?.tweeted),
    raw,
  };
}

/**
 * @param {object} options
 * @param {string|null|undefined} options.repositoryId — Mongo id of the repo whose commits are loaded.
 * @param {boolean} [options.enabled] — skip fetch when false 
 */
export function useCommits(options = {}) {
  const { repositoryId = null, enabled = true } = options;

  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && repositoryId));
  const [error, setError] = useState(null);

  const fetchIdRef = useRef(0);

  const fetchCommits = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery({
        page: 1,
        limit: DEFAULT_LIMIT,
        tweeted: 'false',
        isProcessed: 'true',
        repositoryId: repositoryId || undefined,
      });
      const payload = await apiClient.get(`/api/commits${query}`);
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const normalized = rows
        .map(normalizeCommit)
        .filter(
          (c) =>
            c.id &&
            c.isProcessed &&
            c.tweeted !== true,
        );

      if (fetchId !== fetchIdRef.current) return;

      setCommits(normalized);
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        setError(e);
        setCommits([]);
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [repositoryId]);

  useEffect(() => {
    if (!enabled || !repositoryId) {
      setLoading(false);
      setCommits([]);
      return;
    }
    fetchCommits();
  }, [enabled, repositoryId, fetchCommits]);

  return {
    commits,
    loading,
    error,
    refetch: fetchCommits,
  };
}
