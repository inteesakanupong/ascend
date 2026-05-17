// Targeted Warm-Up generation engine (Phase 8)
// method key: targeted_warmup — no 'Wenning' naming anywhere

function warmupTrendAnalysis(day = LIFT_DAY) {
  const allRecent = sortSessionsChronological([...STATE.sessions])
    .filter(s => s.date >= new Date(Date.now() - 21 * 86400000).toISOString().slice(0,10))
    .reverse(); // most recent first

  const daySessions = allRecent.filter(s => s.day === day).slice(0, 5);
  const leadIdx = getLeadLiftIdx(day);

  // ── RPE trend for this day ──
  let rpeSum = 0, rpeCount = 0;
  daySessions.forEach(s => {
    [s.rpe?.[leadIdx]?.s1, s.rpe?.[leadIdx]?.s2].forEach(v => {
      if (v != null) { rpeSum += v; rpeCount++; }
    });
  });
  const avgLeadRpe = rpeCount > 0 ? rpeSum / rpeCount : null;

  // ── Load progression: is the user progressing, stalling, or regressing? ──
  const leadWeights = daySessions.map(s => s.sets?.[leadIdx]?.s1w).filter(w => w != null);
  let loadTrend = "progressing"; // default
  if (leadWeights.length >= 3) {
    const diff01 = leadWeights[0] - leadWeights[1]; // most recent vs prev
    const diff12 = leadWeights[1] - leadWeights[2];
    if (diff01 === 0 && diff12 === 0) loadTrend = "stalled";
    else if (diff01 < 0 || diff12 < 0) loadTrend = "regressing";
  }

  // ── Pain history on this day ──
  const recentPain = daySessions.slice(0,3)
    .map(s => s.feedback?.maxPain ?? 0)
    .filter(Boolean);
  const avgPain = recentPain.length ? recentPain.reduce((a,b) => a+b, 0) / recentPain.length : 0;
  const painHistory = recentPain.length >= 2 && recentPain.every(p => p >= 2);

  // ── Recovery from daily logs ──
  const recentLogs = [...STATE.dailyLogs]
    .filter(d => d.recovery != null)
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const avgRecovery = recentLogs.length
    ? recentLogs.reduce((s,d) => s + d.recovery, 0) / recentLogs.length
    : null;

  // ── Wave context ──
  const wave = juggernautWave(0, day);
  const isDeload = wave.name === "DELOAD";
  const isRealization = wave.name === "REALIZATION";
  const isCutting = (STATE.cut?.mode || "cut") === "cut";

  // ── Systemic fatigue ──
  const fatigue = computeFatigueSummary(7);
  const highSystemicFatigue = fatigue.systemic > 60;
  const jointStress = {
    shoulder: fatigue.shoulderStress > 20,
    elbow: fatigue.elbowStress > 20,
    knee: fatigue.kneeStress > 20,
    spine: fatigue.spinal > 30,
  };

  // ── Derive auto mode ──
  let mode = "standard";
  if (isDeload || isCutting) mode = "minimal";
  else if (painHistory || highSystemicFatigue || (avgRecovery != null && avgRecovery < 4.5)) mode = "complete";
  else if (avgLeadRpe != null && avgLeadRpe > 8.5) mode = "complete";
  else if (loadTrend === "stalled" || loadTrend === "regressing") mode = "complete";
  else if (isRealization) mode = "minimal"; // peak week – don't pre-fatigue

  // ── Derive context note ──
  const signals = [];
  if (avgLeadRpe != null && avgLeadRpe > 8.3) signals.push(`avg RPE ${avgLeadRpe.toFixed(1)} last ${rpeCount} sets`);
  if (loadTrend === "stalled") signals.push("load stalled 3+ sessions");
  if (loadTrend === "regressing") signals.push("load regressing");
  if (avgRecovery != null && avgRecovery < 5) signals.push(`avg recovery ${avgRecovery.toFixed(1)}/10`);
  if (painHistory) signals.push("recurring pain reported");
  if (highSystemicFatigue) signals.push("high systemic fatigue load");
  if (isDeload) signals.push("deload week");
  if (isRealization) signals.push("realization/peak week");
  if (isCutting) signals.push("cutting phase");

  return {
    mode,
    avgLeadRpe,
    loadTrend,
    avgRecovery,
    avgPain,
    painHistory,
    highSystemicFatigue,
    jointStress,
    signals,
    wave,
    daySessions,
  };
}

