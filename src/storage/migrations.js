// State migration and normalization: migrateState + normalizers

function normalizeExerciseProgramNamesAndOrder(s) {
  if (!s?.exercises) return s;
  Object.values(s.exercises).forEach(list => {
    if (!Array.isArray(list)) return;
    list.forEach(ex => {
      if (ex?.name) ex.name = String(ex.name).replace(/\u2605/g, "").replace(/\s+/g, " ").trim();
    });
  });

  const pushOrder = [
    "Smith Incline Bench Press",
    "Smith Seated OHP",
    "Machine Chest Press (Flat)",
    "DB Lateral Raise",
    "Cable Lateral Raise (1-arm)",
    "Incline DB Fly / Cable Fly",
    "Cable OH Tricep Extension",
    "Tricep Pushdown (rope)",
  ];
  if (Array.isArray(s.exercises.PUSH)) {
    const remaining = [...s.exercises.PUSH];
    s.exercises.PUSH = pushOrder
      .map(name => {
        const idx = remaining.findIndex(ex => ex?.name === name);
        return idx >= 0 ? remaining.splice(idx, 1)[0] : null;
      })
      .filter(Boolean)
      .concat(remaining);
  }
  return s;
}

function normalizeProgramCalibrationState(s) {
  const oldAthlete = s.athleteProfile || {};
  const oldBenchmarks = oldAthlete.benchmarkLifts || {};
  const benchmarks = defaultBenchmarkLifts();
  Object.keys(benchmarks).forEach(k => {
    benchmarks[k] = normalizeBenchmarkLift(oldBenchmarks[k]);
  });
  // Migrate legacy barbellCurl key → rdl
  if (oldBenchmarks.barbellCurl && !oldBenchmarks.rdl) benchmarks.rdl = normalizeBenchmarkLift(oldBenchmarks.barbellCurl);
  delete benchmarks.barbellCurl;

  const bw = oldAthlete.bodyweightKg ?? s.profile?.bodyweight ?? null;
  const bf = oldAthlete.bodyFatPercent ?? s.profile?.bodyFatPct ?? null;
  s.athleteProfile = {
    ...defaultAthleteProfile(),
    ...oldAthlete,
    bodyweightKg: bw,
    bodyFatPercent: bf,
    leanMassKg: oldAthlete.leanMassKg ?? leanMassKg(bw, bf),
    goal: normalizeGoal(oldAthlete.goal || s.cut?.mode || "cut"),
    trainingExperience: mapExperience(oldAthlete.trainingExperience || s.profile?.experienceLevel),
    recoveryProfile: oldAthlete.recoveryProfile || recoveryProfileFromInputs(s.profile || {}),
    benchmarkLifts: benchmarks,
  };
  const kcal = s.cut?.p1Kcal ?? null;
  const protein = s.cut?.proteinFloor ?? null;
  s.dietProfile = {
    calorieTarget: kcal,
    proteinTarget: protein,
    carbTarget: kcal ? Math.round(kcal * 0.37 / 4) : null,
    fatTarget: kcal ? Math.round(kcal * 0.28 / 9) : null,
    weeklyWeightChangeTarget: null,
    source: "ascend",
    ...(s.dietProfile || {}),
  };
  s.healthSignals = { ...defaultHealthSignals(), ...(s.healthSignals || {}) };
  s.lifterAnalysis = {
    strengthBalance: {},
    bodyTrend: {},
    dietOutcome: {},
    fatigueRisks: [],
    progressionDrivers: [],
    recommendations: [],
    ...(s.lifterAnalysis || {}),
  };
  return s;
}

