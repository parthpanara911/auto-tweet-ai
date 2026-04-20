import React, { useState } from 'react';
import { useRepositories } from "../hooks/useRepositories";
import { useTweets } from "../hooks/useTweets";
import { TweetGenerator } from '../components/tweet/TweetGenerator.jsx';

const Dashboard = () => {
  const { loading: repoLoading, publicTotal, totalTracked } = useRepositories();
  const { tweets, loading: tweetsLoading } = useTweets({ listScope: "all" });
  const [autoTweetEnabled] = useState(true);

  if (tweetsLoading || repoLoading) {
    return <p className="text-gray-400">Loading dashboard...</p>;
  }

  const trackedRepos = totalTracked ?? 0;
  const trackingStatus = trackedRepos > 0 ? "Active" : "Inactive";

  const tweetsTotal = tweets.length;
  const tweetsDraft = tweets.filter((t) => t.status === "draft").length;
  const tweetsApproved = tweets.filter((t) => t.status === "approved").length;
  const tweetsRejected = tweets.filter((t) => t.status === "rejected").length;
  const tweetsPosted = tweets.filter((t) => t.status === "posted").length;

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
            Total repositories: {publicTotal ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tracked repos: {totalTracked}
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
            Drafts: {tweetsDraft} • Approved: {tweetsApproved} • Rejected: {tweetsRejected} • Posted: {tweetsPosted}
          </p>
        </div>
      </section>

      <TweetGenerator />

    </div>
  );
};

export default Dashboard;