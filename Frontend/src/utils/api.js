// src/utils/api.js
import { API_BASE_URL } from "../constants/config";

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const apiClient = {
  // Jobs endpoints
  createJob: async (config) => {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return handleResponse(response);
  },

  getJob: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    return handleResponse(response);
  },

  getAllJobs: async () => {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    return handleResponse(response);
  },

  deleteJob: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  // Students endpoints
  getStudentSGPA: async (rollNo, dob, session) => {
    const params = new URLSearchParams({ rollNo, dob, session });
    const response = await fetch(`${API_BASE_URL}/students/sgpa?${params}`);
    return handleResponse(response);
  },

  getStudentSubjects: async (rollNo, dob, session) => {
    const params = new URLSearchParams({ rollNo, dob, session });
    const response = await fetch(`${API_BASE_URL}/students/subjects?${params}`);
    return handleResponse(response);
  },

  getStudentDetails: async (rollNo, dob, session) => {
    const params = new URLSearchParams({ rollNo, dob, session });
    const response = await fetch(`${API_BASE_URL}/students/details?${params}`);
    return handleResponse(response);
  },

  // Admin endpoints
  getHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/health`);
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/stats`);
    return handleResponse(response);
  },

  cleanup: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/cleanup`, {
      method: "POST",
    });
    return handleResponse(response);
  },
};
