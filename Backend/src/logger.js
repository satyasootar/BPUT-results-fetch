const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../logs');

class Logger {
    constructor() {
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }
    }

    global(line) {
        const ts = new Date().toISOString();
        const txt = `[${ts}] ${line}\n`;
        console.log(txt.trim());
        fs.appendFile(path.join(LOGS_DIR, 'server.log'), txt, (err) => {
            if (err) console.error('global log write failed:', err);
        });
    }

    job(jobId, line) {
        const ts = new Date().toISOString();
        const txt = `[${ts}] ${line}\n`;
        fs.appendFile(path.join(LOGS_DIR, `${jobId}.log`), txt, (err) => {
            if (err) console.error(`job ${jobId} log write failed:`, err);
        });
        this.global(`JOB ${jobId}: ${line}`);
    }
}

module.exports = new Logger();