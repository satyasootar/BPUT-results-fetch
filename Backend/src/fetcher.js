const { sleep } = require('./utils');
const logger = require('./logger');

const BASE_SGPA = 'https://results.bput.ac.in/student-results-sgpa';
const BASE_SUB = 'https://results.bput.ac.in/student-results-subjects-list';
const BASE_DET = 'https://results.bput.ac.in/student-detsils-results';

class Fetcher {
    constructor() {
        this.defaultHeaders = {
            'Content-Type': 'text/plain',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json, text/plain, */*',
        };
    }

    async fetchWithRetries(url, { attempts = 3, timeoutMs = 15000, abortSignal = null } = {}) {
        let lastErr = null;
        for (let i = 0; i < attempts; i++) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
            }

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: this.defaultHeaders,
                });
                clearTimeout(id);

                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const json = await res.json();
                return json;
            } catch (err) {
                clearTimeout(id);
                lastErr = err;
                if (i < attempts - 1) {
                    await sleep(1000 + Math.floor(Math.random() * 1000));
                }
            }
        }
        throw lastErr;
    }

    async fetchAllForRoll(roll, semid, session, options) {
        const sgpaUrl = `${BASE_SGPA}?rollNo=${encodeURIComponent(roll)}&semid=${encodeURIComponent(semid)}&session=${encodeURIComponent(session)}`;
        const subsUrl = `${BASE_SUB}?semid=${encodeURIComponent(semid)}&rollNo=${encodeURIComponent(roll)}&session=${encodeURIComponent(session)}`;
        const detUrl = `${BASE_DET}?rollNo=${encodeURIComponent(roll)}`;

        try {
            const [sgpa, subs, det] = await Promise.all([
                this.fetchWithRetries(sgpaUrl, {
                    attempts: options.perReqAttempts,
                    timeoutMs: options.perReqTimeout,
                    abortSignal: options.abortSignal
                }),
                this.fetchWithRetries(subsUrl, {
                    attempts: options.perReqAttempts,
                    timeoutMs: options.perReqTimeout,
                    abortSignal: options.abortSignal
                }),
                this.fetchWithRetries(detUrl, {
                    attempts: Math.max(1, Math.floor(options.perReqAttempts / 2)),
                    timeoutMs: Math.min(10000, options.perReqTimeout),
                    abortSignal: options.abortSignal
                }),
            ]);
            return { sgpa, subs, det };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Fetcher();