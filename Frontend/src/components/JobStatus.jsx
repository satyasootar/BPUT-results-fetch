// src/components/JobStatus.jsx
import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

export const JobStatus = ({ job }) => {
  if (!job) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-center">No job selected</p>
      </div>
    );
  }

  const createdAt = new Date(job.createdAt).toLocaleString();
  const updatedAt = new Date(job.updatedAt).toLocaleString();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Status</h2>
          <p className="text-sm text-gray-500 font-mono mt-1">{job.id}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Progress</h3>
          <ProgressBar
            completed={job.progress.completed}
            total={job.progress.total}
            failed={job.progress.failed}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-2xl font-bold text-blue-600">{job.progress.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-2xl font-bold text-green-600">{job.progress.completed}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-2xl font-bold text-red-600">{job.progress.failed}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="text-2xl font-bold text-yellow-600">
              {job.progress.total - job.progress.completed - job.progress.failed}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Created:</span> {createdAt}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Updated:</span> {updatedAt}
          </p>
        </div>

        {job.errors && job.errors.length > 0 && (
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">Recent Errors:</h4>
            <ul className="space-y-1">
              {job.errors.slice(-3).map((error, idx) => (
                <li key={idx} className="text-sm text-red-700">
                  • {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
