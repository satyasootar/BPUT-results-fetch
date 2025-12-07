// tests/jobManager.test.js

// Mock p-limit to avoid Jest trying to parse the ESM module from node_modules
jest.mock('p-limit', () => {
  // pLimit(concurrency) => limiter(fn) => wrappedFn(...args)
  return () => {
    return (fn) => {
      return (...args) => fn(...args);
    };
  };
});

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

describe('JobManager', () => {
  let jobManager;

  beforeEach(() => {
    // Ensure a fresh instance of JobManager for each test
    jest.resetModules();
    delete require.cache[require.resolve('../src/jobManager')];

    jobManager = require('../src/jobManager');
  });

  afterEach(() => {
    // Clear jobManager state (if jobs object exists)
    if (jobManager && jobManager.jobs) {
      Object.keys(jobManager.jobs).forEach((key) => delete jobManager.jobs[key]);
    }
  });

  it('should create a job', () => {
    const jobId = jobManager.createJob({
      startRoll: '2301230010',
      endRoll: '2301230010',
      semid: '4',
      session: 'Even-(2024-25)',
      namesMap: {},
      config: {},
    });

    const job = jobManager.getJob(jobId);

    expect(job).toBeDefined();
    expect(job.id).toBe(jobId);
    expect(job.total).toBe(1);
    expect(job.state).toBe('queued');
    expect(job.rolls).toEqual(['2301230010']);
  });

  it('should get job status', () => {
    const jobId = jobManager.createJob({
      startRoll: '2301230010',
      endRoll: '2301230010',
      semid: '4',
      session: 'Even-(2024-25)',
      namesMap: {},
      config: {},
    });

    const status = jobManager.getJobStatus(jobId);

    expect(status).toBeDefined();
    expect(status.jobId).toBe(jobId);
    expect(status.total).toBe(1);
    expect(status.done).toBe(0);
    expect(status.state).toBe('queued');
  });

  it('should stop a job', () => {
    const jobId = jobManager.createJob({
      startRoll: '2301230010',
      endRoll: '2301230010',
      semid: '4',
      session: 'Even-(2024-25)',
      namesMap: {},
      config: {},
    });

    const stopped = jobManager.stopJob(jobId);
    expect(stopped).toBe(true);

    const job = jobManager.getJob(jobId);
    expect(job.stopRequested).toBe(true);
  });
});