// ── Select warm-up movements based on day + trend context ────────────────────
function selectWarmupMovements(day = LIFT_DAY, trend) {
  const mainLift = inferMainLiftType(day);
  const js = trend.jointStress;

  // Build candidate list by day/lift context
  let candidates = [];

  if (mainLift === "squat" || day === "LEGS") {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.hamstring_curl,
      WARMUP_MOVEMENT_LIBRARY.glute_bridge,
      WARMUP_MOVEMENT_LIBRARY.leg_extension,
      WARMUP_MOVEMENT_LIBRARY.dead_bug,
      WARMUP_MOVEMENT_LIBRARY.reverse_hyper,
      WARMUP_MOVEMENT_LIBRARY.tke,
      WARMUP_MOVEMENT_LIBRARY.ab_wheel,
    ];
    // Knee concern: deprioritize leg extension
    if (js.knee) candidates = [WARMUP_MOVEMENT_LIBRARY.glute_bridge, WARMUP_MOVEMENT_LIBRARY.hamstring_curl, WARMUP_MOVEMENT_LIBRARY.dead_bug, WARMUP_MOVEMENT_LIBRARY.calf_raise, WARMUP_MOVEMENT_LIBRARY.reverse_hyper];
    if (js.spine) candidates = [WARMUP_MOVEMENT_LIBRARY.glute_bridge, WARMUP_MOVEMENT_LIBRARY.dead_bug, WARMUP_MOVEMENT_LIBRARY.leg_extension, WARMUP_MOVEMENT_LIBRARY.tke];
  } else if (mainLift === "deadlift") {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.hamstring_curl,
      WARMUP_MOVEMENT_LIBRARY.glute_bridge,
      WARMUP_MOVEMENT_LIBRARY.dead_bug,
      WARMUP_MOVEMENT_LIBRARY.reverse_hyper,
      WARMUP_MOVEMENT_LIBRARY.rdl_light,
      WARMUP_MOVEMENT_LIBRARY.ab_wheel,
    ];
    if (js.spine) candidates = [WARMUP_MOVEMENT_LIBRARY.glute_bridge, WARMUP_MOVEMENT_LIBRARY.hamstring_curl, WARMUP_MOVEMENT_LIBRARY.dead_bug, WARMUP_MOVEMENT_LIBRARY.tke];
  } else if (mainLift === "bench" || (mainLift !== "overhead" && day === "PUSH")) {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.triceps_pressdown,
      WARMUP_MOVEMENT_LIBRARY.face_pull,
      WARMUP_MOVEMENT_LIBRARY.band_pull_apart,
      WARMUP_MOVEMENT_LIBRARY.scap_pushup,
      WARMUP_MOVEMENT_LIBRARY.ext_rotation,
      WARMUP_MOVEMENT_LIBRARY.lat_raise_light,
    ];
    if (js.shoulder) candidates = [WARMUP_MOVEMENT_LIBRARY.band_pull_apart, WARMUP_MOVEMENT_LIBRARY.ext_rotation, WARMUP_MOVEMENT_LIBRARY.scap_pushup, WARMUP_MOVEMENT_LIBRARY.face_pull];
    if (js.elbow) candidates = [WARMUP_MOVEMENT_LIBRARY.face_pull, WARMUP_MOVEMENT_LIBRARY.band_pull_apart, WARMUP_MOVEMENT_LIBRARY.scap_pushup, WARMUP_MOVEMENT_LIBRARY.ext_rotation];
  } else if (mainLift === "overhead") {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.ext_rotation,
      WARMUP_MOVEMENT_LIBRARY.band_pull_apart,
      WARMUP_MOVEMENT_LIBRARY.face_pull,
      WARMUP_MOVEMENT_LIBRARY.lat_raise_light,
      WARMUP_MOVEMENT_LIBRARY.triceps_pressdown,
      WARMUP_MOVEMENT_LIBRARY.scap_pushup,
    ];
    if (js.shoulder) candidates = [WARMUP_MOVEMENT_LIBRARY.ext_rotation, WARMUP_MOVEMENT_LIBRARY.band_pull_apart, WARMUP_MOVEMENT_LIBRARY.scap_pushup, WARMUP_MOVEMENT_LIBRARY.arm_circle];
  } else if (day === "PULL") {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.straight_arm_pd,
      WARMUP_MOVEMENT_LIBRARY.face_pull,
      WARMUP_MOVEMENT_LIBRARY.scap_row,
      WARMUP_MOVEMENT_LIBRARY.cable_curl,
      WARMUP_MOVEMENT_LIBRARY.band_pull_apart,
      WARMUP_MOVEMENT_LIBRARY.reverse_curl,
    ];
    if (js.elbow) candidates = [WARMUP_MOVEMENT_LIBRARY.straight_arm_pd, WARMUP_MOVEMENT_LIBRARY.scap_row, WARMUP_MOVEMENT_LIBRARY.face_pull, WARMUP_MOVEMENT_LIBRARY.band_pull_apart];
    if (js.shoulder) candidates = [WARMUP_MOVEMENT_LIBRARY.scap_row, WARMUP_MOVEMENT_LIBRARY.face_pull, WARMUP_MOVEMENT_LIBRARY.straight_arm_pd, WARMUP_MOVEMENT_LIBRARY.band_pull_apart];
  } else if (day === "ARMS") {
    candidates = [
      WARMUP_MOVEMENT_LIBRARY.triceps_pressdown,
      WARMUP_MOVEMENT_LIBRARY.cable_curl,
      WARMUP_MOVEMENT_LIBRARY.reverse_curl,
      WARMUP_MOVEMENT_LIBRARY.face_pull,
      WARMUP_MOVEMENT_LIBRARY.band_pull_apart,
    ];
    if (js.elbow) candidates = [WARMUP_MOVEMENT_LIBRARY.face_pull, WARMUP_MOVEMENT_LIBRARY.band_pull_apart, WARMUP_MOVEMENT_LIBRARY.arm_circle];
  }

  // Fallback: bodyweight-safe options
  if (!candidates.length) {
    candidates = [WARMUP_MOVEMENT_LIBRARY.inchworm, WARMUP_MOVEMENT_LIBRARY.dead_bug, WARMUP_MOVEMENT_LIBRARY.arm_circle];
  }

  // Pick top 3
  const count = trend.mode === "minimal" ? 2 : 3;
  const selected = candidates.slice(0, count);

  // Build swap pool for each selected: same muscle, different equipment (up to 3 options)
  return selected.map((m, idx) => {
    const swapPool = Object.values(WARMUP_MOVEMENT_LIBRARY)
      .filter(alt =>
        alt.id !== m.id &&
        alt.muscles.some(mu => m.muscles.includes(mu)) &&
        !selected.some((sel, si) => si !== idx && sel.id === alt.id)
      )
      .slice(0, 3);
    return {
      ...m,
      id: `${day.toLowerCase()}_${idx + 1}_${m.id}`,
      baseId: m.id,
      swapPool,
      effort: trend.mode === "pain_adjusted" || trend.jointStress.shoulder || trend.jointStress.knee
        ? "Easy range only. Stop if symptoms worsen."
        : "Easy pump only. No fatigue.",
    };
  });
}

