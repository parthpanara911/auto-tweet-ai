// Present a single GitHub repository with tracking status and track/untrack actions
import React, { useMemo } from 'react';

function formatLastSync(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function RepositoryCard({
  repo,
  busy = false,
  errorMessage = '',
  onTrack,
  onUntrack,
}) {
  // State handling: derive UI labels from repo status safely 
  const isTracked = Boolean(repo?.tracked);
  const trackingStatus = repo?.trackingStatus ?? (isTracked ? 'enabled' : 'disabled');

  const statusLabel = useMemo(() => {
    if (!isTracked && trackingStatus === 'pending') return 'Enabling…';
    if (isTracked) return 'Tracking Enabled ✅';
    return 'Not Tracked';
  }, [isTracked, trackingStatus]);

  const lastSync = useMemo(() => formatLastSync(repo?.lastSyncAt), [repo?.lastSyncAt]);

  const disableTrack = busy || isTracked || trackingStatus === 'pending';
  const disableUntrack = busy || !isTracked;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {repo?.name || repo?.fullName || 'Repository'}
          </h3>
          <p className="text-xs text-gray-500 truncate">{repo?.fullName || ''}</p>
        </div>

        <span
          className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${isTracked
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : trackingStatus === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-gray-800 border-gray-700 text-gray-200'
            }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="min-w-0">
        {/* State handling: description can be empty*/}
        {repo?.description ? (
          <p className="text-sm text-gray-300 leading-relaxed break-words">{repo.description}</p>
        ) : (
          <p className="text-sm text-gray-500">No description</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
          {repo?.language ? (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800 border border-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>{repo.language}</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-400">
              Language unknown
            </span>
          )}

          {lastSync ? <span className="text-gray-400">Last sync: {lastSync}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${disableTrack
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25'
              }`}
            disabled={disableTrack}
            // State handling: prevent duplicate clicks 
            onClick={() => onTrack?.(repo)}
          >
            {busy && !isTracked ? 'Tracking…' : 'Track Repo'}
          </button>

          <button
            type="button"
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${disableUntrack
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200 hover:bg-rose-500/20'
              }`}
            disabled={disableUntrack}
            // State handling: prevent duplicate clicks 
            onClick={() => onUntrack?.(repo)}
          >
            {busy && isTracked ? 'Untracking…' : 'Untrack Repo'}
          </button>
        </div>
      </div>

      {errorMessage ? <p className="text-xs text-rose-300">{errorMessage}</p> : null}
    </div>
  );
}

