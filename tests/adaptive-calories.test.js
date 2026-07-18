const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const backupPath = path.resolve(process.argv[2] || path.join(root, "ascend-clean-import.json"));
const today = "2026-07-18";

global.todayISO = () => today;
global.isoToDate = iso => new Date(`${iso}T12:00:00`);
global.daysBetween = (start, end) => Math.round((isoToDate(end) - isoToDate(start)) / 86400000);
global.computeTDEE = (_sex, weight) => Math.round(Number(weight || 80) * 33);
global.isRestDay = date => Boolean(global.STATE?.dailyLogs?.find(log => log.date === date)?.restDay);
global.latestWeighIn = () => (Array.isArray(global.STATE?.dailyLogs) ? global.STATE.dailyLogs : [])
  .filter(log => Number.isFinite(Number(log?.weight)))
  .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
  .at(-1) || null;

vm.runInThisContext(
  fs.readFileSync(path.join(root, "src", "nutrition", "adaptive-calories.js"), "utf8"),
  { filename: "adaptive-calories.js" }
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function dateOffset(days) {
  const date = isoToDate(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function baseState() {
  return {
    onboarded: true,
    profile: { bodyweight: 90, sex: "male", height: 178, age: 26, activityLevel: "moderate", stepGoal: 10000 },
    cut: { mode: "cut", p1Target: 82, p2Target: 78, p1Kcal: 2100, p2Kcal: 2000, proteinFloor: 160 },
    dietProfile: {},
    dailyLogs: [],
    sessions: [],
  };
}

function enabledCoach(overrides = {}) {
  return {
    ...nutritionCoachTemplate(),
    enabled: true,
    checkpointWeight: 83,
    finalGoalWeight: 78,
    startWeight: 90,
    startedAt: "2026-07-01",
    currentKcal: 2100,
    startingKcal: 2100,
    ...overrides,
  };
}

const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
const backupCounts = { sessions: backup.sessions.length, dailyLogs: backup.dailyLogs.length };
global.STATE = migrateNutritionCoachState(clone(backup));
assert.equal(STATE.sessions.length, backupCounts.sessions, "migration must preserve every training session");
assert.equal(STATE.dailyLogs.length, backupCounts.dailyLogs, "migration must preserve every daily log");
assert.equal(STATE.nutritionCoach.enabled, true, "an onboarded cut should receive an adaptive plan");
assert.ok(Number.isFinite(STATE.nutritionCoach.currentKcal), "adaptive calories must be numeric");
assert.doesNotThrow(() => adaptiveNutritionStatus(today), "the supplied backup must render an adaptive status");

const malformed = baseState();
malformed.dailyLogs = { unexpected: true };
malformed.nutritionCoach = { enabled: true, currentKcal: "bad", recovery: "bad", reviews: "bad" };
assert.doesNotThrow(() => migrateNutritionCoachState(malformed), "malformed optional fields must not stop startup");
assert.deepEqual(malformed.dailyLogs, [], "malformed logs should normalize to an empty array");
assert.ok(Array.isArray(malformed.nutritionCoach.reviews), "malformed reviews should normalize to an array");
assert.ok(Number.isFinite(malformed.nutritionCoach.currentKcal), "malformed calories should normalize to a number");

global.STATE = baseState();
STATE.nutritionCoach = enabledCoach();
STATE.dailyLogs = Array.from({ length: 14 }, (_, index) => ({
  date: dateOffset(index - 13),
  weight: 90,
  kcal: 2050,
  protein: 180,
  steps: 11000,
  foodLogComplete: true,
}));
evaluateAdaptiveNutrition({ date: today, force: true });
assert.equal(STATE.nutritionCoach.currentKcal, 2000, "a logged stall should reduce the target by 100 kcal");
assert.equal(STATE.nutritionCoach.reviews.at(-1).adjustment, -100, "the stall review should record the adjustment");

global.STATE = baseState();
STATE.nutritionCoach = enabledCoach();
STATE.dailyLogs = Array.from({ length: 14 }, (_, index) => ({
  date: dateOffset(index - 13),
  weight: 89 + index * 0.1,
  kcal: 2450,
  protein: 180,
  steps: 7000,
  foodLogComplete: true,
}));
evaluateAdaptiveNutrition({ date: today, force: true });
assert.equal(STATE.nutritionCoach.recovery.active, true, "repeated overages while gaining should start recovery");
assert.equal(STATE.nutritionCoach.currentKcal, 2100, "recovery must not impose a crash-diet reduction");

console.log(JSON.stringify({
  backup: path.basename(backupPath),
  sessionsPreserved: backupCounts.sessions,
  dailyLogsPreserved: backupCounts.dailyLogs,
  migratedCalories: migrateNutritionCoachState(clone(backup)).nutritionCoach.currentKcal,
  stalledTarget: 2000,
  recoveryTarget: 2100,
}));
