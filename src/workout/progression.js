// Lead-lift and accessory progression logic

function isBodyweightExercise(ex) {
  if (!ex) return false;
  const eq = detectEquipment(ex.name, ex);
  return eq === "bodyweight";
}

function incrementFor(ex) {
  const eq = detectEquipment(ex.name, ex);
  if (eq === "cable") return 6;
  return 2.5;
}

function trainingSessionsForDay(day) {
  const baseline = STATE.profile.trainingProgramSessionBaseline?.[day];
  if (Number.isFinite(baseline)) {
    return sortSessionsChronological((STATE.sessions || []).filter(s => s.day === day)).slice(baseline);
  }
  const start = trainingProgramStartDate();
  return (STATE.sessions || []).filter(s => s.day === day && (!start || s.date >= start));
}

function sortSessionsChronological(list) {
  return [...(list || [])].sort((a, b) => {
    const dateCmp = (a.date || "").localeCompare(b.date || "");
    if (dateCmp !== 0) return dateCmp;
    const aTs = parseInt(String(a.id || "").replace(/^s-/, "")) || 0;
    const bTs = parseInt(String(b.id || "").replace(/^s-/, "")) || 0;
    return aTs - bTs;
  });
}

function isLeadLift(day, idx) {
  const exs = STATE.exercises[day] || [];
  // If any exercise has explicit leadLift flag, use that
  const flaggedIdx = exs.findIndex(e => e.leadLift === true);
  if (flaggedIdx >= 0) return idx === flaggedIdx;
  // Otherwise fall back to first exercise (idx 0)
  return idx === 0;
}

function getLeadLiftIdx(day) {
  const exs = STATE.exercises[day] || [];
  const flaggedIdx = exs.findIndex(e => e.leadLift === true);
  return flaggedIdx >= 0 ? flaggedIdx : 0;
}

function leadTmPrescription(ex, wave, TM, lastStr = null) {
  const tmPct = JUG_TM_PCTS[wave.name] || JUG_TM_PCTS.ACCUMULATION;
  const tmWeight = roundToIncrement(TM * tmPct.pct, ex);
  const tmReps = tmPct.reps;
  const tmNote = `TM: ${fmtWeight(TM)}kg × ${Math.round(tmPct.pct * 100)}% = ${fmtWeight(tmWeight)}kg`;

  if (wave.name === "DELOAD") {
    return {
      verdict: "DELOAD_WAVE",
      weight: tmWeight,
      reps: tmReps,
      last: lastStr,
      trainingMax: TM,
      note: `Deload week — ${tmNote}. Stay RPE 5-6, feel fresh.`,
      wavePhase: "DELOAD"
    };
  }

  if (wave.name === "REALIZATION") {
    return {
      verdict: "REALIZE",
      weight: tmWeight,
      reps: tmReps,
      last: lastStr,
      trainingMax: TM,
      note: `${tmNote}. AMRAP on final set — push to 1-2 RIR. This result sets your new Training Max.`,
      wavePhase: "REALIZATION"
    };
  }

  if (wave.name === "ACCUMULATION") {
    return {
      verdict: "BEAT",
      weight: tmWeight,
      reps: tmReps,
      last: lastStr,
      trainingMax: TM,
      note: `${tmNote}. Accumulation — high reps, submaximal effort. Leave 3+ reps in tank.`,
      wavePhase: "ACCUMULATION"
    };
  }

  return {
    verdict: "BEAT",
    weight: tmWeight,
    reps: tmReps,
    last: lastStr,
    trainingMax: TM,
    note: `${tmNote}. Intensification — push to RPE 7-8. Leave 1-2 reps in tank.`,
    wavePhase: "INTENSIFICATION"
  };
}

function exerciseHistoryFor(day, exIdx, ex, opts = {}) {
  const daySessions = sortSessionsChronological(trainingSessionsForDay(day));
  const key = exerciseKeyFor(ex);
  const exactEntries = [];
  daySessions.forEach(s => {
    (s.sets || []).forEach((set, idx) => {
      const completed = completedSessionSet(s, idx);
      if ((completed.s1r != null || completed.s2r != null) && sessionExerciseMatches(s, idx, ex)) {
        exactEntries.push({ session: s, idx, set: completed });
      }
    });
  });
  const allowSlotFallback = opts.allowSlotFallback !== false;
  const fallbackEntries = exactEntries.length || !allowSlotFallback
    ? []
    : daySessions
        .filter(s => s.sets?.[exIdx]?.s1r != null)
        .map(s => ({ session: s, idx: exIdx, set: completedSessionSet(s, exIdx) }))
        .filter(e => e.set.s1r != null || e.set.s2r != null);
  const entries = exactEntries.length ? exactEntries : fallbackEntries;
  return {
    key,
    entries,
    sessions: entries.map(e => e.session),
    source: exactEntries.length ? "exerciseKeyAnySlot" : fallbackEntries.length ? "legacySlotFallback" : "none"
  };
}

