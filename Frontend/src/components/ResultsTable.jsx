// src/components/ResultsTable.jsx
import React, { useMemo } from 'react';
import { exportToCSV } from '../utils/csv';
import { exportToPDF } from '../utils/pdf';

export const ResultsTable = ({ results, loading }) => {
  const [sortConfig, setSortConfig] = React.useState({ key: 'rollNo', direction: 'asc' });
  const [filterText, setFilterText] = React.useState('');

  const filteredAndSorted = useMemo(() => {
    let filtered = results;

    if (filterText) {
      filtered = results.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [results, filterText, sortConfig]);

  if (!results || results.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-center">No results to display</p>
      </div>
    );
  }

  const columns = Object.keys(results[0]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Results</h2>
        <div className="space-x-2">
          <button
            onClick={() => exportToCSV(results, 'results.csv')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportToPDF(results, 'results.pdf', 'BPUT Results')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Filter results..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-200 font-medium"
                >
                  {col}
                  {sortConfig.key === col && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={`${idx}-${col}`} className="px-4 py-2 text-sm">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
