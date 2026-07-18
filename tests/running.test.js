const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
global.todayISO = () => "2026-07-18";
global.latestWeighIn = () => ({ weight: 80 });
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "activity", "running.js"), "utf8"), { filename: "running.js" });

const easy = normalizeRunSession({ id: "easy", date: "2026-07-18", type: "easy", distanceKm: 5, durationSec: 1800, rpe: 5 });
assert.equal(runPaceSecondsPerKm(easy), 360);
assert.equal(formatRunPace(runPaceSecondsPerKm(easy)), "6:00/km");
assert.equal(estimatedRunCalories(easy, 80), 400);
assert.equal(runTrainingLoad(easy), 135);

global.STATE = { profile: { bodyweight: 80 }, cut: { mode: "cut" }, runSessions: [easy] };
assert.equal(runFuelingAdjustmentForDate("2026-07-18").adjustment, 0, "short easy runs should not add calories");

const long = normalizeRunSession({ id: "long", date: "2026-07-18", type: "long", distanceKm: 12, durationSec: 4500, rpe: 7 });
STATE.runSessions = [long];
const fuel = runFuelingAdjustmentForDate("2026-07-18");
assert.equal(fuel.expenditure, 960);
assert.equal(fuel.adjustment, 300, "cut-mode fueling should be partial and capped");

STATE.runSessions = [
  normalizeRunSession({ id: "prior", date: "2026-07-10", type: "easy", distanceKm: 4, durationSec: 1800, rpe: 4 }),
  normalizeRunSession({ id: "hard", date: "2026-07-17", type: "intervals", distanceKm: 8, durationSec: 3000, rpe: 9 }),
];
const recovery = runningRecoverySignal("2026-07-18");
assert.ok(recovery.penalty >= 0.5);
assert.ok(recovery.factors.some(item => /Demanding|High/.test(item)));

global.daysBetween = (start, end) => Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000);
global.getDailyLog = date => STATE.dailyLogs.find(log => log.date === date) || null;
global.sessionCompletionRatio = () => 1;
STATE.cut.proteinFloor = 160;
STATE.dailyLogs = [{ date: "2026-07-18", recovery: 7, sleepOk: true, protein: 170 }];
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "workout", "readiness.js"), "utf8"), { filename: "readiness.js" });
const readiness = calculateReadiness("2026-07-18");
assert.ok(readiness.score <= 4, "a hard run in the previous 48h should prevent peak lifting readiness");
assert.ok(readiness.factors.some(item => /run/i.test(item)));

const malformed = normalizeRunSession({ date: "bad", distanceKm: "oops", durationSec: -5, rpe: 99, pain: -2 });
assert.equal(malformed.date, "2026-07-18");
assert.equal(malformed.distanceKm, 0);
assert.equal(malformed.durationSec, 0);
assert.equal(malformed.rpe, 10);
assert.equal(malformed.pain, 0);

console.log("Running model tests passed.");