function progressionFor(day, exIdx) {
  const ex = activeExerciseForSlot(day, exIdx) || STATE.exercises[day][exIdx];
  const inc = incrementFor(ex);
  const isLead = isLeadLift(day, exIdx);
  const wave = juggernautWave(0, day);

  const history = exerciseHistoryFor(day, exIdx, ex, { allowSlotFallback: !isActiveExerciseSwapped(day, exIdx) });
  const entries = history.entries || [];
  const sessions = history.sessions;
  const withIdentity = result => ({ ...result, exerciseKey: history.key, historySource: history.source });

  // ── First session ever for this day
  if (sessions.length === 0) {
    if (isLead) {
      // PHASE 1 FIX: Lead lifts must NEVER fall back to accessory rep logic.
      const storedTM = isActiveExerciseSwapped(day, exIdx) ? null : getWorkingMax(day, exIdx);
      if (storedTM) return withIdentity(leadTmPrescription(ex, wave, storedTM));
      // No TM stored: infer from start weight so JTM reps are always correct
      const startWeight = defaultStartWeightForExercise(ex);
      const inferredTM = startWeight ? roundToIncrement(startWeight / 0.60, ex) : null;
      if (inferredTM) return withIdentity(leadTmPrescription(ex, wave, inferredTM, null));
      // Absolute fallback: use JTM reps even if weight is unknown
      const tmPctData = JUG_TM_PCTS[wave.name] || JUG_TM_PCTS.ACCUMULATION;
      return withIdentity({ verdict: "START", weight: startWeight || 20, reps: tmPctData.reps, last: null,
               note: "Lead lift — set a working max in Profile for accurate JTM prescriptions. Using start weight as estimate.",
               wavePhase: wave.name });
    }
    return withIdentity({ verdict: "START", weight: defaultStartWeightForExercise(ex), reps: ex.repMin, last: null,
             note: "First session — start moderate, leave 2-3 reps in reserve." });
  }

  const lastEntry = entries[entries.length - 1];
  const last = lastEntry?.set;
  const lastSession = lastEntry?.session || sessions[sessions.length - 1];
  const lastIdx = lastEntry?.idx ?? exIdx;
  if (!last || last.s1r == null) {
    if (isLead) {
      // PHASE 1 FIX: Lead lift with missing set data must still use JTM, not accessory fallback.
      const storedTM = isActiveExerciseSwapped(day, exIdx) ? null : getWorkingMax(day, exIdx);
      if (storedTM) return withIdentity(leadTmPrescription(ex, wave, storedTM));
      const startWeight = defaultStartWeightForExercise(ex);
      const inferredTM = startWeight ? roundToIncrement(startWeight / 0.60, ex) : null;
      if (inferredTM) return withIdentity(leadTmPrescription(ex, wave, inferredTM, null));
      const tmPctData = JUG_TM_PCTS[wave.name] || JUG_TM_PCTS.ACCUMULATION;
      return withIdentity({ verdict: "START", weight: startWeight || 20, reps: tmPctData.reps, last: null,
               note: "Lead lift — no set data. Set working max in Profile for accurate JTM prescriptions.",
                wavePhase: wave.name });
    }
    return withIdentity({ verdict: "START", weight: defaultStartWeightForExercise(ex), reps: ex.repMin, last: null,
             note: "No set data — start moderate, leave 2-3 reps in reserve." });
  }

  const { s1w: _s1w, s1r, s2w: _s2w, s2r: _s2r } = last;
  const s1w = _s1w ?? 0;
  const set2Incomplete = _s2r == null;
  // If set 2 was intentionally skipped/incomplete, keep the real set 1 load instead of resetting to ex.start.
  const s2w = _s2w ?? s1w;
  const s2r = _s2r ?? s1r;
  const lastStr = !set2Incomplete
    ? `${fmtWeight(s1w)}kg × ${s1r}, ${s2r}`
    : `${fmtWeight(s1w)}kg × ${s1r} (set 2 incomplete)`;
  const workingWeight = s1w;

  const lastRpeVals = [lastSession.rpe?.[lastIdx]?.s1, lastSession.rpe?.[lastIdx]?.s2].filter(v => v != null);
  const avgLastRpe = lastRpeVals.length ? lastRpeVals.reduce((a, b) => a + b, 0) / lastRpeVals.length : null;
  const readiness = calculateReadiness(todayISO());
  const profile = exerciseFatigueProfile(ex.name);
  const isIsolation = profile.pattern === "isolation" || profile.systemicFatigue <= 3;
  const poorReadiness = readiness.score != null && readiness.score <= 2.5;
  const recentSameMisses = entries.slice(-2).filter(e => {
    const st = e.set;
    return st && (st.s1r < ex.repMin || (st.s2r != null && st.s2r < ex.repMin));
  }).length;
  const shouldHoldLoad = poorReadiness || (avgLastRpe != null && avgLastRpe > (isIsolation ? 8 : 8.5));

  if (set2Incomplete) {
    return withIdentity({
      verdict: "HOLD",
      weight: workingWeight,
      reps: Math.min(ex.repMax, Math.max(ex.repMin, s1r)),
      last: lastStr,
      note: "Set 2 was incomplete or skipped. Hold the same load next time; do not reset or progress from a partial exercise.",
      wavePhase: wave.name
    });
  }

  // ── LEAD LIFT: Juggernaut TM-based weight prescription
  // PHASE 1: Lead lifts are strictly separated from accessory logic.
  // Training Max (TM) priority:
  //   1. Stored working max (set from AMRAP → 1RM → 90%) — most accurate
  //   2. Epley estimate from last session AMRAP performance
  //   3. Inferred from start weight (60% pct back-calculation)
  // Lead lifts NEVER fall through to accessory double-progression.
  if (isLead) {
    const storedTM = isActiveExerciseSwapped(day, exIdx) ? null : getWorkingMax(day, exIdx);
    // Priority 2: Derive TM from last session AMRAP (s2 = final/AMRAP set)
    const amrapW = s2w || s1w;
    const amrapR = Math.max(s1r, s2r);
    const estimatedOneRm = amrapW && amrapR ? estimateOneRm(amrapW, amrapR) : null;
    const derivedTM = estimatedOneRm ? roundToIncrement(estimatedOneRm * 0.90, ex) : null;
    // Priority 3: Infer from start weight so JTM reps are always correct
    const startWeight = defaultStartWeightForExercise(ex);
    const inferredTM = startWeight ? roundToIncrement(startWeight / 0.60, ex) : null;
    const TM = storedTM || derivedTM || inferredTM || workingWeight;
    return withIdentity(leadTmPrescription(ex, wave, TM, lastStr));
    // Note: execution never reaches accessory logic below for lead lifts.
  }

  // ── ACCESSORY LIFTS: performance-based double progression (no TM system)
  // PHASE 3: Extra-set RPE affects confidence; isolations use rep-first logic;
  // load increases require BOTH sets at top of range.

  // ── DELOAD WEEK
  if (wave.name === "DELOAD") {
    const deloadW = roundToIncrement(workingWeight * 0.875, ex);
    return withIdentity({
      verdict: "DELOAD_WAVE",
      weight: deloadW,
      reps: ex.repMin,
      last: lastStr,
      note: "Deload week — " + fmtWeight(deloadW) + "kg (≨87.5% of " + fmtWeight(workingWeight) + "kg). Stay RPE 5-6, feel fresh.",
      wavePhase: "DELOAD",
      confidence: 1.0,
      reasoning: ["deload week: fixed reduction"]
    });
  }

  // ── PHASE 3: Progression Confidence Score
  // Every accessory prescription now carries a confidence value (0–1) and reasoning list.
  const reasoning = [];
  let confidence = 1.0;

  // Extra-set RPE penalty (Item 1: extra-set RPE affects next-session progression)
  const lastExtraSets = (lastSession.extraSets?.[lastIdx]?.sets || [])
    .filter(function(es) { return es.done && es.rpe != null; });
  const maxExtraRpe = lastExtraSets.length ? Math.max.apply(null, lastExtraSets.map(function(es) { return es.rpe; })) : null;
  if (maxExtraRpe != null && maxExtraRpe >= 9) {
    confidence -= 0.30;
    reasoning.push("extra set reached RPE " + maxExtraRpe + " last session");
  } else if (maxExtraRpe != null && maxExtraRpe >= 8) {
    confidence -= 0.15;
    reasoning.push("extra set at RPE " + maxExtraRpe + " last session");
  }

  // Cut mode penalty
  const isCuttingNow = STATE.cut && STATE.cut.mode === "cut";
  if (isCuttingNow) { confidence -= 0.10; reasoning.push("cutting phase"); }

  // Isolation penalty (rep-first logic)
  if (isIsolation) { confidence -= 0.10; reasoning.push("isolation: rep-first progression"); }

  // Poor readiness
  if (poorReadiness) { confidence -= 0.20; reasoning.push("poor readiness today"); }

  // Only one session of data
  if (sessions.length === 1) { confidence -= 0.15; reasoning.push("only one session logged"); }

  // High RPE on main sets
  if (avgLastRpe != null && avgLastRpe >= 9) {
    confidence -= 0.25; reasoning.push("main sets avg RPE " + avgLastRpe.toFixed(1));
  } else if (avgLastRpe != null && avgLastRpe >= 8.5) {
    confidence -= 0.10; reasoning.push("main sets avg RPE " + avgLastRpe.toFixed(1));
  }

  confidence = Math.max(0, Math.min(1, confidence));
  const highConfidence = confidence >= 0.70;
  const lowConfidence  = confidence <  0.45;
  const holdDueToConfidence = lowConfidence;
  const effectiveHold  = shouldHoldLoad || holdDueToConfidence;

  // Helper: attach confidence and reasoning to every result
  function accessoryResult(verdict, weight, reps, note) {
    if (reasoning.length === 0) reasoning.push("normal progression");
    return withIdentity({
      verdict: verdict,
      weight: weight,
      reps: reps,
      last: lastStr,
      note: note,
      wavePhase: wave.name,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: reasoning.slice()
    });
  }

  // ── Below rep range
  if (s1r < ex.repMin || s2r < ex.repMin) {
    if (recentSameMisses < 2 && (avgLastRpe == null || avgLastRpe <= 8.5)) {
      return accessoryResult("HOLD", workingWeight, ex.repMin,
        "Below rep range — hold weight and rebuild reps. Reduce only after two consecutive misses.");
    }
    const newW = roundToIncrement(workingWeight * (STATE.profile.deloadFactor || 0.90), ex);
    return accessoryResult("DELOAD", newW, ex.repMin,
      "Missed rep range twice — drop to " + fmtWeight(newW) + "kg and rebuild from " + ex.repMin + " reps.");
  }

  // ── Both sets at top of range = candidate for load increase
  // PHASE 3: BOTH sets must reach repMax (double progression) — not just one set.
  if (s1r >= ex.repMax && s2r >= ex.repMax) {
    if (isIsolation) {
      // Isolation: rep-first — require high confidence before adding load
      if (highConfidence && !isCuttingNow && !effectiveHold) {
        return accessoryResult("PROGRESS", workingWeight + inc, ex.repMin,
          "Both sets hit " + ex.repMax + " reps with good form — add " + inc + "kg. Reps will drop back to " + ex.repMin + ".");
      }
      const holdMsg = holdDueToConfidence
        ? "Confidence " + Math.round(confidence * 100) + "% — " +
          reasoning.filter(function(r) { return r !== "isolation: rep-first progression"; }).join(", ") +
          ". Hold one more session before adding load."
        : isCuttingNow ? "Both sets at " + ex.repMax + " reps — cutting phase, own the reps before adding load."
        : "Both sets at " + ex.repMax + " reps — ensure technique is clean before progressing.";
      return accessoryResult("HOLD", workingWeight, ex.repMax, holdMsg);
    }
    // Secondary compound: progress if high confidence, otherwise hold
    if (highConfidence && !effectiveHold) {
      return accessoryResult("PROGRESS", workingWeight + inc, ex.repMin,
        "Both sets hit " + ex.repMax + " reps (RPE " + (avgLastRpe != null ? avgLastRpe.toFixed(1) : "—") + ") — add " + inc + "kg.");
    }
    const holdMsg2 = holdDueToConfidence
      ? "Confidence " + Math.round(confidence * 100) + "% — " +
        reasoning.filter(function(r) { return r !== "normal progression"; }).join(", ") +
        ". Hold one more session."
      : "Top reps hit but " + (poorReadiness ? "poor readiness" : "high RPE") + " — hold load.";
    return accessoryResult("HOLD", workingWeight, ex.repMax, holdMsg2);
  }

  // ── Within range: push one more rep (double progression first step)
  const nextReps = Math.min(ex.repMax, Math.min(s1r, s2r) + 1);
  const waveNote = wave.name === "ACCUMULATION"    ? "Leave 3+ reps in tank." :
                   wave.name === "INTENSIFICATION" ? "Target RPE 7-8." :
                   wave.name === "REALIZATION"     ? "Push close to your limit." : "";
  return accessoryResult("BEAT", workingWeight, nextReps,
    "Same weight — push one more rep. " + waveNote);
}
