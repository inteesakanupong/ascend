// Seven-day recommendation layer coordinating strength, running, recovery, and nutrition.

const WEEKLY_PLANNER_VERSION = 1;

function plannerDateOffset(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function plannerClamp(value, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : min;
}

function plannerDefaultPreferences(state = STATE) {
  const recentRuns = (Array.isArray(state?.runSessions) ? state.runSessions : [])
    .filter(run => run.date >= plannerDateOffset(todayISO(), -28));
  const weeklyRunRate = Math.round(recentRuns.length / 4);
  const hasLongRun = recentRuns.some(run => run.type === "long" || Number(run.durationSec) >= 3600);
  return {
    liftDays: plannerClamp(Math.round(Number(state?.profile?.trainingDays || 4)), 3, 5),
    runDays: plannerClamp(weeklyRunRate || 2, 0, 4),
    includeLongRun: hasLongRun,
    preferredLongDay: 6,
  };
}

function normalizePlannerPreferences(preferences = {}, state = STATE) {
  const defaults = plannerDefaultPreferences(state);
  return {
    liftDays: plannerClamp(Math.round(Number(preferences.liftDays ?? defaults.liftDays)), 3, 5),
    runDays: plannerClamp(Math.round(Number(preferences.runDays ?? defaults.runDays)), 0, 4),
    includeLongRun: preferences.includeLongRun === true,
    preferredLongDay: plannerClamp(Math.round(Number(preferences.preferredLongDay ?? defaults.preferredLongDay)), 0, 6),
  };
}

function normalizeWeeklyPlannerState(state = STATE) {
  const existing = state.weeklyPlanner && typeof state.weeklyPlanner === "object" ? state.weeklyPlanner : {};
  const items = Array.isArray(existing.items) ? existing.items.filter(item => item?.date) : [];
  state.weeklyPlanner = {
    version: WEEKLY_PLANNER_VERSION,
    enabled: existing.enabled !== false,
    status: existing.status === "accepted" ? "accepted" : "draft",
    generatedAt: existing.generatedAt || null,
    acceptedAt: existing.acceptedAt || null,
    anchorDate: existing.anchorDate || null,
    preferences: normalizePlannerPreferences(existing.preferences, state),
    items,
    revision: Math.max(0, Number(existing.revision || 0)),
    lastReflowAt: existing.lastReflowAt || null,
    lastDecision: existing.lastDecision || null,
  };
  return state.weeklyPlanner;
}

function plannerLiftOffsets(count, delayToday = false) {
  const patterns = {
    3: [0, 2, 5],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
  };
  const base = patterns[count] || patterns[4];
  if (!delayToday) return base;
  return base.map(offset => Math.min(6, offset + 1)).filter((offset, index, all) => all.indexOf(offset) === index);
}

function plannerLiftSequence(count) {
  const first = typeof nextSessionDay === "function" ? nextSessionDay() : "PUSH";
  const order = typeof DAY_ORDER !== "undefined" ? DAY_ORDER : ["PUSH", "PULL", "ARMS", "LEGS"];
  const start = Math.max(0, order.indexOf(first));
  return Array.from({ length: count }, (_, index) => order[(start + index) % order.length]);
}

function plannerRecentRunTemplate(state = STATE) {
  const recent = [...(Array.isArray(state?.runSessions) ? state.runSessions : [])]
    .filter(run => Number(run.distanceKm) > 0 && Number(run.durationSec) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const pace = avg(recent.map(run => runPaceSecondsPerKm(run)).filter(Number.isFinite)) || 390;
  const durationMin = Math.round(avg(recent.map(run => run.durationSec / 60)) || 35);
  return { pace, durationMin: plannerClamp(durationMin, 25, 60) };
}

function plannerRunPrescription(type, state = STATE) {
  const template = plannerRecentRunTemplate(state);
  const durationMin = type === "long" ? Math.max(60, Math.round(template.durationMin * 1.5 / 5) * 5) : template.durationMin;
  const distanceKm = Math.max(2, Math.round((durationMin * 60 / template.pace) * 10) / 10);
  return {
    type,
    durationMin,
    distanceKm,
    rpe: type === "long" ? 6 : type === "recovery" ? 3 : 5,
    shortened: false,
  };
}

function plannerHardRunConflict(items, index) {
  return [index - 1, index, index + 1].some(candidate => items[candidate]?.liftDay === "LEGS");
}

function plannerPlaceRuns(items, preferences, state = STATE) {
  let remaining = preferences.runDays;
  if (!remaining) return;
  if (preferences.includeLongRun) {
    const preferred = preferences.preferredLongDay;
    const candidates = [preferred, 6, 5, 4, 3, 2, 1, 0].filter((value, index, all) => all.indexOf(value) === index);
    const slot = candidates.find(index => !items[index].run && !plannerHardRunConflict(items, index));
    if (slot != null) {
      items[slot].run = plannerRunPrescription("long", state);
      items[slot].reason.push("Long run kept away from leg training by at least one day.");
      remaining -= 1;
    }
  }
  const easyCandidates = [2, 4, 6, 1, 3, 5, 0];
  easyCandidates.forEach(index => {
    if (remaining <= 0 || items[index].run || items[index].liftDay === "LEGS") return;
    const type = items[index].liftDay ? "recovery" : "easy";
    items[index].run = plannerRunPrescription(type, state);
    items[index].reason.push(items[index].liftDay
      ? "Low-cost running paired with upper-body training."
      : "Easy aerobic work placed between strength sessions.");
    remaining -= 1;
  });
}

function generateWeeklyPlan(options = {}) {
  const state = options.state || STATE;
  const anchorDate = options.anchorDate || todayISO();
  const current = normalizeWeeklyPlannerState(state);
  const preferences = normalizePlannerPreferences(options.preferences || current.preferences, state);
  const todayLog = typeof getDailyLog === "function" ? getDailyLog(anchorDate) : null;
  const readiness = typeof calculateReadiness === "function" ? calculateReadiness(anchorDate) : { score: null };
  const delayToday = todayLog?.restDay === true || (readiness.score != null && readiness.score <= 2.5);
  const items = Array.from({ length: 7 }, (_, index) => ({
    date: plannerDateOffset(anchorDate, index),
    liftDay: null,
    liftMode: "standard",
    run: null,
    status: "planned",
    completed: { lift: false, run: false },
    reason: [],
    adjustments: [],
  }));
  const offsets = plannerLiftOffsets(preferences.liftDays, delayToday);
  const sequence = plannerLiftSequence(offsets.length);
  offsets.forEach((offset, index) => {
    items[offset].liftDay = sequence[index];
    const wave = typeof juggernautWave === "function" ? juggernautWave(0, sequence[index]) : null;
    items[offset].reason.push(wave?.name === "DELOAD"
      ? `${sequence[index]} deload remains mandatory.`
      : `${sequence[index]} continues the current strength rotation.`);
  });
  if (delayToday) {
    items[0].reason.push(todayLog?.restDay ? "Logged rest day protected." : "Low readiness moved training out of today.");
  }
  plannerPlaceRuns(items, preferences, state);
  items.forEach(item => {
    if (!item.liftDay && !item.run) item.reason.push("Recovery day protects the remaining workload.");
  });
  state.weeklyPlanner = {
    ...current,
    status: "draft",
    generatedAt: new Date().toISOString(),
    acceptedAt: null,
    anchorDate,
    preferences,
    items,
    revision: current.revision + 1,
    lastDecision: delayToday ? "Today was reduced because recovery signals overruled the default schedule." : "Seven-day recommendation generated from the current rotation and recovery data.",
  };
  return state.weeklyPlanner;
}

function acceptWeeklyPlan(state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  if (!plan.items.length) generateWeeklyPlan({ state });
  state.weeklyPlanner.status = "accepted";
  state.weeklyPlanner.acceptedAt = new Date().toISOString();
  state.weeklyPlanner.lastDecision = "Weekly plan accepted. Permanent workout programming remains unchanged.";
  return state.weeklyPlanner;
}

function plannerItemForDate(date, state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  return plan.items.find(item => item.date === date) || null;
}

function plannedLiftDayForDate(date, state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  if (plan.status !== "accepted") return null;
  const item = plannerItemForDate(date, state);
  return item && item.status !== "skipped" ? item.liftDay : null;
}

function plannedRunForDate(date, state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  if (plan.status !== "accepted" || (typeof runsForDate === "function" && runsForDate(date, state).length)) return null;
  const item = plannerItemForDate(date, state);
  return item && item.status !== "skipped" ? item.run : null;
}

function plannedFuelingAdjustmentForDate(date, state = STATE) {
  const planned = plannedRunForDate(date, state);
  if (!planned || typeof runFuelingAdjustmentForRuns !== "function") return { adjustment: 0, expenditure: 0, reason: null };
  const run = normalizeRunSession({
    id: `planned-${date}`,
    date,
    type: planned.type,
    distanceKm: planned.distanceKm,
    durationSec: planned.durationMin * 60,
    rpe: planned.rpe,
  });
  const result = runFuelingAdjustmentForRuns([run], state);
  return { ...result, reason: result.adjustment ? "Fueling reserved for the accepted weekly plan." : result.reason };
}

function activityFuelingAdjustmentForDate(date, state = STATE) {
  const actual = typeof runFuelingAdjustmentForDate === "function"
    ? runFuelingAdjustmentForDate(date, state)
    : { adjustment: 0, expenditure: 0, reason: null };
  const planned = plannedFuelingAdjustmentForDate(date, state);
  return actual.expenditure > 0 ? actual : planned;
}

function plannerCompleteState(item, state = STATE) {
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  const runs = Array.isArray(state.runSessions) ? state.runSessions : [];
  return {
    lift: !item.liftDay || sessions.some(session => session.date === item.date && session.day === item.liftDay),
    run: !item.run || runs.some(run => run.date === item.date),
  };
}

function reconcileWeeklyPlan(date = todayISO(), state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  if (plan.status !== "accepted" || !plan.items.length) return plan;
  let changed = false;
  plan.items.forEach(item => {
    item.completed = plannerCompleteState(item, state);
    if (item.date < date && item.status === "planned" && (!item.completed.lift || !item.completed.run)) {
      item.status = "missed";
      if (item.liftDay && !item.completed.lift) {
        const target = plan.items.find(candidate => candidate.date >= date && !candidate.liftDay && candidate.status === "planned");
        if (target) {
          target.liftDay = item.liftDay;
          target.liftMode = item.liftMode;
          target.reason.unshift(`${item.liftDay} moved from ${item.date} after it was missed.`);
          item.liftDay = null;
          item.adjustments.push(`Strength moved to ${target.date}.`);
        } else {
          item.adjustments.push("No safe strength slot remained this week; rebuild recommended.");
        }
      }
      if (item.run && !item.completed.run) {
        const hard = item.run.type === "long";
        const target = plan.items.find((candidate, index) => candidate.date >= date && !candidate.run && candidate.status === "planned" && (!hard || !plannerHardRunConflict(plan.items, index)));
        if (target) {
          target.run = item.run;
          target.reason.push(`${runTypeLabel(item.run.type)} run moved from ${item.date}; it was not stacked onto another run.`);
          item.run = null;
          item.adjustments.push(`Run moved to ${target.date}.`);
        } else {
          item.run = null;
          item.adjustments.push("Missed run skipped because no safe slot remained.");
        }
      }
      changed = true;
    }
  });
  if (changed) {
    plan.lastReflowAt = new Date().toISOString();
    plan.lastDecision = "Missed work was reflowed across the remaining safe slots.";
  }
  return plan;
}

function updatePlannerItem(date, action, targetDate = null, state = STATE) {
  const plan = normalizeWeeklyPlannerState(state);
  const item = plannerItemForDate(date, state);
  if (!item) return { ok: false, reason: "Plan day not found." };
  if (action === "shorten") {
    if (item.run) {
      item.run.durationMin = Math.max(20, item.run.durationMin - 15);
      item.run.distanceKm = Math.max(2, Math.round(item.run.distanceKm * 0.75 * 10) / 10);
      item.run.shortened = true;
    }
    if (item.liftDay) item.liftMode = "shortened";
    item.adjustments.push("Workload shortened by user.");
  } else if (action === "skip") {
    item.liftDay = null;
    item.run = null;
    item.status = "skipped";
    item.adjustments.push("Day skipped by user.");
  } else if (action === "move" && targetDate) {
    const target = plannerItemForDate(targetDate, state);
    if (!target || target.date === item.date) return { ok: false, reason: "Choose another day in this plan." };
    if (item.run?.type === "long") {
      const targetIndex = plan.items.indexOf(target);
      if (plannerHardRunConflict(plan.items, targetIndex)) return { ok: false, reason: "Long runs cannot be moved beside leg day." };
    }
    if (target.liftDay && item.liftDay) return { ok: false, reason: "That day already has strength training." };
    if (target.run && item.run) return { ok: false, reason: "That day already has a run." };
    if (item.liftDay) {
      target.liftDay = item.liftDay;
      target.liftMode = item.liftMode;
    }
    target.run = target.run || item.run;
    target.reason.unshift(`Work moved from ${item.date} by user.`);
    item.liftDay = null;
    item.run = null;
    item.status = "moved";
    item.adjustments.push(`Moved to ${target.date}.`);
  } else {
    return { ok: false, reason: "Unsupported plan action." };
  }
  plan.revision += 1;
  plan.lastDecision = `Plan updated: ${action} ${date}.`;
  return { ok: true, plan };
}
