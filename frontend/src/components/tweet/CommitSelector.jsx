/**
 * CommitSelector — pick a tracked repository
 */
import React from 'react';
import { useCommits } from '../../hooks/useCommits.js';
import { CommitItem } from './CommitItem.jsx';

const MAX_COMMITS = 5;

export function CommitSelector({
  trackedRepos,
  selectedRepositoryId,
  onRepositoryChange,
  selectedIds,
  onToggle,
  disabled,
  repositoryListLoading,
}) {
  const commitsEnabled = Boolean(selectedRepositoryId) && !repositoryListLoading;

  const { commits, loading, error, refetch } = useCommits({
    repositoryId: selectedRepositoryId,
    enabled: commitsEnabled,
  });

  const selectedSet = React.useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const atMax = selectedSet.size >= MAX_COMMITS;

  if (repositoryListLoading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-8 text-center text-sm text-gray-400">
        Loading repositories…
      </div>
    );
  }

  // Repository filtering: Dropdown only lists repos the user already tracks via webhooks 
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="tweet-manual-repo" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          Repository
        </label>
        <select
          id="tweet-manual-repo"
          value={selectedRepositoryId}
          onChange={(e) => onRepositoryChange(e.target.value)}
          disabled={disabled || !trackedRepos.length}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select a repository…</option>
          {trackedRepos.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.fullName}
            </option>
          ))}
        </select>
      </div>

      {!trackedRepos.length ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/40 px-4 py-8 text-center text-sm text-gray-400">
          No tracked repositories. Enable tracking on a repository first.
        </div>
      ) : null}

      {trackedRepos.length > 0 && !selectedRepositoryId ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/40 px-4 py-8 text-center text-sm text-gray-400">
          Choose a repository to load its eligible commits.
        </div>
      ) : null}

      {commitsEnabled && loading ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-8 text-center text-sm text-gray-400">
          Loading commits…
        </div>
      ) : null}

      {commitsEnabled && error ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-4 text-sm text-red-300">
          <p className="font-medium">Could not load commits</p>
          <p className="mt-1 text-xs text-red-200/80">{error.message || 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-md bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/60"
          >
            Retry
          </button>
        </div>
      ) : null}

      {commitsEnabled && !loading && !error && !commits.length ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/40 px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-300">No commits available</p>

          <p className="mt-2 text-sm text-gray-500">
            No new commits found for this tracked repository.
          </p>

          <ul className="mt-3 text-xs text-gray-500 space-y-1 text-left max-w-md mx-auto">
            <li>• Make sure you’ve recently pushed code to this repository</li>
            <li>• Only new, unused commits from this tracked repository are shown</li>
          </ul>
        </div>
      ) : null}

      {commitsEnabled && !loading && !error && commits.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Commits</p>
            <p className="text-xs text-gray-400">
              Selected:{' '}
              <span className="font-semibold text-white">
                {selectedSet.size} / {MAX_COMMITS}
              </span>
            </p>
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {commits.map((commit) => {
              const checked = selectedSet.has(commit.id);
              const rowDisabled = disabled || (!checked && atMax);
              return (
                <CommitItem
                  key={commit.id}
                  commit={commit}
                  checked={checked}
                  disabled={rowDisabled}
                  onToggle={onToggle}
                />
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
