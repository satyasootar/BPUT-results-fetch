// src/components/JobControl.jsx
import React from 'react';
import { DEFAULT_JOB_CONFIG } from '../constants/config';
import { useForm } from '../hooks/useForm';

export const JobControl = ({ onJobCreate, loading }) => {
  const { values, handleChange, handleSubmit } = useForm(
    {
      rolls: '',
      dob: '',
      session: 'Odd-(2024-25)',
      ...DEFAULT_JOB_CONFIG,
    },
    async (formValues) => {
      await onJobCreate(formValues);
    }
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Create New Job</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rolls (comma-separated or range)
            </label>
            <input
              type="text"
              name="rolls"
              value={values.rolls}
              onChange={handleChange}
              placeholder="e.g., 2301230001-2301230010 or 2301230001,2301230005"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={values.dob}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Session
          </label>
          <input
            type="text"
            name="session"
            value={values.session}
            onChange={handleChange}
            placeholder="e.g., Odd-(2024-25)"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </div>
  );
};
