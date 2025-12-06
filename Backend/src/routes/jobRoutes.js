const express = require('express');
const jobManager = require('../jobManager');
const logger = require('../logger');

const router = express.Router();

// API Contract:
// POST /start - Start a new job
// Body: { startRoll, endRoll, semid, session, namesMap, config }
// Returns: { jobId, total }
router.post('/start', (req, res) => {
    try {
        const { startRoll, endRoll, semid = '4', session = 'Even-(2024-25)', namesMap = null, config = {} } = req.body;
        
        if (!startRoll || !endRoll) {
            return res.status(400).json({ error: 'startRoll and endRoll required' });
        }

        const jobId = jobManager.createJob({ startRoll, endRoll, semid, session, namesMap, config });
        
        // Start job async
        jobManager.startJob(jobId).catch((err) => {
            logger.job(jobId, `startJob unexpected error: ${String(err?.message ?? err)}`);
            console.error('startJob error', err);
            const job = jobManager.getJob(jobId);
            if (job) {
                job.state = 'error';
                job.error = String(err?.message ?? err);
            }
        });

        const job = jobManager.getJob(jobId);
        return res.json({ jobId, total: job.total });
    } catch (err) {
        logger.global('POST /start failed: ' + String(err?.message ?? err));
        return res.status(500).json({ error: String(err?.message ?? err) });
    }
});

// GET /status/:jobId - Get job status
// Returns: Complete job status with students data
router.get('/status/:jobId', (req, res) => {
    const job = jobManager.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'job not found' });
    
    const status = jobManager.getJobStatus(req.params.jobId);
    return res.json(status);
});

// POST /stop/:jobId - Stop a running job
// Returns: { ok: true, jobId }
router.post('/stop/:jobId', (req, res) => {
    const success = jobManager.stopJob(req.params.jobId);
    if (!success) return res.status(404).json({ error: 'job not found' });
    return res.json({ ok: true, jobId: req.params.jobId });
});

// GET /jobs - List all jobs
// Returns: Array of job summaries
router.get('/jobs', (req, res) => {
    return res.json(jobManager.getAllJobs());
});

module.exports = router;