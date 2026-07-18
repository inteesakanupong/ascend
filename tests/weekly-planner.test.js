const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
global.todayISO = () => "2026-07-18";
global.DAY_ORDER = ["PUSH", "PULL", "ARMS", "LEGS"];
global.nextSessionDay = () => "PUSH";
global.getDailyLog = date => STATE.dailyLogs.find(log => log.date === date) || null;
global.calculateReadiness = () => ({ score: 3, factors: [], adjustment: 0 });
global.juggernautWave = () => ({ name: "ACCUMULATION" });
global.latestWeighIn = () => ({ weight: 80 });

vm.runInThisContext(fs.readFileSync(path.join(root, "src", "activity", "running.js"), "utf8"), { filename: "running.js" });
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "planner", "weekly-planner.js"), "utf8"), { filename: "weekly-planner.js" });

function baseState() {
  return {
    profile: { bodyweight: 80, trainingDays: 4 },
    cut: { mode: "cut" },
    dailyLogs: [],
    sessions: [],
    runSessions: [],
  };
}

global.STATE = baseState();
let plan = generateWeeklyPlan({ state: STATE });
assert.equal(plan.items.length, 7);
assert.equal(plan.items.filter(item => item.liftDay).length, 4);
assert.equal(plan.items.filter(item => item.run).length, 2);
assert.deepEqual(plan.items.filter(item => item.liftDay).map(item => item.liftDay), ["PUSH", "PULL", "ARMS", "LEGS"]);
assert.ok(plan.items.every((item, index) => item.run?.type !== "long" || !plannerHardRunConflict(plan.items, index)));

acceptWeeklyPlan(STATE);
assert.equal(plannedLiftDayForDate("2026-07-18"), "PUSH");
const plannedFuel = plannedFuelingAdjustmentForDate(plan.items.find(item => item.run)?.date);
assert.ok(plannedFuel.expenditure > 0);

const runDay = plan.items.find(item => item.run);
const oldDuration = runDay.run.durationMin;
assert.equal(updatePlannerItem(runDay.date, "shorten").ok, true);
assert.ok(runDay.run.durationMin < oldDuration);

STATE = baseState();
STATE.dailyLogs = [{ date: "2026-07-18", restDay: true }];
plan = generateWeeklyPlan({ state: STATE });
assert.equal(plan.items[0].liftDay, null, "a logged rest day must remain protected");

STATE = baseState();
plan = generateWeeklyPlan({ state: STATE, anchorDate: "2026-07-16" });
acceptWeeklyPlan(STATE);
reconcileWeeklyPlan("2026-07-18", STATE);
assert.ok(plan.items.some(item => item.adjustments.some(note => /moved|safe slot/i.test(note))), "missed work should be reflowed or explicitly held");

STATE = baseState();
STATE.weeklyPlanner = { preferences: { liftDays: "invalid", runDays: null, preferredLongDay: "invalid" } };
const normalized = normalizeWeeklyPlannerState(STATE);
assert.equal(normalized.preferences.liftDays, 3, "malformed imported planner preferences should fall back safely");

STATE = baseState();
plan = generateWeeklyPlan({ state: STATE });
const runOnly = plan.items.find(item => item.run && !item.liftDay);
const shortenedLift = plan.items.find(item => item.liftDay && !item.run);
shortenedLift.liftMode = "shortened";
assert.equal(updatePlannerItem(runOnly.date, "move", shortenedLift.date).ok, true);
assert.equal(shortenedLift.liftMode, "shortened", "moving a run must not reset the target lift mode");

console.log("Weekly planner tests passed.");
