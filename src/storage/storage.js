// State storage: keys, IndexedDB helpers, load/save/fresh

// ───────── 2. STATE I/O ─────────
// Dual storage: IndexedDB (primary, survives Chrome restarts on Android)
// + localStorage (fallback). Reads from whichever has more recent data.
const STORAGE_KEY = "ppal-state";
const IDB_NAME    = "ppal-db";
const IDB_STORE   = "state";
const IDB_KEY     = "main";
const HARD_RESET_VERSION = "2026-05-15.7";
const HARD_RESET_KEY = "ascend-hard-reset-version";
const IMPORT_LOCK_KEY = "ascend-import-lock";

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet() {
  try {
    const db  = await openIDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej(req.error);
    });
  } catch(e) { return null; }
}

async function idbSet(val) {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(val, IDB_KEY);
      req.onsuccess = () => res(true);
      req.onerror   = () => rej(req.error);
    });
  } catch(e) { return false; }
}

function freshDefaultState() {
  const s = JSON.parse(JSON.stringify(DEFAULT_STATE));
  const startDate = typeof todayISO === "function" ? todayISO() : "2026-05-16";
  s.onboarded = false;
  s.sessions = [];
  s.dailyLogs = [];
  s.measurements = [];
  s.customFoods = [];
  s.customExercises = [];
  s.exerciseMuscleActivations = {};
  s.repRangeCounters = {};
  s.pendingProgramChanges = {};
  s.lastMrvSwap = null;
  s.adaptive_state = { version: 1, exerciseMemory: {}, muscleMemory: {}, fatigue: {}, decisions: [] };
  s.lifterAnalysis = { strengthBalance: {}, bodyTrend: {}, dietOutcome: {}, fatigueRisks: [], progressionDrivers: [], recommendations: [] };
  s.profile = {
    ...s.profile,
    name: "",
    sex: null,
    age: null,
    height: null,
    bodyweight: 80,
    bodyFatPct: null,
    programStart: startDate,
    trainingProgramStartedAt: startDate,
    dietProgramStartedAt: startDate,
    trainingProgramSessionBaseline: { PUSH: 0, PULL: 0, ARMS: 0, LEGS: 0 },
  };
  Object.keys(s.profile).forEach(k => { if (k.startsWith("wm_")) delete s.profile[k]; });
  s.cut = {
    ...s.cut,
    mode: "cut",
    p1Target: 75,
    p1Weeks: 8,
    dbWeeks: 1.5,
    p2Target: 73,
    p2Weeks: 4,
    p1Kcal: 2100,
    dbKcal: 2800,
    p2Kcal: 1950,
    proteinFloor: 160,
  };
  s.athleteProfile = {
    ...s.athleteProfile,
    bodyweightKg: 80,
    bodyFatPercent: null,
    leanMassKg: null,
    benchmarkLifts: defaultBenchmarkLifts ? defaultBenchmarkLifts() : s.athleteProfile.benchmarkLifts,
  };
  s.dietProfile = { calorieTarget: null, proteinTarget: null, carbTarget: null, fatTarget: null, weeklyWeightChangeTarget: null, source: "ascend" };
  s.healthSignals = { source: "manual", date: null, sleepHours: null, sleepScore: null, restingHR: null, steps: null, activeCalories: null, bodyweightKg: null, bodyFatPercent: null, leanMassKg: null };
  return s;
}

async function loadStateAsync() {
  try {
    const idbRaw = await idbGet();
    if (idbRaw && idbRaw.v) return idbRaw;
  } catch(e) {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v) {
        // Migrate to IDB
        await idbSet(parsed).catch(() => {});
        return parsed;
      }
    }
  } catch(e) {}
  return freshDefaultState();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDefaultState();
    const parsed = JSON.parse(raw);
    return parsed && parsed.v ? parsed : freshDefaultState();
  } catch (e) {
    return freshDefaultState();
  }
}

function saveState() {
  // Write to both stores simultaneously
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }
  catch (e) { console.warn("localStorage write failed", e); }
  idbSet(JSON.parse(JSON.stringify(STATE))).catch(e => console.warn("IDB write failed", e));
}

function forceFreshStartForThisBuild() {
  try {
    if (localStorage.getItem(HARD_RESET_KEY) === HARD_RESET_VERSION) return;
    const fresh = freshDefaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    localStorage.setItem(HARD_RESET_KEY, HARD_RESET_VERSION);
  } catch (e) {
    console.warn("fresh start reset failed", e);
  }
}

function trainingProgramStartDate() {
  return STATE.profile.trainingProgramStartedAt || STATE.profile.programStart || todayISO();
}
