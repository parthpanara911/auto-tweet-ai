/**
 * ModeToggle — switches between automatic (latest commits on server) and manual commit selection for tweet generation
 */
import React from 'react';

export function ModeToggle({ mode, onModeChange, disabled }) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
        Source
      </legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input
            type="radio"
            name="tweet-gen-mode"
            className="h-4 w-4 border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
            checked={mode === 'auto'}
            onChange={() => {
              // Mode switching: auto — request body must omit commitIds so the backend picks the latest commits
              onModeChange('auto');
            }}
          />
          Use latest commits
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input
            type="radio"
            name="tweet-gen-mode"
            className="h-4 w-4 border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
            checked={mode === 'manual'}
            onChange={() => {
              // Mode switching: manual — UI collects 1–5 commit ids to send as commitIds
              onModeChange('manual');
            }}
          />
          Select commits manually
        </label>
      </div>
    </fieldset>
  );
}
