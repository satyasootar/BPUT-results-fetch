// src/constants/config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

export const DEFAULT_JOB_CONFIG = {
  concurrency: 2,
  perReqAttempts: 5,
  perReqTimeout: 20000,
  interRequestDelay: 500,
  cycleBackoffBase: 3000,
  maxCycleBackoff: 60000,
  perRollBackoffBase: 2000,
  perRollMaxBackoff: 120000,
  perRollMaxRetries: 10,
  maxCycles: 50,
  universityDownThreshold: 5,
};

export const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

export const VIEW_MODES = {
  CARDS: "cards",
  TABLE: "table",
};

export const TABS = {
  NEW_JOB: "newJob",
  JOBS_LIST: "jobsList",
  SETTINGS: "settings",
};

export const GRADE_RANGES = [
  { min: 9.5, max: 10.0, grade: "O", point: 10 },
  { min: 8.5, max: 9.4, grade: "E", point: 9 },
  { min: 7.5, max: 8.4, grade: "A", point: 8 },
  { min: 6.5, max: 7.4, grade: "B", point: 7 },
  { min: 5.5, max: 6.4, grade: "C", point: 6 },
  { min: 4.5, max: 5.4, grade: "D", point: 5 },
  { min: 0.0, max: 4.4, grade: "F", point: 0 },
];

export const EXPORT_FORMATS = {
  CSV: "csv",
  PDF: "pdf",
};
