// src/hooks/useJobsApi.js
import { useState, useCallback } from "react";
import { apiClient } from "../utils/api";

export const useJobsApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createJob = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      const job = await apiClient.createJob(config);
      return job;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create job";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getJob = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      const job = await apiClient.getJob(jobId);
      return job;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch job";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jobs = await apiClient.getAllJobs();
      return jobs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch jobs";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteJob = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteJob(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete job";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createJob,
    getJob,
    getAllJobs,
    deleteJob,
  };
};
