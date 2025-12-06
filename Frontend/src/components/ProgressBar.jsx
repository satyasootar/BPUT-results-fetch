// src/components/ProgressBar.jsx
import React from 'react';

export const ProgressBar = ({ completed, total, failed }) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const failedPercentage = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          Progress: {completed}/{total}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute h-4 bg-red-500"
          style={{
            width: `${failedPercentage}%`,
            marginLeft: `${percentage}%`,
          }}
        />
      </div>
      {failed > 0 && (
        <p className="text-xs text-red-600 mt-1">
          {failed} failed
        </p>
      )}
    </div>
  );
};
