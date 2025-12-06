// src/components/StudentCards.jsx
import React from 'react';
import { StatusBadge } from './StatusBadge';

export const StudentCards = ({ results, loading }) => {
  if (!results || results.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-center">No results to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((student, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-gray-900">
              {student.rollNo || `Student ${idx + 1}`}
            </h3>
            {student.status && <StatusBadge status={student.status} />}
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            {Object.entries(student).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium text-gray-600">{key}:</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
