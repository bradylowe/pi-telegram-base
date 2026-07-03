#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const schedulerDir = process.env.PI_SCHEDULER_WORKDIR || "/workspace/scheduler";
const crontabPath = process.env.PI_SCHEDULER_CRONTAB || path.join(schedulerDir, "crontab");
const cwd = process.env.PI_SCHEDULER_CWD || "/workspace";
const pollMs = Number(process.env.PI_SCHEDULER_POLL_MS || 10000);

let jobs = [];
let lastMtimeMs = 0;
const running = new Set();

function log(message) {
  console.log(`${new Date().toISOString()} ${message}`);
}

function parseEvery(value) {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Unsupported @every interval: ${value}`);

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return amount * multiplier;
}

function parseField(field, min, max, names = {}) {
  const allowed = new Set();
  const parts = field.split(",");

  for (const rawPart of parts) {
    let part = rawPart.trim().toLowerCase();
    if (!part) continue;

    for (const [name, value] of Object.entries(names)) {
      part = part.replaceAll(name, String(value));
    }

    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`Invalid cron step: ${rawPart}`);
    }

    let start;
    let end;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [rangeStart, rangeEnd] = rangePart.split("-").map(Number);
      start = rangeStart;
      end = rangeEnd;
    } else {
      start = Number(rangePart);
      end = start;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
      throw new Error(`Invalid cron field: ${rawPart}`);
    }

    for (let value = start; value <= end; value += step) allowed.add(value);
  }

  return allowed;
}

function parseCron(parts) {
  const monthNames = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const dayNames = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };

  return {
    minutes: parseField(parts[0], 0, 59),
    hours: parseField(parts[1], 0, 23),
    days: parseField(parts[2], 1, 31),
    months: parseField(parts[3], 1, 12, monthNames),
    weekdays: parseField(parts[4], 0, 7, dayNames),
  };
}

function cronMatches(schedule, now) {
  const weekday = now.getDay();
  return schedule.minutes.has(now.getMinutes())
    && schedule.hours.has(now.getHours())
    && schedule.days.has(now.getDate())
    && schedule.months.has(now.getMonth() + 1)
    && (schedule.weekdays.has(weekday) || (weekday === 0 && schedule.weekdays.has(7)));
}

function parseCrontab(contents) {
  const parsed = [];
  const env = {};

  contents.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const envMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (envMatch) {
      env[envMatch[1]] = envMatch[2];
      return;
    }

    const id = `line-${index + 1}`;
    if (trimmed.startsWith("@every ")) {
      const [, intervalText, ...commandParts] = trimmed.split(/\s+/);
      const command = commandParts.join(" ");
      if (!command) throw new Error(`${id}: missing command`);
      parsed.push({ id, type: "every", intervalMs: parseEvery(intervalText), command, env: { ...env }, lastRunMs: 0 });
      return;
    }

    const aliases = {
      "@hourly": "0 * * * *",
      "@daily": "0 0 * * *",
      "@weekly": "0 0 * * 0",
      "@monthly": "0 0 1 * *",
    };
    const alias = Object.keys(aliases).find((key) => trimmed.startsWith(`${key} `));
    const normalized = alias ? `${aliases[alias]} ${trimmed.slice(alias.length).trim()}` : trimmed;
    const parts = normalized.split(/\s+/);
    if (parts.length < 6) throw new Error(`${id}: expected five cron fields and a command`);

    const command = parts.slice(5).join(" ");
    parsed.push({ id, type: "cron", schedule: parseCron(parts.slice(0, 5)), command, env: { ...env }, lastMinuteKey: "" });
  });

  return parsed;
}

function loadCrontab() {
  let stat;
  try {
    stat = fs.statSync(crontabPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      jobs = [];
      lastMtimeMs = 0;
      log(`no crontab at ${crontabPath}`);
      return;
    }
    throw error;
  }

  if (stat.mtimeMs === lastMtimeMs) return;

  const nextJobs = parseCrontab(fs.readFileSync(crontabPath, "utf8"));
  jobs = nextJobs;
  lastMtimeMs = stat.mtimeMs;
  log(`loaded ${jobs.length} job(s) from ${crontabPath}`);
}

function runJob(job) {
  if (running.has(job.id)) {
    log(`${job.id}: skipped because previous run is still active`);
    return;
  }

  running.add(job.id);
  const started = Date.now();
  log(`${job.id}: starting: ${job.command}`);

  const child = spawn("bash", ["-lc", job.command], {
    cwd,
    env: { ...process.env, ...job.env },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    running.delete(job.id);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (signal) {
      log(`${job.id}: exited by signal ${signal} after ${seconds}s`);
    } else {
      log(`${job.id}: exited with code ${code} after ${seconds}s`);
    }
  });
}

function tick() {
  try {
    loadCrontab();
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

    for (const job of jobs) {
      if (job.type === "every") {
        const due = job.lastRunMs === 0 || Date.now() - job.lastRunMs >= job.intervalMs;
        if (due) {
          job.lastRunMs = Date.now();
          runJob(job);
        }
        continue;
      }

      if (cronMatches(job.schedule, now) && job.lastMinuteKey !== minuteKey) {
        job.lastMinuteKey = minuteKey;
        runJob(job);
      }
    }
  } catch (error) {
    log(`scheduler error: ${error.stack || error.message}`);
  }
}

log(`scheduler starting; crontab=${crontabPath}; cwd=${cwd}; pollMs=${pollMs}`);
tick();
setInterval(tick, pollMs);
