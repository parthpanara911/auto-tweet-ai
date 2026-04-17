import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Connected account</p>
          <p className="text-sm text-white font-medium">{user?.username || 'GitHub user'}</p>
          <p className="text-xs text-gray-500 mt-1">
            Data flows from GitHub → webhooks → queue → commit processor → AI tweet generator.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Commit tracking</p>
          <p className="text-sm text-white font-medium">Active</p>
          <p className="text-xs text-gray-500 mt-1">
            New commits are queued via Redis + Bull for background processing.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Tweet generation</p>
          <p className="text-sm text-white font-medium">AI-powered</p>
          <p className="text-xs text-gray-500 mt-1">
            AutoTweetAI turns processed commits into tweet-ready summaries.
          </p>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Activity overview</h2>
        <p className="text-sm text-gray-300">
          This is your central view into how AutoTweetAI interacts with your GitHub commits and
          generates tweets. Future versions can surface recent commits, generated tweets, and rate
          limit status here.
        </p>
      </section>
    </div>
  );
};

export default Dashboard;

