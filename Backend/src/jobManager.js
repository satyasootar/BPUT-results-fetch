const { v4: uuidv4 } = require('uuid');
const pLimit = require('p-limit');
const fetcher = require('./fetcher');
const logger = require('./logger');
const { sleep, expandRange, normalizeStudent } = require('./utils');

class JobManager {
    constructor() {
        this.jobs = {};
        this.defaultConfig = {
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
    }

    createJob({ startRoll, endRoll, semid, session, namesMap = {}, config = {} }) {
        const rolls = expandRange(startRoll, endRoll);
        if (!rolls.length) throw new Error('No rolls expanded');

        const jobId = uuidv4();
        const finalConfig = { ...this.defaultConfig, ...config };
        
        const statusMap = Object.fromEntries(
            rolls.map((r) => [r, {
                status: 'pending',
                attempts: 0,
                lastErr: null,
                nextAttemptAt: null,
                student: null
            }])
        );

        this.jobs[jobId] = {
            id: jobId,
            rolls,
            semid,
            session,
            namesMap,
            config: finalConfig,
            statusMap,
            total: rolls.length,
            done: 0,
            percent: 0,
            cycle: 0,
            state: 'queued',
            createdAt: new Date().toISOString(),
            lastCycleAt: null,
            stopRequested: false,
            universityDown: false,
            finishedAt: null,
            error: null,
        };

        logger.job(jobId, `Queued job for ${rolls.length} rolls`);
        return jobId;
    }

    async startJob(jobId) {
        const job = this.jobs[jobId];
        if (!job) throw new Error('Job not found');

        logger.job(jobId, `Job start: ${job.rolls.length} rolls, sem=${job.semid}, session=${job.session}`);
        job.state = 'running';
        
        const cfg = job.config;
        let consecutiveUpstreamErrors = 0;

        while (true) {
            if (job.stopRequested) {
                logger.job(jobId, 'Stop requested - exiting loop');
                job.state = 'stopped';
                break;
            }

            job.cycle++;
            job.lastCycleAt = new Date().toISOString();
            logger.job(jobId, `Cycle ${job.cycle} starting`);

            const now = Date.now();
            const toTry = job.rolls.filter((r) => {
                const s = job.statusMap[r];
                if (!s) return false;
                if (s.status === 'success') return false;
                if (cfg.perRollMaxRetries > 0 && s.attempts >= cfg.perRollMaxRetries) return false;
                if (!s.nextAttemptAt) return true;
                return s.nextAttemptAt <= now;
            });

            if (toTry.length === 0) {
                const remaining = job.rolls.filter((r) => job.statusMap[r].status !== 'success').length;
                if (remaining === 0) {
                    logger.job(jobId, 'All rolls succeeded - done');
                    job.done = job.rolls.length;
                    job.percent = 100;
                    break;
                }
                if (cfg.maxCycles > 0 && job.cycle >= cfg.maxCycles) {
                    logger.job(jobId, `Max cycles reached (${cfg.maxCycles}) - stopping`);
                    break;
                }
                const backoff = Math.min(
                    cfg.cycleBackoffBase * Math.pow(2, Math.max(0, job.cycle - 1)),
                    cfg.maxCycleBackoff
                );
                logger.job(jobId, `No eligible rolls now. Sleeping ${backoff}ms`);
                await sleep(backoff);
                continue;
            }

            const limiter = pLimit(cfg.concurrency || 1);
            const promises = toTry.map((roll, idx) => 
                limiter(async () => {
                    await this.processSingleRoll(job, roll, idx, cfg);
                })
            );

            await Promise.all(promises);
            this.updateJobProgress(job);

            if (consecutiveUpstreamErrors >= cfg.universityDownThreshold) {
                job.universityDown = true;
                logger.job(jobId, `UNIVERSITY_DOWN detected (consecutive errors=${consecutiveUpstreamErrors})`);
            } else {
                job.universityDown = false;
            }

            if (Object.values(job.statusMap).every((s) => s.status === 'success')) {
                logger.job(jobId, 'All rolls successful - finishing');
                break;
            }

            if (cfg.maxCycles > 0 && job.cycle >= cfg.maxCycles) {
                logger.job(jobId, `Max cycles ${cfg.maxCycles} reached - stopping`);
                break;
            }

            const backoff = Math.min(
                cfg.cycleBackoffBase * Math.pow(2, Math.max(0, job.cycle - 1)),
                cfg.maxCycleBackoff
            );
            const jitter = Math.floor(Math.random() * 500);
            const wait = backoff + jitter;
            logger.job(jobId, `Cycle ${job.cycle} done: ${job.done}/${job.total}. waiting ${wait}ms`);
            await sleep(wait);
        }

        if (job.state !== 'stopped' && job.state !== 'error') {
            job.state = Object.values(job.statusMap).every((s) => s.status === 'success') ? 'finished' : 'completed';
        }
        job.finishedAt = new Date().toISOString();
        logger.job(jobId, `Job ended state=${job.state} done=${job.done}/${job.total}`);
    }

    async processSingleRoll(job, roll, idx, cfg) {
        if (job.stopRequested) return;
        
        if (idx !== 0 && cfg.interRequestDelay > 0) {
            await sleep(cfg.interRequestDelay);
        }

        const s = job.statusMap[roll];
        s.attempts++;
        s.status = 'running';
        s.lastAttemptAt = new Date().toISOString();
        
        logger.job(job.id, `Attempting ${roll} (attempt ${s.attempts})`);

        try {
            const raw = await fetcher.fetchAllForRoll(roll, job.semid, job.session, {
                perReqAttempts: cfg.perReqAttempts,
                perReqTimeout: cfg.perReqTimeout,
                abortSignal: null,
            });
            
            const stud = normalizeStudent(roll, raw.sgpa, raw.subs, raw.det, job.namesMap || {});
            s.student = stud;
            s.status = 'success';
            s.lastErr = null;
            s.nextAttemptAt = null;
            logger.job(job.id, `Success ${roll} sgpa=${stud.sgpa ?? 'N/A'}`);
        } catch (err) {
            const errMsg = String(err?.message ?? err);
            s.lastErr = errMsg;
            s.status = 'failed';
            
            const backoff = Math.min(
                cfg.perRollBackoffBase * Math.pow(2, Math.max(0, s.attempts - 1)),
                cfg.perRollMaxBackoff
            );
            const jitter = Math.floor(Math.random() * 500);
            s.nextAttemptAt = Date.now() + backoff + jitter;
            logger.job(job.id, `Failed ${roll}: ${errMsg}. next in ${backoff + jitter}ms`);
        }
    }

    updateJobProgress(job) {
        job.done = Object.values(job.statusMap).filter((x) => x.status === 'success').length;
        job.percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
    }

    getJob(jobId) {
        return this.jobs[jobId];
    }

    getAllJobs() {
        return Object.values(this.jobs).map(j => ({
            jobId: j.id,
            state: j.state,
            total: j.total,
            done: j.done,
            createdAt: j.createdAt
        }));
    }

    stopJob(jobId) {
        const job = this.jobs[jobId];
        if (!job) return false;
        
        job.stopRequested = true;
        logger.job(jobId, 'Stop requested by client');
        return true;
    }

    getJobStatus(jobId) {
        const job = this.jobs[jobId];
        if (!job) return null;

        const failed = Object.entries(job.statusMap)
            .filter(([r, v]) => v.status !== 'success')
            .map(([r, v]) => ({
                roll: r,
                status: v.status,
                attempts: v.attempts,
                lastErr: v.lastErr,
                nextAttemptAt: v.nextAttemptAt
            }));

        const students = Object.values(job.statusMap)
            .filter((v) => v.student)
            .map((v) => v.student)
            .sort((a, b) => {
                const ag = a.sgpa ?? -Infinity, bg = b.sgpa ?? -Infinity;
                if (bg !== ag) return bg - ag;
                const at = a.totalGradePoints ?? -Infinity, bt = b.totalGradePoints ?? -Infinity;
                if (bt !== at) return bt - at;
                return a.rollNo.localeCompare(b.rollNo);
            });

        return {
            jobId: job.id,
            state: job.state,
            total: job.total,
            done: job.done,
            percent: job.percent,
            cycle: job.cycle,
            universityDown: job.universityDown,
            failed,
            students,
            createdAt: job.createdAt,
            lastCycleAt: job.lastCycleAt,
            finishedAt: job.finishedAt,
            error: job.error,
        };
    }
}

module.exports = new JobManager();