// ── Build ramp set prescription from working weight ──────────────────────────
function buildRampSets(day = LIFT_DAY, trend) {
  const exercises = STATE.exercises?.[day] || [];
  const leadIdx = getLeadLiftIdx(day);
  const leadEx = exercises[leadIdx];
  if (!leadEx) return "2–4 easy ramp sets, progressively building to working weight.";

  const prog = progressionFor(day, leadIdx);
  const workWeight = prog?.weight;
  const mainLift = inferMainLiftType(day);

  // In minimal/pain mode: fewer ramps
  if (trend.mode === "minimal") {
    if (!workWeight) return "2 easy ramp sets up to working weight.";
    const ramp1 = Math.round(workWeight * 0.50 / 2.5) * 2.5;
    const ramp2 = Math.round(workWeight * 0.75 / 2.5) * 2.5;
    return `2 ramp sets: ${ramp1}kg × 5, ${ramp2}kg × 3, then ${workWeight}kg working sets.`;
  }

  // Standard / complete: 3–4 ramps
  if (!workWeight) return "3–4 easy ramp sets building progressively to working weight. Start at ~40%, add load each set.";
  const ramp1 = Math.round(workWeight * 0.40 / 2.5) * 2.5;
  const ramp2 = Math.round(workWeight * 0.60 / 2.5) * 2.5;
  const ramp3 = Math.round(workWeight * 0.80 / 2.5) * 2.5;
  const extra = trend.mode === "complete"
    ? `, ${Math.round(workWeight * 0.90 / 2.5) * 2.5}kg × 2`
    : "";
  return `Ramp sets: ${ramp1}kg × 8 (bar speed), ${ramp2}kg × 5, ${ramp3}kg × 3${extra}, then ${workWeight}kg working sets.`;
}

