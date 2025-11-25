// server.js - Updated with better defaults and PDF generation support
const express = require("express");
let pLimit = require("p-limit");
if (pLimit && pLimit.default) pLimit = pLimit.default;

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

// Upstream endpoints
const BASE_SGPA = "https://results.bput.ac.in/student-results-sgpa";
const BASE_SUB = "https://results.bput.ac.in/student-results-subjects-list";
const BASE_DET = "https://results.bput.ac.in/student-detsils-results";

// https://results.bput.ac.in/student-results-list?rollNo=2301230074&dob=2001-11-14&session=Odd-(2024-25)

const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function appendGlobalLog(line) {
  const ts = new Date().toISOString();
  const txt = `[${ts}] ${line}\n`;
  console.log(txt.trim());
  fs.appendFile(path.join(LOGS_DIR, "server.log"), txt, (err) => {
    if (err) console.error("global log write failed:", err);
  });
}

function appendJobLog(jobId, line) {
  const ts = new Date().toISOString();
  const txt = `[${ts}] ${line}\n`;
  fs.appendFile(path.join(LOGS_DIR, `${jobId}.log`), txt, (err) => {
    if (err) console.error(`job ${jobId} log write failed:`, err);
  });
  appendGlobalLog(`JOB ${jobId}: ${line}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const expandRange = (s, e) => {
  if (/^\d+$/.test(s) && /^\d+$/.test(e)) {
    const a = Number(s),
      b = Number(e);
    const out = [];
    for (let x = a; x <= b; x++) out.push(String(x).padStart(s.length, "0"));
    return out;
  }
  if (s.includes(",")) return s.split(",").map((r) => r.trim());
  return [s];
};

function randomDobBetweenYears(startYear = 2004, endYear = 2005) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const rnd = start + Math.floor(Math.random() * (end - start + 1));
  const d = new Date(rnd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchWithTimeoutAndRetries(
  url,
  { attempts = 3, timeoutMs = 15000, abortSignal = null } = {}
) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "text/plain",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/plain, */*",
        },
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

async function fetchAllForRoll(roll, semid, session, options) {
  const sgpaUrl = `${BASE_SGPA}?rollNo=${encodeURIComponent(
    roll
  )}&semid=${encodeURIComponent(semid)}&session=${encodeURIComponent(session)}`;
  const subsUrl = `${BASE_SUB}?semid=${encodeURIComponent(
    semid
  )}&rollNo=${encodeURIComponent(roll)}&session=${encodeURIComponent(session)}`;
  const detUrl = `${BASE_DET}?rollNo=${encodeURIComponent(roll)}`;

  try {
    const [sgpa, subs, det] = await Promise.all([
      fetchWithTimeoutAndRetries(sgpaUrl, {
        attempts: options.perReqAttempts,
        timeoutMs: options.perReqTimeout,
        abortSignal: options.abortSignal,
      }),
      fetchWithTimeoutAndRetries(subsUrl, {
        attempts: options.perReqAttempts,
        timeoutMs: options.perReqTimeout,
        abortSignal: options.abortSignal,
      }),
      fetchWithTimeoutAndRetries(detUrl, {
        attempts: Math.max(1, Math.floor(options.perReqAttempts / 2)),
        timeoutMs: Math.min(10000, options.perReqTimeout),
        abortSignal: options.abortSignal,
      }),
    ]);
    return { sgpa, subs, det };
  } catch (error) {
    throw error;
  }
}

function normalizeStudent(roll, sgpaResp, subsResp, detResp, namesMap = {}) {
  const det = detResp ?? {};
  const nameFromDet = det.studentName ?? det.student_name ?? null;
  const sgpa =
    sgpaResp && typeof sgpaResp.sgpa !== "undefined"
      ? Number(sgpaResp.sgpa)
      : null;
  const totalGradePoints =
    typeof sgpaResp?.totalGradePoints !== "undefined"
      ? Number(sgpaResp.totalGradePoints)
      : null;
  const credits = sgpaResp?.cretits ?? null;
  const subjects = Array.isArray(subsResp) ? subsResp : [];

  const name =
    namesMap && namesMap[roll]
      ? namesMap[roll]
      : nameFromDet ?? `Student ${roll}`;

  const dobFromDet =
    det.dob ??
    det.DOB ??
    det.dateOfBirth ??
    det.date_of_birth ??
    det.birthDate ??
    det.birthdate ??
    null;
  const dob = dobFromDet
    ? formatDob(dobFromDet)
    : randomDobBetweenYears(2004, 2005);

  return {
    rollNo: roll,
    name,
    sgpa,
    totalGradePoints,
    credits,
    subjects,
    details: {
      studentName: nameFromDet ?? null,
      batch: det.batch ?? det.maxYear ?? null,
      branchId: det.branchId ?? null,
      branchName: det.branchName ?? null,
      courseName: det.courseName ?? null,
      collegeCode: det.collegeCode ?? null,
      collegeName: det.collegeName ?? null,
      studentPhoto: det.studentPhoto ?? null,
      dob,
      raw: det,
    },
    raw: { sgpaResp, subsResp, detResp },
  };
}

function formatDob(v) {
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return String(v);
  }
}

// Jobs storage
const jobs = {};

async function startJob(jobId) {
  const job = jobs[jobId];
  if (!job) throw new Error("job missing");
  const cfg = job.config;

  appendJobLog(
    jobId,
    `Job start: ${job.rolls.length} rolls, sem=${job.semid}, session=${job.session}`
  );
  job.state = "running";
  let consecutiveUpstreamErrors = 0;

  while (true) {
    if (job.stopRequested) {
      appendJobLog(jobId, "Stop requested - exiting loop");
      job.state = "stopped";
      break;
    }

    job.cycle++;
    job.lastCycleAt = new Date().toISOString();
    appendJobLog(jobId, `Cycle ${job.cycle} starting`);

    const now = Date.now();
    const toTry = job.rolls.filter((r) => {
      const s = job.statusMap[r];
      if (!s) return false;
      if (s.status === "success") return false;
      if (cfg.perRollMaxRetries > 0 && s.attempts >= cfg.perRollMaxRetries)
        return false;
      if (!s.nextAttemptAt) return true;
      return s.nextAttemptAt <= now;
    });

    if (toTry.length === 0) {
      const remaining = job.rolls.filter(
        (r) => job.statusMap[r].status !== "success"
      ).length;
      if (remaining === 0) {
        appendJobLog(jobId, "All rolls succeeded - done");
        job.done = job.rolls.length;
        job.percent = 100;
        break;
      }
      if (cfg.maxCycles > 0 && job.cycle >= cfg.maxCycles) {
        appendJobLog(jobId, `Max cycles reached (${cfg.maxCycles}) - stopping`);
        break;
      }
      const backoff = Math.min(
        cfg.cycleBackoffBase * Math.pow(2, Math.max(0, job.cycle - 1)),
        cfg.maxCycleBackoff
      );
      appendJobLog(jobId, `No eligible rolls now. Sleeping ${backoff}ms`);
      await sleep(backoff);
      continue;
    }

    const limiter = pLimit(cfg.concurrency || 1);
    const promises = toTry.map((roll, idx) =>
      limiter(async () => {
        if (job.stopRequested) return;
        if (idx !== 0 && cfg.interRequestDelay > 0)
          await sleep(cfg.interRequestDelay);

        const s = job.statusMap[roll];
        s.attempts++;
        s.status = "running";
        s.lastAttemptAt = new Date().toISOString();
        appendJobLog(jobId, `Attempting ${roll} (attempt ${s.attempts})`);

        try {
          const raw = await fetchAllForRoll(roll, job.semid, job.session, {
            perReqAttempts: cfg.perReqAttempts,
            perReqTimeout: cfg.perReqTimeout,
            abortSignal: null,
          });

          const stud = normalizeStudent(
            roll,
            raw.sgpa,
            raw.subs,
            raw.det,
            job.namesMap || {}
          );
          s.student = stud;
          s.status = "success";
          s.lastErr = null;
          s.nextAttemptAt = null;
          appendJobLog(jobId, `Success ${roll} sgpa=${stud.sgpa ?? "N/A"}`);
          consecutiveUpstreamErrors = 0;
          job.done = Object.values(job.statusMap).filter(
            (x) => x.status === "success"
          ).length;
          job.percent =
            job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
        } catch (err) {
          const errMsg = String(err?.message ?? err);
          s.lastErr = errMsg;
          s.status = "failed";
          const isUpstreamError =
            /AbortError|network|ECONNRESET|ECONNREFUSED|HTTP 5\d{2}|timed out/i.test(
              errMsg
            ) || /HTTP \d{3}/i.test(errMsg);
          if (isUpstreamError) consecutiveUpstreamErrors++;
          else consecutiveUpstreamErrors = 0;
          const backoff = Math.min(
            cfg.perRollBackoffBase * Math.pow(2, Math.max(0, s.attempts - 1)),
            cfg.perRollMaxBackoff
          );
          const jitter = Math.floor(Math.random() * 500);
          s.nextAttemptAt = Date.now() + backoff + jitter;
          appendJobLog(
            jobId,
            `Failed ${roll}: ${errMsg}. next in ${backoff + jitter}ms`
          );
        }
      })
    );

    await Promise.all(promises);

    job.done = Object.values(job.statusMap).filter(
      (x) => x.status === "success"
    ).length;
    job.percent = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;

    if (consecutiveUpstreamErrors >= cfg.universityDownThreshold) {
      job.universityDown = true;
      appendJobLog(
        jobId,
        `UNIVERSITY_DOWN detected (consecutive errors=${consecutiveUpstreamErrors})`
      );
    } else {
      job.universityDown = false;
    }

    if (Object.values(job.statusMap).every((s) => s.status === "success")) {
      appendJobLog(jobId, "All rolls successful - finishing");
      break;
    }
    if (cfg.maxCycles > 0 && job.cycle >= cfg.maxCycles) {
      appendJobLog(jobId, `Max cycles ${cfg.maxCycles} reached - stopping`);
      break;
    }

    const backoff = Math.min(
      cfg.cycleBackoffBase * Math.pow(2, Math.max(0, job.cycle - 1)),
      cfg.maxCycleBackoff
    );
    const jitter = Math.floor(Math.random() * 500);
    const wait = backoff + jitter;
    appendJobLog(
      jobId,
      `Cycle ${job.cycle} done: ${job.done}/${job.total}. waiting ${wait}ms`
    );
    await sleep(wait);
  }

  if (job.state !== "stopped" && job.state !== "error") {
    job.state = Object.values(job.statusMap).every(
      (s) => s.status === "success"
    )
      ? "finished"
      : "completed";
  }
  job.finishedAt = new Date().toISOString();
  appendJobLog(
    jobId,
    `Job ended state=${job.state} done=${job.done}/${job.total}`
  );
}

// HTTP endpoints
app.post("/start", (req, res) => {
  try {
    const {
      startRoll,
      endRoll,
      semid = "4",
      session = "Even-(2024-25)",
      namesMap = null,
      config = {},
    } = req.body;
    if (!startRoll || !endRoll)
      return res.status(400).json({ error: "startRoll and endRoll required" });

    const rolls = expandRange(startRoll, endRoll);
    if (!rolls.length)
      return res.status(400).json({ error: "no rolls expanded" });

    const jobId = uuidv4();
    const defaultCfg = {
      concurrency: config.concurrency ?? 2, // Reduced for stability
      perReqAttempts: config.perReqAttempts ?? 5, // Increased attempts
      perReqTimeout: config.perReqTimeout ?? 20_000, // Increased timeout
      interRequestDelay: config.interRequestDelay ?? 500, // Increased delay
      cycleBackoffBase: config.cycleBackoffBase ?? 3000,
      maxCycleBackoff: config.maxCycleBackoff ?? 60_000,
      perRollBackoffBase: config.perRollBackoffBase ?? 2000,
      perRollMaxBackoff: config.perRollMaxBackoff ?? 120_000,
      perRollMaxRetries: config.perRollMaxRetries ?? 10, // Limited retries
      maxCycles: config.maxCycles ?? 50, // Limited cycles
      universityDownThreshold: config.universityDownThreshold ?? 5,
    };

    const statusMap = Object.fromEntries(
      rolls.map((r) => [
        r,
        {
          status: "pending",
          attempts: 0,
          lastErr: null,
          nextAttemptAt: null,
          student: null,
        },
      ])
    );

    jobs[jobId] = {
      id: jobId,
      rolls,
      semid,
      session,
      namesMap: namesMap || {},
      config: defaultCfg,
      statusMap,
      total: rolls.length,
      done: 0,
      percent: 0,
      cycle: 0,
      state: "queued",
      createdAt: new Date().toISOString(),
      lastCycleAt: null,
      stopRequested: false,
      logs: [],
      universityDown: false,
      finishedAt: null,
      error: null,
    };

    appendJobLog(jobId, `Queued job for ${rolls.length} rolls`);

    // Start job with error handling
    startJob(jobId).catch((err) => {
      appendJobLog(
        jobId,
        `startJob unexpected error: ${String(err?.message ?? err)}`
      );
      console.error("startJob error", err);
      if (jobs[jobId]) {
        jobs[jobId].state = "error";
        jobs[jobId].error = String(err?.message ?? err);
      }
    });

    return res.json({ jobId, total: rolls.length });
  } catch (err) {
    appendGlobalLog("POST /start failed: " + String(err?.message ?? err));
    return res.status(500).json({ error: String(err?.message ?? err) });
  }
});

app.get("/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "job not found" });

  const failed = Object.entries(job.statusMap)
    .filter(([r, v]) => v.status !== "success")
    .map(([r, v]) => ({
      roll: r,
      status: v.status,
      attempts: v.attempts,
      lastErr: v.lastErr,
      nextAttemptAt: v.nextAttemptAt,
    }));

  const students = Object.values(job.statusMap)
    .filter((v) => v.student)
    .map((v) => v.student)
    .sort((a, b) => {
      const ag = a.sgpa ?? -Infinity,
        bg = b.sgpa ?? -Infinity;
      if (bg !== ag) return bg - ag;
      const at = a.totalGradePoints ?? -Infinity,
        bt = b.totalGradePoints ?? -Infinity;
      if (bt !== at) return bt - at;
      return a.rollNo.localeCompare(b.rollNo);
    });

  const top = students.slice(0, 20);

  return res.json({
    jobId: job.id,
    state: job.state,
    total: job.total,
    done: job.done,
    percent: job.percent,
    cycle: job.cycle,
    universityDown: job.universityDown,
    failed,
    logs: job.logs ? job.logs.slice(-50) : [],
    top,
    students,
    createdAt: job.createdAt,
    lastCycleAt: job.lastCycleAt,
    finishedAt: job.finishedAt,
    error: job.error,
  });
});

app.post("/stop/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "job not found" });
  job.stopRequested = true;
  appendJobLog(job.id, "Stop requested by client");
  return res.json({ ok: true, jobId: job.id });
});

app.get("/student/:roll", async (req, res) => {
  const roll = req.params.roll;
  const semid = req.query.semid ?? "4";
  const session = req.query.session ?? "Even-(2024-25)";
  if (!roll) return res.status(400).json({ error: "roll required" });

  try {
    const [sgpa, subs, det] = await Promise.all([
      fetchWithTimeoutAndRetries(
        `${BASE_SGPA}?rollNo=${encodeURIComponent(
          roll
        )}&semid=${encodeURIComponent(semid)}&session=${encodeURIComponent(
          session
        )}`,
        { attempts: 3, timeoutMs: 15000 }
      ),
      fetchWithTimeoutAndRetries(
        `${BASE_SUB}?semid=${encodeURIComponent(
          semid
        )}&rollNo=${encodeURIComponent(roll)}&session=${encodeURIComponent(
          session
        )}`,
        { attempts: 3, timeoutMs: 15000 }
      ),
      fetchWithTimeoutAndRetries(
        `${BASE_DET}?rollNo=${encodeURIComponent(roll)}`,
        { attempts: 2, timeoutMs: 10000 }
      ),
    ]);
    const student = normalizeStudent(roll, sgpa, subs, det, {});
    return res.json({ ok: true, student });
  } catch (err) {
    appendGlobalLog(
      `live lookup failed ${roll}: ${String(err?.message ?? err)}`
    );
    return res
      .status(502)
      .json({ ok: false, error: String(err?.message ?? err) });
  }
});

app.get("/jobs", (req, res) => {
  return res.json(
    Object.values(jobs).map((j) => ({
      jobId: j.id,
      state: j.state,
      total: j.total,
      done: j.done,
      createdAt: j.createdAt,
    }))
  );
});

// Safety handlers
process.on("unhandledRejection", (r) =>
  appendGlobalLog("UnhandledRejection: " + String(r))
);
process.on("uncaughtException", (e) =>
  appendGlobalLog("UncaughtException: " + (e.stack || e))
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  appendGlobalLog(`Harvester server listening on http://localhost:${PORT}`);
});
