// tests/jobManager.test.js
const jobManager = require("../src/jobManager");

describe("Job Manager Module", () => {
  let jobId;

  describe("createJob", () => {
    it("should create a new job", () => {
      const config = {
        rolls: ["2301230001", "2301230002"],
        dob: "2001-01-01",
        session: "Odd-(2024-25)",
      };

      const job = jobManager.createJob(config);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.status).toBe("pending");
      expect(job.config).toEqual(config);
      jobId = job.id;
    });
  });

  describe("getJob", () => {
    it("should retrieve a job by ID", () => {
      const job = jobManager.getJob(jobId);

      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
    });

    it("should return undefined for non-existent job", () => {
      const job = jobManager.getJob("non-existent-id");
      expect(job).toBeUndefined();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", () => {
      const job = jobManager.updateJobStatus(jobId, "processing");

      expect(job.status).toBe("processing");
    });
  });

  describe("updateJobProgress", () => {
    it("should update job progress", () => {
      const job = jobManager.updateJobProgress(jobId, 1, 0, 2);

      expect(job.progress.completed).toBe(1);
      expect(job.progress.failed).toBe(0);
      expect(job.progress.total).toBe(2);
    });
  });

  describe("addJobResult", () => {
    it("should add result to job", () => {
      const result = { rollNo: "2301230001", sgpa: 8.5 };
      const job = jobManager.addJobResult(jobId, result);

      expect(job.results).toContain(result);
    });
  });

  describe("addJobError", () => {
    it("should add error to job", () => {
      const error = new Error("Test error");
      const job = jobManager.addJobError(jobId, error);

      expect(job.errors.length).toBeGreaterThan(0);
    });
  });

  describe("getAllJobs", () => {
    it("should return all jobs", () => {
      const jobs = jobManager.getAllJobs();

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", () => {
      const deleted = jobManager.deleteJob(jobId);

      expect(deleted).toBe(true);
    });

    it("should return false for non-existent job", () => {
      const deleted = jobManager.deleteJob("non-existent-id");
      expect(deleted).toBe(false);
    });
  });
});