// ── Main build function ───────────────────────────────────────────────────────
function buildTargetedWarmup() {
  const trend = warmupTrendAnalysis(LIFT_DAY);
  const movements = selectWarmupMovements(LIFT_DAY, trend);
  const rounds = trend.mode === "minimal" ? 1 : 2;
  const rampSets = buildRampSets(LIFT_DAY, trend);
  const leadName = STATE.exercises?.[LIFT_DAY]?.[getLeadLiftIdx(LIFT_DAY)]?.name || LIFT_DAY;
  const estimatedMin = trend.mode === "minimal" ? "5–7" : trend.mode === "complete" ? "10–14" : "7–10";

  const modeLabels = { minimal: "Minimal", standard: "Standard", complete: "Complete", pain_adjusted: "Pain Adjusted" };

  return {
    type: "warmup",
    method: TARGETED_WARMUP_METHOD,
    id: `tw-${Date.now()}`,
    date: LIFT_DRAFT?.date || todayISO(),
    day: LIFT_DAY,
    mainLift: inferMainLiftType(LIFT_DAY),
    dayFocus: LIFT_DAY,
    leadExercise: leadName,
    rankedMuscles: [],
    mode: trend.mode,
    modeLabel: modeLabels[trend.mode] || trend.mode,
    rounds,
    estimatedMin,
    trendSignals: trend.signals,
    inputs: {}, // no manual inputs needed
    movements,
    completion: movements.flatMap(m =>
      Array.from({ length: rounds }, (_, i) => ({
        movementId: m.id,
        round: i + 1,
        completed: false,
      }))
    ),
    rampSets,
    rampCompleted: false,
    feedback: { postWarmupReadiness: null, jointResponse: null, saved: false },
  };
}

function inferMainLiftType(day = LIFT_DAY) {
  const ex = STATE.exercises?.[day]?.[getLeadLiftIdx(day)] || {};
  const name = normalizeExerciseName(ex.name || "");
  if (name.includes("deadlift") || name.includes("rdl")) return "deadlift";
  if (name.includes("overhead") || name.includes("ohp") || name.includes("shoulder press")) return "overhead";
  if (name.includes("bench") || name.includes("press")) return "bench";
  if (name.includes("squat") || name.includes("leg press")) return "squat";
  if (day === "PUSH") return "bench";
  if (day === "LEGS") return "squat";
  if (day === "PULL") return "pull";
  if (day === "ARMS") return "arms";
  return "squat";
}

function ensureTargetedWarmupDraft() {
  if (!LIFT_DRAFT) return null;
  if (!LIFT_DRAFT.targetedWarmup) LIFT_DRAFT.targetedWarmup = buildTargetedWarmup();
  return LIFT_DRAFT.targetedWarmup;
}

function targetedWarmupComplete(warmup) {
  if (!warmup) return false;
  const circuitDone = (warmup.completion || []).every(c => c.completed);
  const rampDone = !!warmup.rampCompleted;
  const assessmentDone = !!warmup.feedback?.saved
    && !!warmup.feedback?.postWarmupReadiness
    && !!warmup.feedback?.jointResponse;
  return circuitDone && rampDone && assessmentDone;
}

function targetedWarmupWarning(warmup) {
  if (!warmup?.feedback?.saved) return "";
  const r = warmup.feedback.postWarmupReadiness;
  const j = warmup.feedback.jointResponse;
  if (r === "more_tired" && j === "worse") return "Readiness and joints both worsened during warm-up. Keep today's session conservative — reduce load 5–10%, skip intensification techniques.";
  if (r === "more_tired") return "Feeling more tired post warm-up. Proceed conservatively — no extra volume today.";
  if (j === "worse") return "Joint response worsened during warm-up. Avoid heavy singles and grinding reps today.";
  return "";
}

function savedTargetedWarmup(warmup) {
  if (!warmup) return null;
  return {
    type: "warmup",
    method: TARGETED_WARMUP_METHOD,
    id: warmup.id,
    date: warmup.date,
    day: warmup.day,
    mainLift: warmup.mainLift,
    dayFocus: warmup.dayFocus,
    leadExercise: warmup.leadExercise,
    rankedMuscles: Array.isArray(warmup.rankedMuscles) ? [...warmup.rankedMuscles] : [],
    mode: warmup.mode,
    modeLabel: warmup.modeLabel || warmup.mode,
    rounds: warmup.rounds,
    estimatedMin: warmup.estimatedMin,
    trendSignals: Array.isArray(warmup.trendSignals) ? [...warmup.trendSignals] : [],
    inputs: { ...(warmup.inputs || {}) },
    movements: (warmup.movements || []).map(m => ({ ...m, swapPool: (m.swapPool || []).map(s => ({...s})) })),
    completion: (warmup.completion || []).map(c => ({ ...c })),
    rampSets: warmup.rampSets,
    rampCompleted: !!warmup.rampCompleted,
    feedback: { ...(warmup.feedback || {}) },
  };
}