function migrateState(s) {
  if (!s) return s;
  // Guard top-level objects that older backups may be missing entirely
  if (!s.cut)     s.cut     = {};
  if (!s.profile) s.profile = {};
  if (!s.exercises || typeof s.exercises !== "object") s.exercises = { PUSH: [], PULL: [], ARMS: [], LEGS: [] };
  if (!Array.isArray(s.sessions))  s.sessions  = [];
  if (!Array.isArray(s.dailyLogs)) s.dailyLogs = [];
  if (!Array.isArray(s.runSessions)) s.runSessions = [];
  if (!s.timer)        s.timer        = { compoundSec: 180, midSec: 120, isolationSec: 90, sound: true };
  if (!Array.isArray(s.measurements))  s.measurements  = [];
  if (!Array.isArray(s.customFoods))   s.customFoods   = [];
  if (s.onboarded === undefined) s.onboarded = (s.sessions?.length > 0 || s.dailyLogs?.length > 0);
  if (!s.cut.mode)     s.cut.mode     = "cut";
  if (s.profile.name === undefined)          s.profile.name = "";
  if (s.profile.height === undefined)        s.profile.height = null;
  if (s.profile.sex === undefined)           s.profile.sex = null;
  if (s.profile.age === undefined)           s.profile.age = null;
  if (s.profile.activityLevel === undefined) s.profile.activityLevel = "moderate";
  if (s.profile.stepGoal === undefined)      s.profile.stepGoal = 10000;
  if (s.profile.bodyFatPct === undefined)    s.profile.bodyFatPct = null;
  if (s.profile.trainingGoal === undefined)  s.profile.trainingGoal = "hypertrophy";
  if (s.profile.experienceLevel === undefined) s.profile.experienceLevel = "intermediate";
  if (s.profile.knowledgeLevel === undefined)  s.profile.knowledgeLevel = "intermediate";
  if (s.profile.trainingDays === undefined)    s.profile.trainingDays = 4;
  if (s.profile.lifestyleStress === undefined) s.profile.lifestyleStress = "moderate";
  if (s.profile.sleepHours === undefined)      s.profile.sleepHours = 7;
  if (s.profile.sportsActivity === undefined)  s.profile.sportsActivity = "moderate";
  if (s.profile.recommendedSplit === undefined) s.profile.recommendedSplit = "PPAL";
  if (s.profile.programTemplate === undefined)  s.profile.programTemplate = "balanced_hypertrophy";
  if (s.profile.trainingProgramStartedAt === undefined) s.profile.trainingProgramStartedAt = s.profile.programStart || todayISO();
  if (s.profile.dietProgramStartedAt === undefined)     s.profile.dietProgramStartedAt = s.profile.programStart || todayISO();
  delete s.profile.skipDeloadNext;
  // Per-session new fields: durationSec (number|null), swappedExercises (object), notes (string)
  s.sessions = (s.sessions || []).map(sess => ({
    durationSec: null,
    swappedExercises: {},
      exerciseNames: [],
      exerciseKeys: [],
      notes: null,
      techniques: [],
      ...sess,
    }));
  // Per dailyLog new fields; also rename runKm → steps for upgraders
  // Also add meals array if missing
  s.dailyLogs = (s.dailyLogs || []).map(d => {
    const migrated = { runKm: null, recovery: null, ...d };
    // Rename: if old runKm exists but steps doesn't, convert it
    if (migrated.steps === undefined) {
      migrated.steps = migrated.runKm != null
        ? Math.round(migrated.runKm * 1312) // rough: 1km ≈ 1312 steps
        : null;
    }
    delete migrated.runKm;
    if (!Array.isArray(migrated.meals)) migrated.meals = [];
    if (migrated.waterMl === undefined) migrated.waterMl = null;
    if (migrated.restDay === undefined) migrated.restDay = false;
    if (migrated.sleepOk === undefined) migrated.sleepOk = migrated.habits?.sleep ?? null;
    if (migrated.bodyFatPercent === undefined) migrated.bodyFatPercent = migrated.bodyFatPct ?? null;
    if (migrated.leanMassKg === undefined) migrated.leanMassKg = leanMassKg(migrated.weight, migrated.bodyFatPercent);
    return migrated;
  });
  s.runSessions = s.runSessions
    .map(run => typeof normalizeRunSession === "function" ? normalizeRunSession(run) : run)
    .filter(run => run && run.date && Number(run.distanceKm) >= 0 && Number(run.durationSec) >= 0);
  if (typeof normalizeWeeklyPlannerState === "function") {
    try {
      normalizeWeeklyPlannerState(s);
    } catch (error) {
      console.error("Weekly planner migration disabled for this startup", error);
      s.weeklyPlanner = { version: 1, enabled: false, status: "draft", preferences: {}, items: [], revision: 0 };
    }
  }
  if (typeof migrateNutritionCoachState === "function") {
    try {
      s = migrateNutritionCoachState(s);
    } catch (error) {
      console.error("Adaptive nutrition migration disabled for this startup", error);
      s.nutritionCoach = {
        version: 1,
        enabled: false,
        recovery: { active: false, startedAt: null, reason: null },
        reviews: [],
        lastDecision: "Adaptive plan needs to be restarted from Adjust Goal.",
      };
    }
  }
  if (!s.repRangeCounters)        s.repRangeCounters = {};
  if (!s.exerciseMuscleActivations) s.exerciseMuscleActivations = {};
  if (!s.pendingProgramChanges)   s.pendingProgramChanges = {};
  if (s.lastMrvSwap === undefined) s.lastMrvSwap = null;
  if (!s.adaptive_state) {
    s.adaptive_state = { version: 1, exerciseMemory: {}, muscleMemory: {}, fatigue: {}, decisions: [] };
  }
  if (!s.adaptive_state.exerciseMemory) s.adaptive_state.exerciseMemory = {};
  if (!s.adaptive_state.muscleMemory)   s.adaptive_state.muscleMemory = {};
  if (!s.adaptive_state.fatigue)        s.adaptive_state.fatigue = {};
  if (!Array.isArray(s.adaptive_state.decisions)) s.adaptive_state.decisions = [];
  s.adaptive_state.version = 1;
  s = normalizeExerciseProgramNamesAndOrder(s);
  s = normalizeProgramCalibrationState(s);
  Object.keys(s.exercises || {}).forEach(day => {
    (s.exercises[day] || []).forEach(ex => {
      if (ex?.name && !ex.exerciseKey) ex.exerciseKey = exerciseKeyFor(ex);
    });
  });
  s.sessions = (s.sessions || []).map(sess => {
    const names = Array.isArray(sess.exerciseNames) ? sess.exerciseNames.slice() : [];
    const keys = Array.isArray(sess.exerciseKeys) ? sess.exerciseKeys.slice() : [];
    (sess.sets || []).forEach((_, idx) => {
      const swap = sess.swappedExercises?.[idx];
      const base = s.exercises?.[sess.day]?.[idx];
      if (!names[idx]) names[idx] = swap?.name || base?.name || "";
      if (!keys[idx]) keys[idx] = exerciseKeyFor(swap?.exerciseKey || swap?.name || names[idx] || base);
      if (swap && !swap.exerciseKey) swap.exerciseKey = keys[idx];
    });
    return { ...sess, exerciseNames: names, exerciseKeys: keys };
  });

  // Backfill working maxes for REALIZATION sessions that were saved before setWorkingMax existed.
  // For each day, find REALIZATION sessions (waveWeek = ((sessionIndex) % 4) === 2, 0-indexed)
  // and compute the WM from the lead lift AMRAP if not already stored.
  const DAY_LIST = ["PUSH", "PULL", "ARMS", "LEGS"];
  DAY_LIST.forEach(day => {
    const daySessions = (s.sessions || [])
      .filter(sess => sess.day === day)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : ((parseInt(a.id.replace(/^s-/,""))||0) - (parseInt(b.id.replace(/^s-/,""))||0));
      });

    const exs = s.exercises?.[day] || [];
    const leadIdx = exs.findIndex(e => e.leadLift === true);
    const li = leadIdx >= 0 ? leadIdx : 0;
    const ex = exs[li];
    if (!ex) return;

    const wmKey = `wm_${day}_${li}`;
    const storedWM = s.profile[wmKey];
    // Skip only if already set to something different from ex.start
    // (ex.start as WM = bad initialization — we should fix it from session data)
    // Find the last REALIZATION session (waveWeek 3 = session index 2, 6, 10...)
    // waveWeek = ((sessionNumber-1) % 4) + 1, so REALIZATION = waveWeek 3 → (n-1)%4 === 2
    for (let i = daySessions.length - 1; i >= 0; i--) {
      const waveWeek = ((i) % 4) + 1; // i is 0-indexed session index
      if (waveWeek !== 3) continue; // not REALIZATION
      const sess = daySessions[i];
      const sets = sess.sets?.[li];
      if (!sets) break;
      const amrapReps = sets.s2r ?? 0;
      const amrapW = sets.s2w ?? 0;
      if (!amrapW || amrapReps === 0) break;
      // Juggernaut TM: AMRAP → 1RM (Epley) → TM = 90% of 1RM
      const rpe = sess.rpe?.[li]?.s2 ?? null;
      const effectiveReps = amrapReps + (rpe != null && rpe <= 8 ? 2 : rpe === 9 ? 1 : 0);
      const epleyOneRm = amrapW * (1 + effectiveReps / 30);
      const inc = typeof incrementFor === "function" ? incrementFor(ex) : 2.5;
      let computedWM = Math.round((epleyOneRm * 0.90) / inc) * inc;
      const targetReps = JUG_TM_PCTS?.REALIZATION?.reps || ex.repMin || 1;
      if (storedWM && effectiveReps > targetReps + 1) {
        const repsOverTarget = effectiveReps - targetReps;
        const bonusSteps = Math.min(4, Math.max(1, Math.floor(repsOverTarget / 3) + 1));
        computedWM = Math.max(computedWM, Math.round((storedWM + bonusSteps * inc) / inc) * inc);
      }
      // Only set if sensible (greater than zero, not inflated from ex.start)
      if (computedWM > 0 && (!storedWM || computedWM > storedWM) && (!storedWM || computedWM <= storedWM * 1.25)) {
        s.profile[wmKey] = computedWM;
      }
      break; // only use the most recent REALIZATION
    }
  });

  s.v = 2;
  return s;
}
