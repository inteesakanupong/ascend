// Volume calculations: session, weekly, muscle-specific

function exerciseWeightedMuscles(exOrName) {
  const name = typeof exOrName === "string" ? exOrName : exOrName?.name;
  const n = normalizeExerciseName(name);
  const db = typeof findDbMatch === "function" ? findDbMatch(name) : null;
  const primary = db?.muscle || muscleGroupForExercise(name);
  if (!primary) return {};

  const has = (re) => re.test(n);

  if (has(/\b(fly|pec deck)\b/)) return { chest: 1 };
  if (has(/\b(lateral raise|front raise)\b/)) return { shoulders: 1 };
  if (has(/\b(rear delt|face pull)\b/)) return { shoulders: 0.8, back: 0.3 };
  if (has(/\b(wrist|forearm|grip|plate pinch|farmer)\b/)) return { forearms: 1 };
  if (has(/\b(curl|bicep|bayesian|preacher)\b/) && !has(/\bleg curl\b|ham curl/)) {
    if (has(/\bhammer|reverse curl\b/)) return { biceps: 0.7, forearms: 0.6 };
    return { biceps: 1 };
  }
  if (has(/\b(pushdown|skull|tricep|triceps|jm press|kickback)\b/)) return { triceps: 1 };
  if (has(/\b(calves|calf)\b/)) return { calves: 1 };
  if (has(/\b(crunch|sit up|plank|ab |rollout|leg raise|pallof)\b/)) return { abs: 1 };
  if (has(/\b(leg curl|ham curl|nordic)\b/)) return { hamstrings: 1 };
  if (has(/\b(leg extension|sissy)\b/)) return { quads: 1 };
  if (has(/\b(romanian|rdl|stiff leg|good morning|pull through)\b/)) return { hamstrings: 1, glutes: 0.7, back: 0.25 };
  if (has(/\b(deadlift|sumo deadlift)\b/)) return { back: 0.8, hamstrings: 0.8, glutes: 0.7 };
  if (has(/\b(hip thrust|glute bridge|kickback|reverse hyper)\b/)) return { glutes: 1, hamstrings: 0.25 };
  if (has(/\b(squat|leg press|hack|lunge|split squat|step up|goblet)\b/)) return { quads: 1, glutes: 0.6, hamstrings: 0.25 };
  if (has(/\b(overhead press|ohp|shoulder press|arnold press)\b/)) return { shoulders: 1, triceps: 0.55, chest: 0.2 };
  if (has(/\b(close grip bench|dip)\b/)) return { triceps: 0.8, chest: 0.55, shoulders: 0.35 };
  if (has(/\b(bench|chest press|incline press|decline press|push up|pushup)\b/)) return { chest: 1, triceps: 0.55, shoulders: 0.45 };
  if (has(/\b(straight arm pulldown)\b/)) return { back: 1 };
  if (has(/\b(row|pulldown|pull up|pullup|chin up|chinup)\b/)) return { back: 1, biceps: 0.55, shoulders: 0.25, forearms: 0.2 };

  return { [primary]: 1 };
}

