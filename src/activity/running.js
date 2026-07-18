// Running session normalization, load, expenditure, and recovery summaries.

const RUN_TYPES = Object.freeze({
  recovery: { label: "Recovery", loadFactor: 0.75 },
  easy: { label: "Easy", loadFactor: 0.90 },
  long: { label: "Long", loadFactor: 1.00 },
  tempo: { label: "Tempo", loadFactor: 1.10 },
  intervals: { label: "Intervals", loadFactor: 1.20 },
  hills: { label: "Hills", loadFactor: 1.20 },
  race: { label: "Race", loadFactor: 1.25 },
});

function finiteRunNumber(value, fallback = null) {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRunSession(run = {}) {
  const type = RUN_TYPES[run.type] ? run.type : "easy";
  const distanceKm = Math.max(0, finiteRunNumber(run.distanceKm, 0));
  const durationSec = Math.max(0, Math.round(finiteRunNumber(run.durationSec, 0)));
  return {
    id: String(run.id || `run-${Date.now()}`),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(run.date || "")) ? String(run.date) : todayISO(),
    startTime: /^\d{2}:\d{2}$/.test(String(run.startTime || "")) ? String(run.startTime) : null,
    type,
    environment: ["outdoor", "treadmill", "trail"].includes(run.environment) ? run.environment : "outdoor",
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationSec,
    rpe: Math.max(1, Math.min(10, Math.round(finiteRunNumber(run.rpe, 5)))),
    avgHr: Math.max(0, Math.round(finiteRunNumber(run.avgHr, 0))) || null,
    elevationM: Math.max(0, Math.round(finiteRunNumber(run.elevationM, 0))),
    surface: String(run.surface || "").trim().slice(0, 40) || null,
    pain: Math.max(0, Math.min(10, Math.round(finiteRunNumber(run.pain, 0)))),
    notes: String(run.notes || "").trim().slice(0, 500) || null,
    intervals: Array.isArray(run.intervals) ? run.intervals.slice(0, 50) : [],
    createdAt: run.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function runPaceSecondsPerKm(run) {
  const distance = finiteRunNumber(run?.distanceKm, 0);
  const duration = finiteRunNumber(run?.durationSec, 0);
  return distance > 0 && duration > 0 ? duration / distance : null;
}

function formatRunDuration(seconds) {
  const total = Math.max(0, Math.round(finiteRunNumber(seconds, 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatRunPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "-";
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}/km`;
}

function estimatedRunCalories(run, bodyweightKg) {
  const distance = finiteRunNumber(run?.distanceKm, 0);
  const weight = finiteRunNumber(bodyweightKg, 0);
  if (!distance || !weight) return 0;
  const environmentFactor = run?.environment === "treadmill" ? 0.95 : run?.environment === "trail" ? 1.08 : 1;
  const elevationFactor = 1 + Math.min(0.20, finiteRunNumber(run?.elevationM, 0) / Math.max(distance, 0.1) / 1000);
  return Math.max(0, Math.round(weight * distance * environmentFactor * elevationFactor));
}

function runTrainingLoad(run) {
  const minutes = finiteRunNumber(run?.durationSec, 0) / 60;
  if (!minutes) return 0;
  const type = RUN_TYPES[run?.type] || RUN_TYPES.easy;
  const rpe = Math.max(1, Math.min(10, finiteRunNumber(run?.rpe, 5)));
  const elevationFactor = 1 + Math.min(0.20, finiteRunNumber(run?.elevationM, 0) / 500);
  return Math.round(minutes * rpe * type.loadFactor * elevationFactor);
}

function runsForDate(date, state = STATE) {
  return (Array.isArray(state?.runSessions) ? state.runSessions : [])
    .filter(run => run?.date === date)
    .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
}

function runFuelingAdjustmentForDate(date, state = STATE) {
  const runs = runsForDate(date, state);
  if (!runs.length) return { adjustment: 0, expenditure: 0, reason: null };
  const weight = typeof latestWeighIn === "function"
    ? (latestWeighIn()?.weight || state?.profile?.bodyweight || 80)
    : (state?.profile?.bodyweight || 80);
  const mode = state?.cut?.mode || "cut";
  const share = mode === "bulk" ? 0.60 : mode === "maintain" ? 0.50 : 0.35;
  let expenditure = 0;
  let eligible = 0;
  runs.forEach(run => {
    const kcal = estimatedRunCalories(run, weight);
    expenditure += kcal;
    const minutes = run.durationSec / 60;
    const demanding = ["long", "tempo", "intervals", "hills", "race"].includes(run.type) || run.rpe >= 7;
    if (minutes >= 45 || demanding) eligible += kcal;
  });
  const cap = mode === "cut" ? 300 : 450;
  const adjustment = Math.min(cap, Math.max(0, Math.round((eligible * share) / 50) * 50));
  return {
    adjustment,
    expenditure,
    reason: adjustment ? "Partial fueling for demanding running; estimated burn is not fully eaten back." : "Short easy running stays inside the normal activity target.",
  };
}

function runningLoadSummary(endDate, state = STATE) {
  const end = new Date(`${endDate}T12:00:00`);
  const startIso = days => {
    const date = new Date(end);
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  };
  const all = Array.isArray(state?.runSessions) ? state.runSessions : [];
  const currentStart = startIso(6);
  const previousStart = startIso(13);
  const previousEnd = startIso(7);
  const current = all.filter(run => run.date >= currentStart && run.date <= endDate);
  const previous = all.filter(run => run.date >= previousStart && run.date <= previousEnd);
  const summarize = runs => ({
    count: runs.length,
    distanceKm: Math.round(runs.reduce((sum, run) => sum + finiteRunNumber(run.distanceKm, 0), 0) * 10) / 10,
    durationSec: runs.reduce((sum, run) => sum + finiteRunNumber(run.durationSec, 0), 0),
    load: runs.reduce((sum, run) => sum + runTrainingLoad(run), 0),
  });
  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);
  const loadChangePct = previousSummary.load >= 100
    ? Math.round(((currentSummary.load - previousSummary.load) / previousSummary.load) * 100)
    : null;
  return { current: currentSummary, previous: previousSummary, loadChangePct };
}

function runningRecoverySignal(date, state = STATE) {
  const all = Array.isArray(state?.runSessions) ? state.runSessions : [];
  const dateValue = new Date(`${date}T12:00:00`);
  const cutoff = new Date(dateValue);
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const recent = all.filter(run => run.date >= cutoffIso && run.date < date);
  const recentLoad = recent.reduce((sum, run) => sum + runTrainingLoad(run), 0);
  const hard = recent.filter(run => ["long", "tempo", "intervals", "hills", "race"].includes(run.type) || run.rpe >= 8);
  const painful = all.filter(run => run.date <= date && run.date >= (() => {
    const d = new Date(dateValue); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
  })() && run.pain >= 4);
  const weekly = runningLoadSummary(date, state);
  let penalty = 0;
  const factors = [];
  if (recentLoad >= 450) { penalty += 0.75; factors.push(`High 48h run load (${recentLoad})`); }
  else if (recentLoad >= 250 || hard.length) { penalty += 0.5; factors.push("Demanding run in the last 48h"); }
  if (weekly.loadChangePct != null && weekly.loadChangePct > 25) {
    penalty += 0.5;
    factors.push(`Run load up ${weekly.loadChangePct}% this week`);
  }
  if (painful.length) {
    penalty += 0.5;
    factors.push(`Run pain ${Math.max(...painful.map(run => run.pain))}/10 reported`);
  }
  return { penalty: Math.min(1.5, penalty), factors, recentLoad, weekly };
}
