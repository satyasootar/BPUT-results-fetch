// src/components/StatusBadge.jsx
import React from 'react';

export const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