function exerciseFatigueProfile(exOrName) {
  const name = typeof exOrName === "string" ? exOrName : exOrName?.name;
  const db = typeof findDbMatch === "function" ? findDbMatch(name) : null;
  const n = normalizeExerciseName(name);
  const pattern = movementPatternForExercise(name);
  const isCompound = db?.type === "compound" || /squat|deadlift|bench|press|row|pull up|pulldown|leg press|lunge|hip thrust/.test(n);
  const isSpinal = /deadlift|romanian|rdl|good morning|barbell row|pendlay|squat/.test(n) && !/chest supported|machine|cable/.test(n);
  const isSmithMachine = /smith|machine|chest supported|cable|leg press|hack/.test(n);
  const isBodyweight = /pull up|push up|dip|plank|leg raise|rollout/.test(n) || db?.equipment === "bodyweight";
  const elbowStress = /curl|skull|jm press|pushdown|tricep|triceps|chin/.test(n);
  const shoulderStress = /bench|overhead|ohp|dip|upright|fly/.test(n);
  const kneeStress = /squat|leg press|hack|lunge|split squat|leg extension/.test(n);

  let stimulus = isCompound ? 8 : 6;
  let localFatigue = isCompound ? 7 : 4;
  let systemicFatigue = isCompound ? 6 : 2;
  let jointStress = isCompound ? 5 : 3;
  let stabilityDemand = isCompound ? 5 : 2;

  if (isSpinal) { systemicFatigue += 2; stabilityDemand += 2; jointStress += 1; }
  if (isSmithMachine) { systemicFatigue -= 1; stabilityDemand -= 1; }
  if (isBodyweight) { stabilityDemand += 1; }
  if (elbowStress) jointStress += 1.5;
  if (shoulderStress) jointStress += 1;
  if (kneeStress) jointStress += 1;
  if (/fly|lateral raise|rear delt|wrist|calf|crunch|plank/.test(n)) {
    systemicFatigue -= 1;
    stabilityDemand -= 1;
  }

  const clamp = (v) => Math.max(1, Math.min(10, Math.round(v * 10) / 10));
  localFatigue = clamp(localFatigue);
  systemicFatigue = clamp(systemicFatigue);
  jointStress = clamp(jointStress);
  stabilityDemand = clamp(stabilityDemand);

  return {
    stimulus: clamp(stimulus),
    localFatigue,
    systemicFatigue,
    jointStress,
    stabilityDemand,
    recoveryCost: clamp((localFatigue * 0.35) + (systemicFatigue * 0.35) + (jointStress * 0.2) + (stabilityDemand * 0.1)),
    pattern,
    primaryMuscle: exercisePrimaryMuscleFromWeights(name),
    muscles: exerciseWeightedMuscles(name),
  };
}

function sessionExerciseName(session, idx) {
  const base = STATE.exercises[session.day]?.[idx];
  const swap = session.swappedExercises?.[idx];
  return swap?.name || base?.name || "";
}

function sessionSetCount(session, idx) {
  const set = session.sets?.[idx] || {};
  let sets = 0;
  if (set.s1r != null && set.s1r > 0) sets++;
  if (set.s2r != null && set.s2r > 0) sets++;
  for (const extra of (session.extraSets?.[idx]?.sets || [])) {
    if (extra.done && extra.reps != null && extra.reps > 0) sets++;
  }
  return sets;
}

function exerciseFor(session, idx) {
  if (session.swappedExercises && session.swappedExercises[idx]) {
    return { ...STATE.exercises[session.day][idx], ...session.swappedExercises[idx] };
  }
  return STATE.exercises[session.day][idx];
}

function prsInSession(session) {
  let count = 0;
  for (let i = 0; i < session.sets.length; i++) {
    const set = session.sets[i];
    if (isPRSet(session.day, i, set.s1w, set.s1r, session.id)) count++;
    // Don't double-count if both sets PR'd; treat the session as one PR per ex
    else if (isPRSet(session.day, i, set.s2w, set.s2r, session.id)) count++;
  }
  return count;
}

function sessionVolume(session) {
  let v = 0;
  const bw = latestWeighIn()?.weight || STATE.profile.bodyweight || 87.5;
  for (let i = 0; i < session.sets.length; i++) {
    const ex = exerciseFor(session, i);
    const set = session.sets[i];
    const isBW = isBodyweightExercise(ex);
    const add = (w, r) => {
      if (w == null || r == null) return;
      v += (isBW ? bw + (w || 0) : w) * r;
    };
    add(set.s1w, set.s1r);
    add(set.s2w, set.s2r);
  }
  return v;
}

