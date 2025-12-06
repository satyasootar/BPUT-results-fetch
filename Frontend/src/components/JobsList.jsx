// src/components/JobsList.jsx
import React from 'react';
import { StatusBadge } from './StatusBadge';

export const JobsList = ({ jobs, onSelectJob, selectedJobId, loading, onDeleteJob }) => {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-center">No jobs yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Jobs</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedJobId === job.id
                ? 'bg-blue-50 border-blue-500'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <p className="font-mono text-sm text-gray-600 truncate">{job.id}</p>
                <p className="text-xs text-gray-500">
                  {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex justify-between items-center text-sm text-gray-700 mb-2">
              <span>Progress: {job.progress.completed}/{job.progress.total}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteJob(job.id);
                }}
                className="text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
