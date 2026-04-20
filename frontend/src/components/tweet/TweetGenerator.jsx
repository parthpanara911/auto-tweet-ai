/**
 * TweetGenerator — dashboard card for queueing tweet generation and managing draft lifecycle
 * Manual mode: repository dropdown → commits from that repo only → POST /api/tweets/generate with { commitIds }
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.js';
import { useRepositories } from '../../hooks/useRepositories.js';
import { useTweets } from '../../hooks/useTweets.js';
import { CommitSelector } from './CommitSelector.jsx';
import { TweetPreview } from './TweetPreview.jsx';

export function TweetGenerator() {
  const { data: repos, loading: reposLoading } = useRepositories({ page: 1, limit: 100 });

  const [manualRepositoryId, setManualRepositoryId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [autoTweetEnabled] = useState(true);

  // Repository filtering: same source as tracking UI — only repos with an active webhook count as "tracked"
  const trackedRepos = useMemo(
    () => repos.filter((r) => r.tracked && r.id != null),
    [repos],
  );

  const {
    tweets,
    loading: draftsLoading,
    error: draftsError,
    refetchDrafts,
    startPollingDrafts,
    stopPollingDrafts,
    saveDraftContent,
    approveDraft,
    rejectDraft,
    busyTweetId,
    actionError,
    clearActionError,
  } = useTweets({ listScope: 'drafts', limit: 20 });

  useEffect(() => {
    setGenerateError(null);
  }, []);

  const handleRepositoryChange = useCallback((repoId) => {
    setManualRepositoryId(repoId);
    // New repository scope: drop any selections so commitIds always match one repo
    setSelectedIds([]);
  }, []);

  const toggleCommitSelection = useCallback((commitId) => {
    const id = String(commitId);
    setSelectedIds((prev) => {
      const asSet = new Set(prev.map(String));
      if (asSet.has(id)) {
        asSet.delete(id);
        return Array.from(asSet);
      }
      if (asSet.size >= 5) return prev;
      asSet.add(id);
      return Array.from(asSet);
    });
  }, []);

  const canGenerateManual =
    !generating &&
    Boolean(manualRepositoryId) &&
    selectedIds.length >= 1 &&
    selectedIds.length <= 5;

  const canGenerate = canGenerateManual;
  const blockManualWithoutRepos = !reposLoading && trackedRepos.length === 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setGenerateError(null);
    setStatusMessage('Generating tweet…');

    try {
      // Async generation flow: server queues Bull job; only wait for HTTP 202, not the finished draft
      await apiClient.post('/api/tweets/generate', { commitIds: selectedIds });

      refetchDrafts();
      startPollingDrafts({ intervalMs: 2000, durationMs: 60000 });
      setStatusMessage('Generating your tweet… it will appear here shortly.');
    } catch (e) {
      setGenerateError(e);
      setStatusMessage(null);
      stopPollingDrafts();
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async (tweetId, content) => {
    try {
      await saveDraftContent(tweetId, content);
    } catch {
      // Error: stay in edit mode in draft tweet card
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-gray-200 shadow-sm">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Tweet generation</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose a tracked repository and select up to 5 commits manually.
            To track a repository, visit the{" "}
            <Link to="/repositories" className="text-xs font-medium text-sky-400 hover:text-sky-300">
              Repositories
            </Link>{" "}
            page.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Auto draft is {autoTweetEnabled ? "enabled" : "disabled"} —{" "}
            {autoTweetEnabled
              ? "tweets are generated automatically when you push to tracked repositories."
              : "automatic tweet generation is turned off."}
            {" "}When selecting commits manually, click “Generate Tweet” to create tweets.
          </p>

          {blockManualWithoutRepos ? (
            <div className="rounded-lg border border-dashed border-amber-900/40 bg-amber-950/20 px-4 py-6 text-sm text-amber-100/90">
              <p className="font-medium text-amber-200">No tracked repositories</p>
              <p className="mt-2 text-xs text-amber-100/70">
                Enable tracking on at least one public repository to use manual selection.
              </p>
            </div>
          ) : null}

          {!blockManualWithoutRepos ? (
            <CommitSelector
              trackedRepos={trackedRepos}
              selectedRepositoryId={manualRepositoryId}
              onRepositoryChange={handleRepositoryChange}
              selectedIds={selectedIds}
              onToggle={toggleCommitSelection}
              disabled={generating || reposLoading}
              repositoryListLoading={reposLoading}
            />
          ) : null}

          {generateError ? (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {generateError.message || 'Generation request failed'}
            </div>
          ) : null}

          {statusMessage ? <p className="text-sm text-sky-300/90">{statusMessage}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || blockManualWithoutRepos}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {generating ? 'Generating tweet…' : 'Generate Tweet'}
            </button>
            <span className="text-xs text-gray-500">
              {selectedIds.length} selected · min 1, max 5
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Draft previews</h3>
          {draftsError ? (
            <p className="mb-3 text-xs text-red-400">{draftsError.message}</p>
          ) : null}
          <TweetPreview
            drafts={tweets}
            loading={draftsLoading}
            busyTweetId={busyTweetId}
            onSaveContent={handleSaveDraft}
            onApprove={(id) => approveDraft(id)}
            onReject={(id) => rejectDraft(id)}
            actionError={actionError}
            onDismissActionError={clearActionError}
            latestOnly
          />
        </div>
      </div>
    </div>
  );
}