function weeklyVolume(weeks = 6) {
  const today = new Date();
  const out = { PUSH: [], PULL: [], ARMS: [], LEGS: [] };
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(today); end.setDate(end.getDate() - w * 7);
    const start = new Date(end); start.setDate(end.getDate() - 6);
    const startIso = start.toISOString().slice(0, 10);
    const endIso   = end.toISOString().slice(0, 10);
    for (const day of DAY_ORDER) {
      const sessions = STATE.sessions.filter(s =>
        s.day === day && s.date >= startIso && s.date <= endIso
      );
      const total = sessions.reduce((sum, s) => sum + sessionVolume(s), 0);
      out[day].push(Math.round(total));
    }
  }
  return out;
}

function computeFatigueSummary(days = 7) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
  const summary = {
    local: {},
    patterns: {},
    systemic: 0,
    spinal: 0,
    elbowStress: 0,
    shoulderStress: 0,
    kneeStress: 0,
    recoveryCost: 0,
  };
  for (const s of STATE.sessions.filter(sess => sess.date >= cutoff)) {
    (s.sets || []).forEach((_, idx) => {
      const sets = sessionSetCount(s, idx);
      if (!sets) return;
      const name = sessionExerciseName(s, idx);
      const profile = exerciseFatigueProfile(name);
      const rpes = [s.rpe?.[idx]?.s1, s.rpe?.[idx]?.s2].filter(v => v != null);
      const avgRpe = rpes.length ? rpes.reduce((a,b) => a + b, 0) / rpes.length : 7;
      const effort = Math.max(0.75, Math.min(1.35, avgRpe / 8));
      const setFactor = sets * effort;

      summary.systemic += profile.systemicFatigue * setFactor;
      summary.recoveryCost += profile.recoveryCost * setFactor;
      summary.patterns[profile.pattern] = (summary.patterns[profile.pattern] || 0) + setFactor;
      if (/deadlift|romanian|rdl|good morning|barbell row|pendlay|squat/.test(normalizeExerciseName(name))) summary.spinal += setFactor;
      if (/curl|skull|jm press|pushdown|tricep|triceps|chin/.test(normalizeExerciseName(name))) summary.elbowStress += setFactor;
      if (/bench|overhead|ohp|dip|upright|fly/.test(normalizeExerciseName(name))) summary.shoulderStress += setFactor;
      if (/squat|leg press|hack|lunge|split squat|leg extension/.test(normalizeExerciseName(name))) summary.kneeStress += setFactor;

      for (const [muscle, weight] of Object.entries(profile.muscles)) {
        summary.local[muscle] = (summary.local[muscle] || 0) + (profile.localFatigue * setFactor * weight);
      }
    });
  }
  summary.systemic = roundVolume(summary.systemic);
  summary.spinal = roundVolume(summary.spinal);
  summary.elbowStress = roundVolume(summary.elbowStress);
  summary.shoulderStress = roundVolume(summary.shoulderStress);
  summary.kneeStress = roundVolume(summary.kneeStress);
  summary.recoveryCost = roundVolume(summary.recoveryCost);
  for (const key of Object.keys(summary.local)) summary.local[key] = roundVolume(summary.local[key]);
  for (const key of Object.keys(summary.patterns)) summary.patterns[key] = roundVolume(summary.patterns[key]);
  return summary;
}

function weeklyVolumeByMuscle(days = 7) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
  const recentSessions = STATE.sessions.filter(s => s.date >= cutoff);
  const volume = {};
  for (const s of recentSessions) {
    (s.sets || []).forEach((_, i) => {
      const name = sessionExerciseName(s, i);
      if (!name) return;
      const sets = sessionSetCount(s, i);
      if (!sets) return;
      const weights = exerciseWeightedMuscles(name);
      for (const [muscle, weight] of Object.entries(weights)) {
        volume[muscle] = (volume[muscle] || 0) + (sets * weight);
      }
    });
  }
  for (const muscle of Object.keys(volume)) volume[muscle] = roundVolume(volume[muscle]);
  return volume;
}
