// Display and manage repositories with search, pagination, tracking controls, and sync functionality
import React, { useCallback, useEffect, useRef, useState } from 'react';
import RepositoryCard from './RepositoryCard.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRepositories } from '../../hooks/useRepositories.js';

function toErrorMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err?.body?.message) return err.body.message;
  if (err?.message) return err.message;
  return 'Something went wrong';
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="animate-pulse space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-40 bg-gray-800 rounded" />
          <div className="h-5 w-28 bg-gray-800 rounded-full" />
        </div>
        <div className="h-4 w-full bg-gray-800 rounded" />
        <div className="h-4 w-2/3 bg-gray-800 rounded" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-7 w-28 bg-gray-800 rounded-md" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-gray-800 rounded-lg" />
            <div className="h-9 w-28 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryList() {
  usePageTitle("Repositories");

  const [page, setPage] = useState(1);
  const limit = 12;

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    loading,
    error,
    pagination,
    publicTotal,
    refetch,
    updateRepoOptimistic,
    enableTracking,
    disableTracking,
    syncRepositories,
  } = useRepositories({ page, limit, search: query });

  const [busyByRepo, setBusyByRepo] = useState(() => new Map());
  const [errorByRepo, setErrorByRepo] = useState(() => new Map());

  const pollTimeoutRef = useRef(null);

  const visibleRepos = data;

  const setBusy = useCallback((fullName, isBusy) => {
    // store per-repo request state to disable actions and prevent double clicks
    setBusyByRepo((prev) => {
      const next = new Map(prev);
      if (isBusy) next.set(fullName, true);
      else next.delete(fullName);
      return next;
    });
  }, []);

  const setRepoError = useCallback((fullName, message) => {
    // keep per-repo errors local so one failure doesn't block the entire list
    setErrorByRepo((prev) => {
      const next = new Map(prev);
      if (message) next.set(fullName, message);
      else next.delete(fullName);
      return next;
    });
  }, []);

  const handleTrack = useCallback(
    async (repo) => {
      const fullName = repo?.fullName;
      const repositoryId = repo?.id;
      if (!fullName || !repositoryId) return;

      setRepoError(fullName, '');
      setBusy(fullName, true);

      // optimistic UI while backend registers webhook
      updateRepoOptimistic(
        { id: repositoryId, fullName },
        { tracked: true, trackingStatus: 'pending' },
      );

      try {
        // track repo + register webhook 
        await enableTracking({ repositoryId, repoFullName: fullName });
        // refetch to reflect webhook-backed tracking state from backend
        await refetch();
      } catch (e) {
        // rollback optimistic update if request fails
        updateRepoOptimistic(
          { id: repositoryId, fullName },
          { tracked: false, trackingStatus: 'disabled' },
        );
        setRepoError(fullName, toErrorMessage(e));
      } finally {
        setBusy(fullName, false);
      }
    },
    [enableTracking, refetch, setBusy, setRepoError, updateRepoOptimistic],
  );

  const handleUntrack = useCallback(
    async (repo) => {
      const fullName = repo?.fullName;
      const repositoryId = repo?.id;
      const webhookId = repo?.webhookId;
      if (!fullName || !repositoryId) return;

      setRepoError(fullName, '');
      setBusy(fullName, true);

      // optimistic UI while backend disables/removes webhook
      updateRepoOptimistic(
        { id: repositoryId, fullName },
        { tracked: false, trackingStatus: 'disabled', webhookId: null },
      );

      try {
        // unregister webhook + untrack repo 
        await disableTracking({ repositoryId, webhookId });
        // refetch to reflect backend state
        await refetch();
      } catch (e) {
        // rollback optimistic update if request fails
        updateRepoOptimistic(
          { id: repositoryId, fullName },
          { tracked: true, trackingStatus: 'enabled', webhookId: webhookId || null },
        );
        setRepoError(fullName, toErrorMessage(e));
      } finally {
        setBusy(fullName, false);
      }
    },
    [disableTracking, refetch, setBusy, setRepoError, updateRepoOptimistic],
  );

  useEffect(() => {
    // lightweight auto-refresh when the backend reports "pending" webhook creation
    const hasPending = data.some((r) => r.trackingStatus === 'pending');
    if (!hasPending) return;

    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 2500);

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [data, refetch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Repositories</h1>
          <p className="text-sm text-gray-400">
            Select the repositories you want to track. We’ll automatically sync commits to help generate your tweets.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Public repositories
            {publicTotal != null ? (
              <>
                : <span className="text-gray-300">{publicTotal}</span>
              </>
            ) : (
              <>
                {' '}
                on this page: <span className="text-gray-300">{visibleRepos.length}</span>
              </>
            )}
            {pagination?.pages ? (
              <>
                {' '}
                • Page <span className="text-gray-300">{page}</span> of{' '}
                <span className="text-gray-300">{pagination.pages}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search repositories…"
            className="w-full sm:w-64 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-700"
          />
          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm font-medium border bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-900/60"
            onClick={async () => {
              try {
                await syncRepositories(true);
                await refetch();
              } catch (err) {
                console.error(err);
              }
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-rose-100">Failed to load repositories</p>
              <p className="text-sm text-rose-200/80 mt-1">{toErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium border border-rose-500/30 text-rose-100 hover:bg-rose-500/10"
              // retry the list request
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : visibleRepos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-white">No repositories found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try a different search, or refresh to re-sync repositories.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRepos.map((repo) => (
              <RepositoryCard
                key={repo.id ?? repo.fullName}
                repo={repo}
                busy={busyByRepo.get(repo.fullName) === true}
                errorMessage={errorByRepo.get(repo.fullName) || ''}
                onTrack={handleTrack}
                onUntrack={handleUntrack}
              />
            ))}
          </div>

          {/* pagination controls use backend pagination response */}
          {pagination?.pages ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${page <= 1
                  ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-900/60'
                  }`}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              <div className="text-xs text-gray-500">
                Page <span className="text-gray-200">{page}</span> of{' '}
                <span className="text-gray-200">{pagination.pages}</span>
              </div>

              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${page >= pagination.pages
                  ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-900/60'
                  }`}
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}