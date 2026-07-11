// Developer-only mock data builder for Ascend calculation checks.
// This file is inert by itself; src/dev/dev-tools.js exposes guarded commands.
(function() {
  const DAY_SEQUENCE = ["PUSH", "PULL", "ARMS", "LEGS"];

  const MOCK_EXERCISES = {
    PUSH: [
      { name: "Smith Incline Bench Press", repMin: 5, repMax: 8, start: 80, leadLift: true, equipment: "smith" },
      { name: "Smith Seated OHP", repMin: 6, repMax: 8, start: 62.5, equipment: "smith" },
      { name: "Machine Chest Press (Flat)", repMin: 8, repMax: 12, start: 55, equipment: "machine" },
      { name: "DB Lateral Raise", repMin: 15, repMax: 25, start: 10, equipment: "dumbbell" },
      { name: "Cable Lateral Raise (1-arm)", repMin: 12, repMax: 20, start: 8, equipment: "cable" },
      { name: "Incline DB Fly / Cable Fly", repMin: 12, repMax: 18, start: 14, equipment: "dumbbell" },
      { name: "Cable OH Tricep Extension", repMin: 10, repMax: 15, start: 25, equipment: "cable" },
      { name: "Tricep Pushdown (rope)", repMin: 15, repMax: 25, start: 30, equipment: "cable" }
    ],
    PULL: [
      { name: "Chest Supported Row", repMin: 6, repMax: 8, start: 72.5, leadLift: true, equipment: "machine" },
      { name: "Weighted Pull-up", repMin: 5, repMax: 8, start: 10, equipment: "bodyweight" },
      { name: "Lat Pulldown (pronated)", repMin: 8, repMax: 12, start: 62.5, equipment: "cable" },
      { name: "Seated Cable Row (wide)", repMin: 8, repMax: 12, start: 57.5, equipment: "cable" },
      { name: "Straight Arm Pulldown", repMin: 12, repMax: 20, start: 30, equipment: "cable" },
      { name: "Face Pull (cable)", repMin: 15, repMax: 25, start: 22.5, equipment: "cable" },
      { name: "DB Hammer Curl", repMin: 10, repMax: 15, start: 16, equipment: "dumbbell" }
    ],
    ARMS: [
      { name: "Close Grip Bench Press", repMin: 5, repMax: 8, start: 75, leadLift: true, equipment: "barbell" },
      { name: "EZ Bar Preacher Curl", repMin: 8, repMax: 12, start: 32.5, equipment: "barbell" },
      { name: "EZ Bar Skull Crusher", repMin: 8, repMax: 12, start: 35, equipment: "barbell" },
      { name: "Cable Curl", repMin: 10, repMax: 15, start: 27.5, equipment: "cable" },
      { name: "Dual Rope Pushdown", repMin: 12, repMax: 20, start: 32.5, equipment: "cable" },
      { name: "Reverse Curl", repMin: 12, repMax: 18, start: 22.5, equipment: "barbell" },
      { name: "Standing Cable Crunch", repMin: 12, repMax: 20, start: 35, equipment: "cable" }
    ],
    LEGS: [
      { name: "Hack Squat", repMin: 5, repMax: 8, start: 120, leadLift: true, equipment: "machine" },
      { name: "Romanian Deadlift", repMin: 6, repMax: 10, start: 95, equipment: "barbell" },
      { name: "Leg Press", repMin: 10, repMax: 15, start: 180, equipment: "machine" },
      { name: "Leg Extension", repMin: 12, repMax: 20, start: 45, equipment: "machine" },
      { name: "Seated Leg Curl", repMin: 10, repMax: 15, start: 50, equipment: "machine" },
      { name: "Standing Calf Raise", repMin: 10, repMax: 20, start: 70, equipment: "machine" },
      { name: "Hanging Leg Raise", repMin: 8, repMax: 15, start: 0, equipment: "bodyweight" }
    ]
  };

  const LEAD_TMS = { PUSH: 100, PULL: 122.5, ARMS: 127.5, LEGS: 210 };
  const SESSION_COUNTS = { PUSH: 1, PULL: 6, ARMS: 7, LEGS: 5 };
  const START_OFFSETS = { PUSH: 0, PULL: 1, ARMS: 2, LEGS: 3 };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isoDaysAgo(daysAgo, anchorIso) {
    const parts = String(anchorIso).split("-").map(Number);
    const d = new Date(Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1));
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  function roundToNearest(value, inc) {
    return Math.round(value / inc) * inc;
  }

  function keyFor(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().replace(/\s+/g, "_");
  }

  function waveForSessionNum(n) {
    const waves = [
      { name: "ACCUMULATION", pct: 0.60, reps: 10 },
      { name: "INTENSIFICATION", pct: 0.70, reps: 8 },
      { name: "REALIZATION", pct: 0.775, reps: 5 },
      { name: "DELOAD", pct: 0.50, reps: 5 }
    ];
    return waves[(n - 1) % 4];
  }

  function warmupFor(day, mode, date, signals) {
    const movementNames = {
      PUSH: ["Face Pull", "DB External Rotation", "Scap Push-Up / Protraction"],
      PULL: ["Straight-Arm Pulldown", "Scapular Row / Shrug", "Cable Curl"],
      ARMS: ["Triceps Pressdown", "Cable Curl", "Reverse Curl"],
      LEGS: ["Hamstring Curl", "Glute Bridge / Hip Thrust", "Dead Bug"]
    }[day];
    const count = mode === "minimal" ? 2 : 3;
    return {
      type: "warmup",
      method: "targeted_warmup",
      id: `mock-warmup-${day.toLowerCase()}-${date}`,
      date,
      day,
      mainLift: day === "LEGS" ? "squat" : day === "PUSH" || day === "ARMS" ? "bench" : "pull",
      dayFocus: day,
      leadExercise: MOCK_EXERCISES[day][0].name,
      rankedMuscles: [],
      mode,
      modeLabel: mode[0].toUpperCase() + mode.slice(1),
      rounds: mode === "minimal" ? 1 : 2,
      estimatedMin: mode === "minimal" ? "5-7" : mode === "complete" ? "10-14" : "7-10",
      trendSignals: signals || [],
      inputs: {},
      movements: movementNames.slice(0, count).map((name, idx) => ({
        id: `mock-${day.toLowerCase()}-${idx + 1}`,
        baseId: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        name,
        prescription: idx === 0 ? "15-20 reps" : "10-15 reps",
        purpose: "Mock targeted warm-up movement for calculation review.",
        equipment: ["cable", "machine", "bodyweight"],
        muscles: [],
        swapPool: [],
        effort: "Easy pump only. No fatigue."
      })),
      completion: [],
      rampSets: "Mock saved warm-up context; live ramp sets are generated by the engine.",
      rampCompleted: true,
      feedback: { postWarmupReadiness: "better", jointResponse: "same", saved: true }
    };
  }

  function accessorySet(ex, sessionNum, idx, day) {
    const inc = ex.equipment === "cable" ? 6 : 2.5;
    const base = Number(ex.start || 0);
    const waveBump = Math.floor((sessionNum - 1) / 2) * inc;
    let w = base + waveBump;
    let r1 = Math.min(ex.repMax, ex.repMin + ((sessionNum + idx) % Math.max(1, ex.repMax - ex.repMin + 1)));
    let r2 = Math.max(ex.repMin, r1 - ((sessionNum + idx) % 2));

    if (day === "PUSH" && sessionNum === 8 && idx === 3) {
      r1 = ex.repMax;
      r2 = ex.repMax;
    }
    if (day === "PULL" && sessionNum >= 5 && idx === 1) {
      w = base + inc;
      r1 = ex.repMin - 1;
      r2 = ex.repMin - 2;
    }
    if (day === "ARMS" && sessionNum === 7 && idx === 2) {
      r1 = ex.repMin + 1;
      r2 = null;
    }
    if (day === "LEGS" && sessionNum === 5 && idx === 1) {
      w = base + inc;
      r1 = ex.repMin;
      r2 = ex.repMin - 1;
    }
    return { s1w: roundToNearest(w, inc), s1r: r1, s2w: roundToNearest(w, inc), s2r: r2 };
  }

  function sessionFor(day, sessionNum, date) {
    const exs = MOCK_EXERCISES[day];
    const wave = waveForSessionNum(sessionNum);
    const leadW = roundToNearest(LEAD_TMS[day] * wave.pct, 2.5);
    const leadReps = wave.name === "REALIZATION" ? wave.reps + (day === "PULL" ? 1 : 3) : wave.reps;
    const sets = exs.map((ex, idx) => {
      if (idx === 0) return { s1w: leadW, s1r: wave.reps, s2w: leadW, s2r: leadReps };
      return accessorySet(ex, sessionNum, idx, day);
    });
    const rpe = exs.map((_, idx) => {
      let base = wave.name === "DELOAD" ? 6 : wave.name === "REALIZATION" ? 8.5 : 7.5;
      if (day === "PULL" && sessionNum >= 5) base = 9;
      if (day === "ARMS" && sessionNum === 7 && idx === 2) base = 8.5;
      if (day === "LEGS" && sessionNum === 5) base = 8.5;
      return { s1: Math.min(10, base), s2: sets[idx].s2r == null ? null : Math.min(10, base + 0.5) };
    });
    const extraSets = exs.map((_, idx) => {
      const addPushExtra = day === "PUSH" && sessionNum === 8 && idx === 3;
      const addArmExtra = day === "ARMS" && sessionNum === 6 && idx === 3;
      if (!addPushExtra && !addArmExtra) return { sets: [] };
      const set = sets[idx];
      return { sets: [{ weight: set.s1w, reps: Math.max(8, set.s1r - 2), rpe: addPushExtra ? 9 : 8, done: true, technique: "straight_set", source: "mock_extra" }] };
    });
    const warmupMode = sessionNum === 1 ? "standard" : wave.name === "DELOAD" ? "minimal" : sessionNum >= 5 && (day === "PULL" || day === "LEGS") ? "complete" : null;
    const swappedExercises = sessionNum === 4 && day === "PULL"
      ? { 3: { name: "Single Arm Cable Row", exerciseKey: keyFor("Single Arm Cable Row"), repMin: 8, repMax: 12, equipment: "cable", start: 42 } }
      : {};
    const exerciseNames = exs.map((ex, idx) => swappedExercises[idx]?.name || ex.name);
    const exerciseKeys = exerciseNames.map(keyFor);
    return {
      id: `mock-${day.toLowerCase()}-${String(sessionNum).padStart(2, "0")}`,
      day,
      date,
      sets,
      swappedExercises,
      exerciseNames,
      exerciseKeys,
      notes: sessionNum === 7 && day === "ARMS" ? "Skipped skull crusher set 2 after elbow tightness." : null,
      rpe,
      extraSets,
      techniques: exs.map(() => null),
      energyRating: null,
      feedback: {
        enjoyment: sessionNum >= 5 && day === "PULL" ? 2 : 4,
        pump: sessionNum === 1 ? 3 : 4,
        maxPain: day === "ARMS" && sessionNum >= 6 ? 3 : day === "LEGS" && sessionNum >= 5 ? 2 : 0,
        notes: null
      },
      warmup: warmupMode ? warmupFor(day, warmupMode, date, warmupMode === "complete" ? ["high RPE", "joint stress"] : ["mock saved mode"]) : null,
      durationSec: 3900 + sessionNum * 90
    };
  }

  function buildDailyLogs(anchorIso) {
    const logs = [];
    for (let daysAgo = 55; daysAgo >= 0; daysAgo--) {
      const date = isoDaysAgo(daysAgo, anchorIso);
      let weight = 87.4 - ((55 - daysAgo) * 0.055);
      let recovery = 7;
      let sleep = true;
      let protein = true;
      let kcal = 2180;
      let steps = 9800;

      if (daysAgo <= 42 && daysAgo >= 35) {
        recovery = 8;
        kcal = 2300;
        steps = 11200;
      }
      if (daysAgo <= 18 && daysAgo >= 12) {
        recovery = 3;
        sleep = false;
        kcal = 1850;
        steps = 13500;
        weight -= (18 - daysAgo) * 0.16;
      }
      if (daysAgo <= 3) {
        recovery = daysAgo === 0 ? 3 : 4;
        sleep = daysAgo > 1;
        kcal = 1900;
        steps = 12800;
        weight -= (3 - daysAgo) * 0.18;
      }

      logs.push({
        date,
        weight: Math.round(weight * 10) / 10,
        kcal,
        protein: protein ? 182 : 132,
        carbs: Math.round(kcal * 0.38 / 4),
        fat: Math.round(kcal * 0.27 / 9),
        steps,
        recovery,
        sleepOk: sleep,
        waterMl: sleep ? 3200 : 2300,
        meals: [],
        bodyFatPercent: 20.5,
        leanMassKg: null
      });
    }
    return logs;
  }

  function buildSessions(anchorIso) {
    const sessions = [];
    DAY_SEQUENCE.forEach(day => {
      const count = SESSION_COUNTS[day];
      for (let i = 1; i <= count; i++) {
        const daysAgo = START_OFFSETS[day] + ((count - i) * 7);
        sessions.push(sessionFor(day, i, isoDaysAgo(Math.max(0, daysAgo), anchorIso)));
      }
    });
    return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  function buildMockState(anchorIso) {
    const base = typeof freshDefaultState === "function" ? freshDefaultState() : clone(DEFAULT_STATE);
    const programStart = isoDaysAgo(56, anchorIso);
    const state = {
      ...base,
      v: 2,
      onboarded: true,
      devMockData: {
        active: true,
        name: "Ascend Phase 9 calculation sandbox",
        createdAt: new Date().toISOString(),
        anchorDate: anchorIso,
        version: 1
      },
      profile: {
        ...base.profile,
        name: "Dev Mock Lifter",
        sex: "male",
        age: 34,
        height: 178,
        bodyweight: 87.4,
        bodyFatPct: 20.5,
        activityLevel: "moderate",
        stepGoal: 10000,
        programStart,
        trainingProgramStartedAt: programStart,
        dietProgramStartedAt: programStart,
        trainingProgramSessionBaseline: { PUSH: 0, PULL: 0, ARMS: 0, LEGS: 0 },
        trainingGoal: "hypertrophy",
        experienceLevel: "intermediate",
        knowledgeLevel: "advanced",
        trainingDays: 4,
        lifestyleStress: "moderate",
        sleepHours: 7,
        sportsActivity: "moderate",
        deloadFactor: 0.925,
        progressionStep: 2.5,
        wm_PUSH_0: LEAD_TMS.PUSH,
        wm_PULL_0: LEAD_TMS.PULL,
        wm_ARMS_0: LEAD_TMS.ARMS,
        wm_LEGS_0: LEAD_TMS.LEGS
      },
      cut: {
        ...base.cut,
        mode: "cut",
        p1Target: 82,
        p1Weeks: 8,
        dbWeeks: 1.5,
        p2Target: 79.5,
        p2Weeks: 4,
        p1Kcal: 2100,
        dbKcal: 2900,
        p2Kcal: 1950,
        proteinFloor: 175,
        fastThreshold: 1.2,
        slowThreshold: 0.7
      },
      athleteProfile: {
        ...base.athleteProfile,
        bodyweightKg: 87.4,
        bodyFatPercent: 20.5,
        leanMassKg: 69.5,
        goal: "cut",
        programMode: "hypertrophy",
        trainingExperience: "intermediate",
        recoveryProfile: "average",
        blockWeek: 7,
        benchmarkLifts: {
          benchPress: { weightKg: 105, reps: 5, estimatedOneRm: 122.5 },
          squat: { weightKg: 150, reps: 5, estimatedOneRm: 175 },
          bentOverRow: { weightKg: 90, reps: 6, estimatedOneRm: 108 },
          deadlift: { weightKg: 170, reps: 4, estimatedOneRm: 192.7 },
          overheadPress: { weightKg: 62.5, reps: 5, estimatedOneRm: 72.9 },
          rdl: { weightKg: 120, reps: 6, estimatedOneRm: 144 }
        }
      },
      dietProfile: {
        calorieTarget: 2100,
        proteinTarget: 175,
        carbTarget: 200,
        fatTarget: 63,
        weeklyWeightChangeTarget: -0.85,
        source: "ascend-dev-mock"
      },
      healthSignals: {
        source: "manual",
        date: anchorIso,
        sleepHours: 5.5,
        sleepScore: 58,
        restingHR: 64,
        steps: 12800,
        activeCalories: 640,
        bodyweightKg: 83.8,
        bodyFatPercent: 20.5,
        leanMassKg: 66.6
      },
      exercises: clone(MOCK_EXERCISES),
      sessions: buildSessions(anchorIso),
      dailyLogs: buildDailyLogs(anchorIso),
      measurements: [
        { id: "mock-measure-1", date: isoDaysAgo(55, anchorIso), waistCm: 93, neckCm: 39, hipCm: 99, bodyFatPercent: 20.8 },
        { id: "mock-measure-2", date: isoDaysAgo(7, anchorIso), waistCm: 90.5, neckCm: 39, hipCm: 98, bodyFatPercent: 20.1 }
      ],
      customFoods: [
        { name: "Dev Chicken Rice Bowl", kcal_100g: 165, protein_100g: 16, carbs_100g: 18, fat_100g: 4, serving_g: 420, serving_label: "bowl" },
        { name: "Dev Whey Shake", kcal_100g: 380, protein_100g: 76, carbs_100g: 8, fat_100g: 5, serving_g: 35, serving_label: "scoop" }
      ],
      customExercises: [],
      repRangeCounters: {
        "PUSH:3": { hitTop: 2, missMin: 0 },
        "PULL:1": { hitTop: 0, missMin: 2 },
        "ARMS:2": { hitTop: 0, missMin: 1 },
        "LEGS:1": { hitTop: 0, missMin: 1 }
      },
      pendingProgramChanges: {
        PULL: [{ action: "hold", exIdx: 1, reason: "Mock repeated pull-up miss under high RPE." }],
        ARMS: [{ action: "reduce", exIdx: 2, reason: "Mock skipped set after elbow stress." }]
      },
      lastMrvSwap: null,
      adaptive_state: {
        version: 1,
        exerciseMemory: {},
        muscleMemory: {},
        fatigue: {},
        decisions: [
          { date: isoDaysAgo(18, anchorIso), action: "hold_load", reason: "Mock poor recovery week." },
          { date: isoDaysAgo(3, anchorIso), action: "reduce_warmup", reason: "Mock rapid weight drop while cutting." }
        ]
      },
      lifterAnalysis: { strengthBalance: {}, bodyTrend: {}, dietOutcome: {}, fatigueRisks: [], progressionDrivers: [], recommendations: [] },
      timer: { compoundSec: 180, midSec: 120, isolationSec: 90, sound: true }
    };

    return typeof migrateState === "function" ? migrateState(state) : state;
  }

  window.AscendMockData = {
    buildMockState,
    mockExercises: MOCK_EXERCISES,
    sessionCounts: SESSION_COUNTS
  };
})();
