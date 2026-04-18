/**
 * CommitItem — one selectable commit row for manual tweet generation 
 */
import React from 'react';

export function CommitItem({ commit, checked, disabled, onToggle }) {
  const { id, message, githubSha } = commit;
  const shortSha =
    typeof githubSha === 'string' && githubSha.length >= 7 ? githubSha.slice(0, 7) : githubSha || '';

  return (
    <li className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 transition hover:border-gray-700">
      <label
        className={`flex gap-3 ${disabled && !checked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(id)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white line-clamp-3">{message || '(No message)'}</p>
          {shortSha ? (
            <p className="mt-1 font-mono text-xs text-gray-500">{shortSha}</p>
          ) : null}
        </div>
      </label>
    </li>
  );
}
