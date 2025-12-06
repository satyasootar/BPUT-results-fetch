const express = require('express');
const fetcher = require('../fetcher');
const logger = require('../logger');
const { normalizeStudent } = require('../utils');

const router = express.Router();

// API Contract:
// GET /student/:roll - Get student details
// Query: semid, session
// Returns: { ok: true, student } or { ok: false, error }
router.get('/student/:roll', async (req, res) => {
    const roll = req.params.roll;
    const semid = req.query.semid ?? '4';
    const session = req.query.session ?? 'Even-(2024-25)';
    
    if (!roll) return res.status(400).json({ error: 'roll required' });

    try {
        const [sgpa, subs, det] = await Promise.all([
            fetcher.fetchWithRetries(
                `https://results.bput.ac.in/student-results-sgpa?rollNo=${encodeURIComponent(roll)}&semid=${encodeURIComponent(semid)}&session=${encodeURIComponent(session)}`,
                { attempts: 3, timeoutMs: 15000 }
            ),
            fetcher.fetchWithRetries(
                `https://results.bput.ac.in/student-results-subjects-list?semid=${encodeURIComponent(semid)}&rollNo=${encodeURIComponent(roll)}&session=${encodeURIComponent(session)}`,
                { attempts: 3, timeoutMs: 15000 }
            ),
            fetcher.fetchWithRetries(
                `https://results.bput.ac.in/student-detsils-results?rollNo=${encodeURIComponent(roll)}`,
                { attempts: 2, timeoutMs: 10000 }
            ),
        ]);

        const student = normalizeStudent(roll, sgpa, subs, det, {});
        return res.json({ ok: true, student });
    } catch (err) {
        logger.global(`live lookup failed ${roll}: ${String(err?.message ?? err)}`);
        return res.status(502).json({ ok: false, error: String(err?.message ?? err) });
    }
});

module.exports = router;