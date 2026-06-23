import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useDashboardSummary } from "../hooks/useDashboardSummary.js";
import { TweetGenerator } from '../components/tweet/TweetGenerator.jsx';

const Dashboard = () => {
  usePageTitle("Dashboard");
  const { summary, loading: summaryLoading, error: summaryError } = useDashboardSummary();

  if (summaryLoading) {
    return <p className="text-gray-400">Loading dashboard...</p>;
  }

  if (summaryError) {
    return (
      <div className="text-red-400">
        Failed to load dashboard.
      </div>
    );
  }

  const trackingStatus = summary?.system?.trackingStatus ?? "Inactive";
  const autoTweetEnabled = summary?.system?.autoTweetEnabled ?? false;

  const totalRepos = summary?.repositories?.total ?? 0;
  const trackedRepos = summary?.repositories?.tracked ?? 0;

  const tweetsTotal = summary?.tweets?.total ?? 0;
  const tweetsDraft = summary?.tweets?.draft ?? 0;;
  const tweetsApproved = summary?.tweets?.approved ?? 0;
  const tweetsRejected = summary?.tweets?.rejected ?? 0;
  // const tweetsPosted = summary?.tweets?.posted ?? 0;

  const trackedRepositories =
    summary?.repositories?.trackedRepositories ?? [];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">

        {/* System Activity */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <p className="text-sm text-gray-400">System Overview</p>
          <h2 className="text-lg font-semibold text-white mt-1">
            <span className={`text-xs ${trackingStatus === "Active" ? "text-green-400" : "text-red-400"
              }`}>
              ●
            </span>{" "}
            {trackingStatus}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Auto Tweet: {autoTweetEnabled ? "Enabled" : "Disabled"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Repo tracking & auto-tweet status
          </p>
        </div>

        {/* Repository Tracking */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <p className="text-sm text-gray-400">Repositories Tracking</p>
          <h2 className="text-lg font-semibold text-white mt-1">
            Repositories
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Total repositories: {totalRepos ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tracked repos: {trackedRepos}
          </p>
        </div>

        {/* Tweet Generation */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <p className="text-sm text-gray-400">Tweet Generation</p>
          <h2 className="text-lg font-semibold text-white mt-1">
            AI-powered
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Total tweets: {tweetsTotal}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Drafts: {tweetsDraft} • Approved: {tweetsApproved} • Rejected: {tweetsRejected}
          </p>
        </div>
      </section>

      <TweetGenerator
        repositories={trackedRepositories}
        repositoriesLoading={summaryLoading}
      />

    </div>
  );
};

export default Dashboard;