/**
 * useTweets — draft listing (GET /api/tweets?status=draft), post-queue polling, and draft lifecycle actions
 * (PATCH edit, approve, reject). Aligns UI with backend: commits are not final until tweet.status === "posted"
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient.js';

export const TWEET_MAX_LENGTH = 280;

function buildQuery(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function normalizeTweet(raw) {
  if (!raw) return null;
  const id = raw.id ?? raw._id;
  return {
    id: id != null ? String(id) : null,
    content: raw.content ?? '',
    status: raw.status ?? 'draft',
    metadata: raw.metadata ?? {},
    repositoryFullName: raw.repositoryFullName ?? null,
    commits: Array.isArray(raw.commits) ? raw.commits : [],
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    generatedAt: raw.generatedAt ?? null,
    raw,
  };
}

/**
 * @param {object} [options]
 * @param {number} [options.limit] 
 */
export function useTweets(options = {}) {
  const limit = options.limit ?? 20;

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyTweetId, setBusyTweetId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const pollTimerRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  const fetchDrafts = useCallback(async () => {
    setError(null);
    try {
      const query = buildQuery({ status: 'draft', page: 1, limit });
      const payload = await apiClient.get(`/api/tweets${query}`);
      const inner = payload?.data;
      const tweetsRaw = Array.isArray(inner?.tweets) ? inner.tweets : [];
      const next = tweetsRaw.map(normalizeTweet).filter((t) => t?.id);
      setDrafts(next);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const stopPollingDrafts = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollDeadlineRef.current = null;
  }, []);

  /**
   * Poll GET /api/tweets?status=draft on an interval until the deadline; used after POST /generate returns 202
   */
  const startPollingDrafts = useCallback(
    (pollOptions = {}) => {
      const intervalMs = pollOptions.intervalMs ?? 2000;
      const durationMs = pollOptions.durationMs ?? 60000;

      stopPollingDrafts();
      pollDeadlineRef.current = Date.now() + durationMs;

      pollTimerRef.current = setInterval(() => {
        // Polling: stop after durationMs so do not poll forever if the worker fails silently
        if (pollDeadlineRef.current != null && Date.now() > pollDeadlineRef.current) {
          stopPollingDrafts();
          return;
        }
        fetchDrafts();
      }, intervalMs);
    },
    [fetchDrafts, stopPollingDrafts],
  );

  useEffect(() => () => stopPollingDrafts(), [stopPollingDrafts]);

  /** Draft lifecycle: persist edited text (draft-only on server) */
  const saveDraftContent = useCallback(
    async (tweetId, content) => {
      setActionError(null);
      setBusyTweetId(String(tweetId));
      try {
        await apiClient.patch(`/api/tweets/${tweetId}`, { content });
        await fetchDrafts();
      } catch (e) {
        setActionError(e);
        throw e;
      } finally {
        setBusyTweetId(null);
      }
    },
    [fetchDrafts],
  );

  /** Draft lifecycle: promote to approved */
  const approveDraft = useCallback(
    async (tweetId) => {
      setActionError(null);
      setBusyTweetId(String(tweetId));
      try {
        await apiClient.post(`/api/tweets/${tweetId}/approve`, {});
        await fetchDrafts();
      } catch (e) {
        setActionError(e);
        throw e;
      } finally {
        setBusyTweetId(null);
      }
    },
    [fetchDrafts],
  );

  /** Draft lifecycle: reject — backend resets linked commits' tweeted flags when applicable */
  const rejectDraft = useCallback(
    async (tweetId) => {
      setActionError(null);
      setBusyTweetId(String(tweetId));
      try {
        await apiClient.post(`/api/tweets/${tweetId}/reject`, {});
        await fetchDrafts();
      } catch (e) {
        setActionError(e);
        throw e;
      } finally {
        setBusyTweetId(null);
      }
    },
    [fetchDrafts],
  );

  return {
    drafts,
    loading,
    error,
    refetchDrafts: fetchDrafts,
    startPollingDrafts,
    stopPollingDrafts,
    saveDraftContent,
    approveDraft,
    rejectDraft,
    busyTweetId,
    actionError,
    clearActionError: () => setActionError(null),
  };
}
